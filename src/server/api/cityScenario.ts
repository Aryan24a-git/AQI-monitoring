import { NextRequest } from 'next/server';
import { z } from 'zod';
import type { LocationScenario } from '@/domain/scenarios';
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
  ttlMs: 15 * 60 * 1000,
});
const QuerySchema = z.object({ q: z.string().trim().min(2).max(MAX_QUERY_LENGTH) });

async function fetchLiveMeteo(lat: number, lon: number): Promise<MeteoPayload | null> {
  try {
    const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,nitrogen_dioxide,us_aqi&hourly=pm10,pm2_5,nitrogen_dioxide&timezone=auto&forecast_days=2`;
    const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=wind_speed_10m,temperature_2m&hourly=wind_speed_10m&timezone=auto&forecast_days=2`;
    const [aqRes, wxRes] = await Promise.all([
      fetch(aqUrl, { signal: AbortSignal.timeout(3500) }),
      fetch(wxUrl, { signal: AbortSignal.timeout(3500) }),
    ]);
    if (!aqRes.ok || !wxRes.ok) return null;
    const aq = await aqRes.json();
    const wx = await wxRes.json();
    if (
      !aq?.current ||
      !Number.isFinite(aq.current.pm2_5) ||
      !Number.isFinite(aq.current.pm10) ||
      !wx?.current ||
      !Number.isFinite(wx.current.wind_speed_10m)
    ) {
      return null;
    }
    return { aq, wx };
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

  if (meteo) return buildCombinedScenario(name, admin1, meteo, waqi);
  if (waqi && validateWaqiReading(waqi).valid) {
    return buildWaqiScenario(name, admin1, waqi, null);
  }
  return null;
}

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

    const geoRes = await searchOpenMeteo(q).catch(() => []);
    if (!geoRes || geoRes.length === 0) {
      return apiErrorResponse(
        {
          code: 'NOT_FOUND',
          message: `City "${parsed.data.q}" not found in geocoding database`,
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

    scenarioCache.set(cacheKey, scenario);
    return securityJson(scenario, 200, { [REQUEST_ID_HEADER]: requestId });
  });
}
