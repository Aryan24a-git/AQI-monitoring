import { z } from 'zod';
import { LruCache } from '../cache/lru';
import { ProviderError, fetchWithTimeout, retryWithBackoff } from '../http/resilience';

const WaqiResponseSchema = z.object({
  status: z.string(),
  data: z.unknown(),
});

const WaqiDataSchema = z.object({
  aqi: z.union([z.number(), z.string()]),
  city: z
    .object({
      name: z.string(),
      geo: z.tuple([z.number(), z.number()]).optional(),
    })
    .optional(),
  time: z
    .object({
      iso: z.string().optional(),
      s: z.string().optional(),
    })
    .optional(),
  iaqi: z
    .object({
      pm25: z.object({ v: z.number() }).optional(),
      pm10: z.object({ v: z.number() }).optional(),
      no2: z.object({ v: z.number() }).optional(),
      w: z.object({ v: z.number() }).optional(),
    })
    .optional(),
});

export interface WaqiStationReading {
  aqi: number;
  pm25: number;
  pm10?: number;
  hasPm25: boolean;
  no2?: number;
  windKmh?: number;
  stationName?: string;
  timeIso?: string;
  distanceKm?: number;
}

export interface WaqiValidationResult {
  valid: boolean;
  reason?: 'stale' | 'far' | 'missing_pm25';
  ageHours?: number;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

export function validateWaqiReading(
  reading: WaqiStationReading,
  nowMs = Date.now()
): WaqiValidationResult {
  if (!reading.hasPm25) {
    return { valid: false, reason: 'missing_pm25' };
  }
  if (reading.distanceKm != null && reading.distanceKm > 25) {
    return { valid: false, reason: 'far' };
  }
  let ageHours: number | undefined;
  if (reading.timeIso) {
    const parsedMs = Date.parse(reading.timeIso);
    if (Number.isFinite(parsedMs)) {
      ageHours = (nowMs - parsedMs) / 3_600_000;
      if (ageHours > 3) {
        return { valid: false, reason: 'stale', ageHours };
      }
    }
  }
  return { valid: true, ageHours };
}

const STATION_CACHE = new LruCache<string, WaqiStationReading>({
  maxEntries: 200,
  ttlMs: 15 * 60 * 1000,
});

export function clearWaqiCache(): void {
  STATION_CACHE.clear();
}

function invertBreakpoints(
  aqi: number,
  table: readonly (readonly [number, number, number, number])[]
): number {
  const clamped = Math.max(0, Math.min(500, aqi));
  for (const [iLo, iHi, cLo, cHi] of table) {
    if (clamped <= iHi) {
      return Math.round(((clamped - iLo) / Math.max(1, iHi - iLo)) * (cHi - cLo) + cLo);
    }
  }
  return Math.round(clamped);
}

export function usAqiToPm25(aqi: number): number {
  return Math.max(
    1,
    invertBreakpoints(aqi, [
      [0, 50, 0, 12],
      [51, 100, 12.1, 35.4],
      [101, 150, 35.5, 55.4],
      [151, 200, 55.5, 150.4],
      [201, 300, 150.5, 250.4],
      [301, 500, 250.5, 500.4],
    ])
  );
}

export function usAqiToPm10(aqi: number): number {
  return Math.max(
    1,
    invertBreakpoints(aqi, [
      [0, 50, 0, 54],
      [51, 100, 55, 154],
      [101, 150, 155, 254],
      [151, 200, 255, 354],
      [201, 300, 355, 424],
      [301, 500, 425, 604],
    ])
  );
}

export async function fetchWaqiStation(
  lat: number,
  lon: number,
  token: string,
  fetchImpl: typeof fetch = fetch
): Promise<WaqiStationReading> {
  const rLat = Math.round(lat * 100) / 100;
  const rLon = Math.round(lon * 100) / 100;
  const key = `${rLat}:${rLon}`;
  const cached = STATION_CACHE.get(key);
  if (cached) return cached;

  const url = new URL(`https://api.waqi.info/feed/geo:${rLat};${rLon}/`);
  url.searchParams.set('token', token);
  const res = await retryWithBackoff(() => fetchWithTimeout(url, 4_000, fetchImpl), {
    timeoutMs: 4_000,
    maxRetries: 1,
  });
  if (!res.ok) throw new ProviderError('HTTP_ERROR', `WAQI HTTP ${res.status}`);

  const envParsed = WaqiResponseSchema.safeParse(await res.json());
  if (!envParsed.success || envParsed.data.status !== 'ok') {
    throw new ProviderError('HTTP_ERROR', 'WAQI station returned non-ok status');
  }
  const dParsed = WaqiDataSchema.safeParse(envParsed.data.data);
  if (!dParsed.success) throw new ProviderError('SCHEMA_ERROR', 'WAQI data schema mismatch');

  const d = dParsed.data;
  const rawAqi = Number(d.aqi);
  const hasPm25 = d.iaqi?.pm25?.v != null && Number.isFinite(d.iaqi.pm25.v);
  const pm25Sub = d.iaqi?.pm25?.v ?? (Number.isFinite(rawAqi) ? rawAqi : NaN);
  if (!Number.isFinite(pm25Sub)) {
    throw new ProviderError('SCHEMA_ERROR', 'WAQI station lacked PM2.5 or AQI reading');
  }

  const pm25 = usAqiToPm25(pm25Sub);
  const pm10 = d.iaqi?.pm10?.v != null ? usAqiToPm10(d.iaqi.pm10.v) : undefined;
  const distanceKm = d.city?.geo ? haversineKm(lat, lon, d.city.geo[0], d.city.geo[1]) : undefined;
  const reading: WaqiStationReading = {
    aqi: Number.isFinite(rawAqi) ? Math.round(rawAqi) : Math.round(pm25Sub),
    pm25,
    pm10,
    hasPm25,
    no2: d.iaqi?.no2?.v != null ? Math.round(d.iaqi.no2.v) : undefined,
    windKmh: d.iaqi?.w?.v != null ? Math.max(1, Math.round(d.iaqi.w.v * 3.6)) : undefined,
    stationName: d.city?.name,
    timeIso: d.time?.iso ?? d.time?.s,
    distanceKm,
  };
  STATION_CACHE.set(key, reading);
  return reading;
}
