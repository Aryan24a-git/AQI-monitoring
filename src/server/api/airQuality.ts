import { NextRequest } from 'next/server';
import { z } from 'zod';
import { fetchOpenMeteoSnapshot } from '@/server/providers/openMeteoAirQuality';
import { fetchWaqiStation } from '@/server/providers/waqiAirQuality';
import { getEnv } from '@/server/config/env';
import { findBandByPm25 } from '@/domain/bands';
import { REQUEST_ID_HEADER } from '@/server/http/requestId';
import { createRateLimiter, withRateLimit } from '@/server/http/withApiGuards';
import { boundaryError, RATE_LIMITS } from '@/server/security/limits';
import { apiErrorResponse, securityJson } from '@/server/security/response';

const limiter = createRateLimiter(RATE_LIMITS.airQualityPerMinute);
const QuerySchema = z.object({
  lat: z
    .string()
    .regex(/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/)
    .transform(Number)
    .pipe(z.number().min(-90).max(90)),
  lon: z
    .string()
    .regex(/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/)
    .transform(Number)
    .pipe(z.number().min(-180).max(180)),
});

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
      const env = getEnv();
      if (env.AQ_PROVIDER.toLowerCase() === 'waqi' && env.WAQI_API_TOKEN) {
        const station = await fetchWaqiStation(
          parsed.data.lat,
          parsed.data.lon,
          env.WAQI_API_TOKEN
        );
        return securityJson(
          {
            aqi: station.aqi,
            pm25: station.pm25,
            timestamp: station.timeIso ?? new Date().toISOString(),
            source: 'WAQI Station (aqicn.org)',
            isFallback: false,
            isStale: false,
            band: findBandByPm25(station.pm25).key,
          },
          200,
          { [REQUEST_ID_HEADER]: requestId }
        );
      }
      const snapshot = await fetchOpenMeteoSnapshot(parsed.data.lat, parsed.data.lon);
      return securityJson(
        {
          aqi: snapshot.aqi,
          pm25: snapshot.pm25,
          timestamp: snapshot.timestamp,
          source: snapshot.provider,
          isFallback: snapshot.isFallback,
          isStale: snapshot.isStale,
          band: snapshot.band,
        },
        200,
        { [REQUEST_ID_HEADER]: requestId }
      );
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
