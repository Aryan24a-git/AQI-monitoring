// Satisfies: REQ-003, REQ-004, REQ-008, D1
// AQI band classification and escalation logic — pure functions, no I/O

import type { Profile } from './profile';
import { hasEarlyEscalationVulnerability, countVulnerabilityFlags } from './profile';
import { CPCB_BANDS } from './naqi';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AqiBandId =
  'good' | 'moderate' | 'usg' | 'unhealthy' | 'very_unhealthy' | 'hazardous' | 'severe';

export interface AqiBand {
  id: AqiBandId;
  label: string;
  aqiMin: number;
  aqiMax: number;
  pm25Min: number;
  pm25Max: number;
  escalationLevel: number;
  colorToken: string;
  icon: string;
  ariaLabel: string;
}

interface AqiReading {
  aqi: number;
  pm25: number;
  timestamp: string;
  source: string;
  isFallback: boolean;
  isStale?: boolean;
  band?: string;
}

function cpcbLabel(index: number, fallback: string): string {
  return CPCB_BANDS[index]?.label ?? fallback;
}

function getFallbackAqiBand(): AqiBand {
  return (
    AQI_BANDS[AQI_BANDS.length - 1] ?? {
      id: 'severe',
      label: 'Severe (Winter Smog)',
      aqiMin: 501,
      aqiMax: Infinity,
      pm25Min: 500.1,
      pm25Max: Infinity,
      escalationLevel: 6,
      colorToken: 'aqi-severe',
      icon: '🚨',
      ariaLabel: 'Severe winter smog air quality',
    }
  );
}

// ─── AQI Band Table ───────────────────────────────────────────────────────────

export const AQI_BANDS: readonly AqiBand[] = [
  {
    id: 'good',
    label: cpcbLabel(0, 'Good'),
    aqiMin: 0,
    aqiMax: 50,
    pm25Min: 0,
    pm25Max: 12.0,
    escalationLevel: 0,
    colorToken: 'aqi-good',
    icon: '✓',
    ariaLabel: `${cpcbLabel(0, 'Good')} air quality`,
  },
  {
    id: 'moderate',
    label: cpcbLabel(1, 'Satisfactory'),
    aqiMin: 51,
    aqiMax: 100,
    pm25Min: 12.1,
    pm25Max: 35.4,
    escalationLevel: 1,
    colorToken: 'aqi-moderate',
    icon: '!',
    ariaLabel: `${cpcbLabel(1, 'Satisfactory')} air quality`,
  },
  {
    id: 'usg',
    label: cpcbLabel(2, 'Moderately Polluted'),
    aqiMin: 101,
    aqiMax: 150,
    pm25Min: 35.5,
    pm25Max: 55.4,
    escalationLevel: 2,
    colorToken: 'aqi-usg',
    icon: '⚠',
    ariaLabel: `${cpcbLabel(2, 'Moderately Polluted')} air quality`,
  },
  {
    id: 'unhealthy',
    label: cpcbLabel(3, 'Poor'),
    aqiMin: 151,
    aqiMax: 200,
    pm25Min: 55.5,
    pm25Max: 150.4,
    escalationLevel: 3,
    colorToken: 'aqi-unhealthy',
    icon: '⚠⚠',
    ariaLabel: `${cpcbLabel(3, 'Poor')} air quality`,
  },
  {
    id: 'very_unhealthy',
    label: cpcbLabel(4, 'Very Poor'),
    aqiMin: 201,
    aqiMax: 300,
    pm25Min: 150.5,
    pm25Max: 250.4,
    escalationLevel: 4,
    colorToken: 'aqi-very-unhealthy',
    icon: '✕',
    ariaLabel: `${cpcbLabel(4, 'Very Poor')} air quality`,
  },
  {
    id: 'hazardous',
    label: cpcbLabel(5, 'Severe'),
    aqiMin: 301,
    aqiMax: 500,
    pm25Min: 250.5,
    pm25Max: 500.0,
    escalationLevel: 5,
    colorToken: 'aqi-hazardous',
    icon: '✕✕',
    ariaLabel: `${cpcbLabel(5, 'Severe')} air quality`,
  },
  {
    id: 'severe',
    label: `${cpcbLabel(5, 'Severe')} (Winter Smog)`,
    aqiMin: 501,
    aqiMax: Infinity,
    pm25Min: 500.1,
    pm25Max: Infinity,
    escalationLevel: 6,
    colorToken: 'aqi-severe',
    icon: '🚨',
    ariaLabel: `${cpcbLabel(5, 'Severe')} winter smog air quality`,
  },
] as const;

// ─── Pure Functions ───────────────────────────────────────────────────────────

/** Classify an AQI value into the corresponding band */
export function classifyAqi(aqi: number): AqiBand {
  const band = AQI_BANDS.find((b) => aqi >= b.aqiMin && aqi <= b.aqiMax);
  return band ?? getFallbackAqiBand();
}

/** Classify using PM2.5 µg/m³ when AQI is unavailable */
/** @testonly */
export function classifyPm25(pm25: number): AqiBand {
  const band = AQI_BANDS.find((b) => pm25 >= b.pm25Min && pm25 <= b.pm25Max);
  return band ?? getFallbackAqiBand();
}

/**
 * Compute effective escalation level for a profile + AQI reading.
 * Vulnerable households get escalation applied earlier (D1).
 */
/** @testonly */
export function computeEffectiveEscalationLevel(baseBand: AqiBand, profile: Profile): number {
  if (!hasEarlyEscalationVulnerability(profile)) {
    return baseBand.escalationLevel;
  }
  const vulnCount = countVulnerabilityFlags(profile);
  const earlyBy = Math.min(vulnCount, 2); // max 2 bands earlier
  const adjusted = baseBand.escalationLevel + earlyBy;
  return Math.min(adjusted, 6);
}

/** Get the AqiBand for a given escalation level */
export function getBandByEscalationLevel(level: number): AqiBand {
  const clamped = Math.min(Math.max(level, 0), 6);
  return AQI_BANDS.find((b) => b.escalationLevel === clamped) ?? getFallbackAqiBand();
}

/** Returns true when escalation level is >= 4 (Very Unhealthy or above) */
/** @testonly */
export function isHighRiskCondition(escalationLevel: number): boolean {
  return escalationLevel >= 4;
}

/** Returns true when escalation level is >= 5 (Hazardous or above) */
/** @testonly */
export function isEmergencyCondition(escalationLevel: number): boolean {
  return escalationLevel >= 5;
}
