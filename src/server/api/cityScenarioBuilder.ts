import type { LocationScenario } from '@/domain/scenarios';
import { validateWaqiReading, type WaqiStationReading } from '@/server/providers/waqiAirQuality';

export interface MeteoPayload {
  aq: {
    timezone_abbreviation?: string;
    current: {
      time?: string;
      pm10: number;
      pm2_5: number;
      nitrogen_dioxide?: number;
      us_aqi?: number;
    };
    hourly?: { pm2_5?: (number | null)[] };
  };
  wx: {
    current: { time?: string; wind_speed_10m: number; temperature_2m?: number };
    hourly?: { wind_speed_10m?: (number | null)[] };
  };
}

export type HourlySeriesResult =
  { ok: true; series: number[] } | { ok: false; error: 'HOURLY_DATA_UNAVAILABLE'; message: string };

/** @testonly */
export function extractHourlySeries(
  raw: readonly (number | null | undefined)[] | undefined
): HourlySeriesResult {
  if (!raw || raw.length < 24) {
    return { ok: false, error: 'HOURLY_DATA_UNAVAILABLE', message: 'Hourly forecast unavailable' };
  }
  const first24 = raw.slice(0, 24);
  if (first24.some((v) => typeof v !== 'number' || !Number.isFinite(v))) {
    return { ok: false, error: 'HOURLY_DATA_UNAVAILABLE', message: 'Hourly forecast unavailable' };
  }
  return { ok: true, series: first24.map((v) => Math.max(1, Math.round(v as number))) };
}

export function formatObservationTime(localIsoTime: string | undefined, tzAbbr?: string): string {
  const match = localIsoTime?.match(/[T ](\d{2}):(\d{2})/);
  if (!match) return 'latest reading';
  const hour24 = Number(match[1]);
  const minute = match[2];
  const period = hour24 >= 12 ? 'pm' : 'am';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const tz = tzAbbr && /^[A-Z]{2,5}$/.test(tzAbbr) ? ` ${tzAbbr}` : '';
  return `${hour12}:${minute} ${period}${tz}`;
}

export function formatAgeLabel(ageHours: number | undefined): string {
  if (ageHours == null || !Number.isFinite(ageHours)) return 'latest';
  if (ageHours < 1) return `${Math.max(1, Math.round(ageHours * 60))}m ago`;
  return `${Math.round(ageHours * 10) / 10}h ago`;
}

export function checkAqiMismatch(
  stationAqi: number,
  modelUsAqi: number | undefined
): string | undefined {
  if (modelUsAqi == null || !Number.isFinite(modelUsAqi) || modelUsAqi <= 0) return undefined;
  const ratio = Math.max(stationAqi, modelUsAqi) / Math.max(1, Math.min(stationAqi, modelUsAqi));
  if (ratio > 2) {
    return `Station AQI (${stationAqi}) and model AQI (${Math.round(modelUsAqi)}) differ by >2x — local hotspot or sensor lag possible.`;
  }
  return undefined;
}

export function buildScenarioFromData(
  city: string,
  admin1: string | undefined,
  data: MeteoPayload
): LocationScenario {
  const pm25 = Math.round(data.aq.current.pm2_5);
  const pm10 = Math.round(data.aq.current.pm10);
  const no2 = Math.round(data.aq.current.nitrogen_dioxide ?? 0);
  const wind = Math.max(1, Math.round(data.wx.current.wind_speed_10m));
  const pmResult = extractHourlySeries(data.aq.hourly?.pm2_5);
  const windResult = extractHourlySeries(data.wx.hourly?.wind_speed_10m);
  const hasHourly = pmResult.ok && windResult.ok;
  const obsTime = formatObservationTime(
    data.aq.current.time ?? data.wx.current.time,
    data.aq.timezone_abbreviation
  );

  return {
    id: `live-${city.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    city: `${city}, ${admin1 || 'India'}`,
    shortCity: city,
    subtitle: `Model estimate (Open-Meteo) · ${obsTime}`,
    sourceLabel: 'Model-derived NAQI equivalent (Open-Meteo)',
    pm25,
    pm10,
    no2,
    wind,
    hourlyPM25: hasHourly ? pmResult.series : [],
    hourlyWind: hasHourly ? windResult.series : [],
    ...(hasHourly ? {} : { hourlyError: 'Hourly forecast unavailable' }),
    isSynthetic: false,
  };
}

function pickOptionalNum(
  primary: number | undefined,
  fallback: number | undefined
): number | undefined {
  return primary !== undefined ? primary : fallback;
}

function resolveOptionalMeasurements(waqi: WaqiStationReading, meteo: MeteoPayload | null) {
  const pm10 = pickOptionalNum(waqi.pm10, meteo ? Math.round(meteo.aq.current.pm10) : undefined);
  const meteoNo2 = meteo?.aq.current.nitrogen_dioxide;
  const no2 = pickOptionalNum(waqi.no2, meteoNo2 != null ? Math.round(meteoNo2) : undefined);
  const wind = pickOptionalNum(
    waqi.windKmh,
    meteo ? Math.max(1, Math.round(meteo.wx.current.wind_speed_10m)) : undefined
  );
  return {
    ...(pm10 !== undefined ? { pm10 } : {}),
    ...(no2 !== undefined ? { no2 } : {}),
    ...(wind !== undefined ? { wind } : {}),
  };
}

function resolveMeteoHourly(meteo: MeteoPayload | null) {
  const pmResult = meteo ? extractHourlySeries(meteo.aq.hourly?.pm2_5) : null;
  const windResult = meteo ? extractHourlySeries(meteo.wx.hourly?.wind_speed_10m) : null;
  if (pmResult?.ok && windResult?.ok) {
    return { hourlyPM25: pmResult.series, hourlyWind: windResult.series };
  }
  return { hourlyPM25: [], hourlyWind: [], hourlyError: 'Hourly forecast unavailable' };
}

/** Builds a LocationScenario anchored to a validated WAQI station observation. */
export function buildWaqiScenario(
  city: string,
  admin1: string | undefined,
  waqi: WaqiStationReading,
  meteo: MeteoPayload | null
): LocationScenario {
  const obsTime = formatObservationTime(waqi.timeIso);
  return {
    id: `live-${city.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    city: waqi.stationName || `${city}, ${admin1 || 'India'}`,
    shortCity: city,
    subtitle: `Station reading (WAQI) · ${obsTime}`,
    sourceLabel: 'Station observation (WAQI / Air Quality Open Data)',
    pm25: waqi.pm25,
    ...resolveOptionalMeasurements(waqi, meteo),
    ...resolveMeteoHourly(meteo),
    isSynthetic: false,
  };
}

/** Combines Open-Meteo model data with an optional validated WAQI station observation. */
export function buildCombinedScenario(
  target: { city: string; admin1?: string },
  meteo: MeteoPayload,
  waqi: WaqiStationReading | null,
  nowMs = Date.now()
): LocationScenario {
  const { city, admin1 } = target;
  const base = buildScenarioFromData(city, admin1, meteo);
  if (!waqi) return base;

  const check = validateWaqiReading(waqi, nowMs);
  if (!check.valid) {
    const reasonLabel =
      check.reason === 'stale'
        ? 'Nearest WAQI station reading is >3h old — showing model only'
        : check.reason === 'far'
          ? 'Nearest WAQI station is >25km away — showing model only'
          : 'Nearest WAQI station lacked PM2.5 — showing model only';
    return { ...base, stationFallbackNote: reasonLabel };
  }

  const mismatchWarning = checkAqiMismatch(waqi.aqi, meteo.aq.current.us_aqi);
  return {
    ...base,
    stationAqi: {
      usAqi: waqi.aqi,
      stationName: waqi.stationName || city,
      distanceKm: waqi.distanceKm,
      ageLabel: formatAgeLabel(check.ageHours),
      obsTime: formatObservationTime(waqi.timeIso, meteo.aq.timezone_abbreviation),
      ...(mismatchWarning ? { mismatchWarning } : {}),
    },
  };
}
