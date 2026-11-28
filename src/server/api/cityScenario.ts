import { NextRequest } from 'next/server';
import { z } from 'zod';
import type { LocationScenario } from '@/domain/scenarios';
import { CACHE_TTL_MS } from '@/domain/constants';
import { searchOpenMeteo } from '@/server/providers/geocoding';
import { REQUEST_ID_HEADER } from '@/server/http/requestId';
import { createRateLimiter, withRateLimit } from '@/server/http/withApiGuards';
import { boundaryError, MAX_QUERY_LENGTH, RATE_LIMITS } from '@/server/security/limits';
import { apiErrorResponse, securityJson } from '@/server/security/response';
import { LruCache } from '@/server/cache/lru';
import { getEnv } from '@/server/config/env';
import { fetchWaqiStation, validateWaqiReading } from '@/server/providers/waqiAirQuality';
import { buildCombinedScenario, buildWaqiScenario, type MeteoPayload } from './cityScenarioBuilder';

const limiter = createRateLimiter(RATE_LIMITS.cityScenarioPerMinute);
const scenarioCache = new LruCache<string, LocationScenario>({
  maxEntries: 100,
  ttlMs: CACHE_TTL_MS,
});
const QuerySchema = z.object({ q: z.string().trim().min(2).max(MAX_QUERY_LENGTH) });

function isValidMeteoPayload(payload: { aq: unknown; wx: unknown }): payload is MeteoPayload {
  const aqObj = payload.aq as { current?: { pm2_5?: unknown; pm10?: unknown } } | null;
  const wxObj = payload.wx as { current?: { wind_speed_10m?: unknown } } | null;
  return Boolean(
    aqObj?.current &&
    Number.isFinite(aqObj.current.pm2_5) &&
    Number.isFinite(aqObj.current.pm10) &&
    wxObj?.current &&
    Number.isFinite(wxObj.current.wind_speed_10m)
  );
}

async function fetchLiveMeteo(lat: number, lon: number): Promise<MeteoPayload | null> {
  try {
    const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,nitrogen_dioxide,us_aqi&hourly=pm10,pm2_5,nitrogen_dioxide&timezone=auto&forecast_days=2`;
    const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=wind_speed_10m,temperature_2m&hourly=wind_speed_10m&timezone=auto&forecast_days=2`;
    const [aqRes, wxRes] = await Promise.all([
      fetch(aqUrl, { signal: AbortSignal.timeout(3500) }),
      fetch(wxUrl, { signal: AbortSignal.timeout(3500) }),
    ]);
    if (!aqRes.ok || !wxRes.ok) return null;
    const [aq, wx] = await Promise.all([aqRes.json(), wxRes.json()]);
    const payload = { aq, wx };
    return isValidMeteoPayload(payload) ? payload : null;
  } catch {
    return null;
  }
}

async function resolveLiveScenario(
  name: string,
  admin1: string | undefined,
  lat: number,
  lon: number
): Promise<LocationScenario | null> {
  const env = getEnv();
  const token = env.WAQI_API_TOKEN;
  const useWaqi = Boolean(token && (env.AQ_PROVIDER.toLowerCase() === 'waqi' || !env.AQ_PROVIDER));

  const [waqi, meteo] = await Promise.all([
    useWaqi && token ? fetchWaqiStation(lat, lon, token).catch(() => null) : Promise.resolve(null),
    fetchLiveMeteo(lat, lon),
  ]);

  if (meteo) return buildCombinedScenario({ city: name, admin1 }, meteo, waqi);
  if (waqi && validateWaqiReading(waqi).valid) {
    return buildWaqiScenario(name, admin1, waqi, null);
  }
  return null;
}

async function lookupAndResolveScenario(q: string, rawQuery: string, requestId: string) {
  const geoRes = await searchOpenMeteo(q).catch(() => []);
  if (!geoRes || geoRes.length === 0) {
    return apiErrorResponse(
      {
        code: 'NOT_FOUND',
        message: `City "${rawQuery}" not found in geocoding database`,
        requestId,
        timestamp: new Date().toISOString(),
      },
      404
    );
  }
  const top = geoRes[0];
  const scenario = await resolveLiveScenario(top.name, top.admin1, top.latitude, top.longitude);
  if (!scenario) {
    return apiErrorResponse(
      {
        code: 'PROVIDER_UNAVAILABLE',
        message:
          'Live air quality provider temporarily unavailable. Please retry or enter AQI manually.',
        requestId,
        timestamp: new Date().toISOString(),
      },
      502
    );
  }
  return scenario;
}

/** Handles GET /api/city-scenario by geocoding and combining Open-Meteo + WAQI data. */
export async function handleCityScenario(req: NextRequest) {
  return withRateLimit(req, limiter, async ({ requestId }) => {
    const query = req.nextUrl.searchParams.get('q');
    const parsed = QuerySchema.safeParse({ q: query ?? '' });
    if (!parsed.success) {
      return apiErrorResponse(
        boundaryError(
          'VALIDATION_ERROR',
          'City query parameter "q" must be 2 to 100 characters',
          requestId,
          400
        ).error,
        400
      );
    }
    const q = parsed.data.q.toLowerCase().trim();
    const cacheKey = `${getEnv().AQ_PROVIDER}:${q}`;
    const cached = scenarioCache.get(cacheKey);
    if (cached) return securityJson(cached, 200, { [REQUEST_ID_HEADER]: requestId });

    const result = await lookupAndResolveScenario(q, parsed.data.q, requestId);
    if (result instanceof Response) return result;
    scenarioCache.set(cacheKey, result);
    return securityJson(result, 200, { [REQUEST_ID_HEADER]: requestId });
  });
}
