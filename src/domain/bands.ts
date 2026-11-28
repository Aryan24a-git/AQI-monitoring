// Satisfies: REQ-003, REQ-004, D1, EC-001
// Configurable AQI band table and escalation clamping.
// Standard Citation: US EPA 40 CFR Part 58 PM2.5 National Ambient Air Quality
// Standards (NAAQS) Breakpoints (EPA-HQ-OAR-2015-0072, updated 2024).

import { CPCB_BANDS } from './naqi';

export interface AqiBandDefinition {
  readonly ordinal: number; // 0 to 5
  readonly key: string;
  readonly label: string;
  readonly aqiMin: number;
  readonly aqiMax: number;
  readonly pm25Min: number; // units: µg/m³
  readonly pm25Max: number; // units: µg/m³
}

function cpcbLabel(index: number, fallback: string): string {
  return CPCB_BANDS[index]?.label ?? fallback;
}

const FALLBACK_BAND: AqiBandDefinition = {
  ordinal: 5,
  key: 'hazardous',
  label: cpcbLabel(5, 'Severe'),
  aqiMin: 301,
  aqiMax: 999,
  pm25Min: 225.5,
  pm25Max: 1000.0,
};

/**
 * Six standard AQI bands as immutable data (not scattered conditionals).
 * Citation: US EPA Air Quality Index Breakpoints for PM2.5 (40 CFR Part 58).
 */
export const AQI_BANDS: readonly AqiBandDefinition[] = [
  {
    ordinal: 0,
    key: 'good',
    label: cpcbLabel(0, 'Good'),
    aqiMin: 0,
    aqiMax: 50,
    pm25Min: 0.0,
    pm25Max: 9.0,
  },
  {
    ordinal: 1,
    key: 'moderate',
    label: cpcbLabel(1, 'Satisfactory'),
    aqiMin: 51,
    aqiMax: 100,
    pm25Min: 9.1,
    pm25Max: 35.4,
  },
  {
    ordinal: 2,
    key: 'usg',
    label: cpcbLabel(2, 'Moderately Polluted'),
    aqiMin: 101,
    aqiMax: 150,
    pm25Min: 35.5,
    pm25Max: 55.4,
  },
  {
    ordinal: 3,
    key: 'unhealthy',
    label: cpcbLabel(3, 'Poor'),
    aqiMin: 151,
    aqiMax: 200,
    pm25Min: 55.5,
    pm25Max: 125.4,
  },
  {
    ordinal: 4,
    key: 'very_unhealthy',
    label: cpcbLabel(4, 'Very Poor'),
    aqiMin: 201,
    aqiMax: 300,
    pm25Min: 125.5,
    pm25Max: 225.4,
  },
  FALLBACK_BAND,
] as const;

/** @testonly */
export function findBandByAqi(aqi: number): AqiBandDefinition {
  const clamped = Math.max(0, aqi);
  return AQI_BANDS.find((b) => clamped >= b.aqiMin && clamped <= b.aqiMax) ?? FALLBACK_BAND;
}

export function findBandByPm25(pm25: number): AqiBandDefinition {
  const clamped = Math.max(0, pm25);
  return AQI_BANDS.find((b) => clamped >= b.pm25Min && clamped <= b.pm25Max) ?? FALLBACK_BAND;
}

/** @testonly */
export function getBandByOrdinal(ordinal: number): AqiBandDefinition {
  const clamped = Math.min(Math.max(ordinal, 0), AQI_BANDS.length - 1);
  return AQI_BANDS[clamped] ?? FALLBACK_BAND;
}

/**
 * Escalate an AQI band by a given number of steps, clamped to [0, 5].
 * Pure function with no side effects.
 */
/** @testonly */
export function escalateBand(band: AqiBandDefinition, steps: number): AqiBandDefinition {
  const newOrdinal = Math.min(Math.max(band.ordinal + steps, 0), AQI_BANDS.length - 1);
  return AQI_BANDS[newOrdinal] ?? FALLBACK_BAND;
}
