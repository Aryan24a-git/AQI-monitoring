import { NextRequest } from 'next/server';
import { z } from 'zod';
import { fetchOpenMeteoSnapshot } from '@/server/providers/openMeteoAirQuality';
import { fetchWaqiStation, validateWaqiReading } from '@/server/providers/waqiAirQuality';
import { formatAgeLabel, formatObservationTime } from '@/server/api/cityScenarioBuilder';
import { getEnv } from '@/server/config/env';
import { findBandByPm25 } from '@/domain/bands';
import { REQUEST_ID_HEADER } from '@/server/http/requestId';
import { createRateLimiter, withRateLimit } from '@/server/http/withApiGuards';
import { boundaryError, RATE_LIMITS } from '@/server/security/limits';
import { apiErrorResponse, securityJson } from '@/server/security/response';

const limiter = createRateLimiter(RATE_LIMITS.airQualityPerMinute);
const CoordSchema = z
  .string()
  .regex(/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/)
  .transform(Number);

const QuerySchema = z.object({
  lat: CoordSchema.pipe(z.number().min(-90).max(90)),
  lon: CoordSchema.pipe(z.number().min(-180).max(180)),
});

function fallbackNoteForReason(reason: 'stale' | 'far' | 'missing_pm25' | undefined): string {
  if (reason === 'stale') return 'Nearest WAQI station reading is >3h old — showing model only';
  if (reason === 'far') return 'Nearest WAQI station is >25km away — showing model only';
  return 'Nearest WAQI station lacked PM2.5 — showing model only';
}

async function fetchAirQualityPayload(lat: number, lon: number) {
  const env = getEnv();
  let stationFallbackNote: string | undefined;
  if (env.AQ_PROVIDER.toLowerCase() === 'waqi' && env.WAQI_API_TOKEN) {
    const station = await fetchWaqiStation(lat, lon, env.WAQI_API_TOKEN);
    const check = validateWaqiReading(station);
    if (check.valid) {
      return {
        aqi: station.aqi,
        pm25: station.pm25,
        timestamp: station.timeIso ?? new Date().toISOString(),
        obsTime: formatObservationTime(station.timeIso),
        ageLabel: formatAgeLabel(check.ageHours),
        stationName: station.stationName,
        distanceKm: station.distanceKm,
        source: 'WAQI Station (aqicn.org)',
        isFallback: false,
        isStale: false,
        band: findBandByPm25(station.pm25).key,
      };
    }
    stationFallbackNote = fallbackNoteForReason(check.reason);
  }
  const snapshot = await fetchOpenMeteoSnapshot(lat, lon);
  return {
    aqi: snapshot.aqi,
    pm25: snapshot.pm25,
    timestamp: snapshot.timestamp,
    obsTime: formatObservationTime(snapshot.timestamp),
    source: snapshot.provider,
    isFallback: snapshot.isFallback,
    isStale: snapshot.isStale,
    band: snapshot.band,
    ...(stationFallbackNote ? { stationFallbackNote } : {}),
  };
}

/** Handles GET /api/air-quality for coordinate-based live readings. */
export async function handleAirQuality(req: NextRequest) {
  return withRateLimit(req, limiter, async ({ requestId }) => {
    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      lat: url.searchParams.get('lat'),
      lon: url.searchParams.get('lon'),
    });
    if (!parsed.success) {
      return apiErrorResponse(
        boundaryError('VALIDATION_ERROR', 'Invalid coordinates', requestId, 400).error,
        400
      );
    }
    try {
      const payload = await fetchAirQualityPayload(parsed.data.lat, parsed.data.lon);
      return securityJson(payload, 200, { [REQUEST_ID_HEADER]: requestId });
    } catch {
      return apiErrorResponse(
        boundaryError(
          'PROVIDER_UNAVAILABLE',
          'Live air-quality data is unavailable',
          requestId,
          503
        ).error,
        503
      );
    }
  });
}
