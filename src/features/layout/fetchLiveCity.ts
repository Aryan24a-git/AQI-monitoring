// Live city / geolocation / manual AQI client helpers (no silent synthetic fallback)
// Satisfies: REQ-001, REQ-003, V2-30
import type { LocationScenario } from '@/domain/scenarios';

/** Fetch live indian city. */
export async function fetchLiveIndianCity(cityQuery: string): Promise<LocationScenario | null> {
  const clean = cityQuery.trim();
  if (clean.length < 2) return null;

  const res = await fetch(`/api/city-scenario?q=${encodeURIComponent(clean)}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Provider unavailable (HTTP ${res.status})`);
  }
  return (await res.json()) as LocationScenario;
}

/** Fetch live by coords. */
export async function fetchLiveByCoords(lat: number, lon: number): Promise<LocationScenario> {
  const rLat = Math.round(lat * 100) / 100;
  const rLon = Math.round(lon * 100) / 100;
  const res = await fetch(`/api/air-quality?lat=${rLat}&lon=${rLon}`);
  if (!res.ok) {
    throw new Error(`Air quality service unavailable (HTTP ${res.status})`);
  }
  const reading = (await res.json()) as {
    pm25: number;
    aqi: number;
    timestamp: string;
    obsTime?: string;
    ageLabel?: string;
    stationName?: string;
    distanceKm?: number;
    source?: string;
    stationFallbackNote?: string;
  };
  const pm25 = Math.max(1, Math.round(reading.pm25));
  const obsTime = reading.obsTime || 'latest reading';
  const agePart = reading.ageLabel ? `${reading.ageLabel} (${obsTime})` : obsTime;
  const sourceText = reading.source?.trim() || 'Live air-quality reading';
  const isWaqi = /waqi|station/i.test(sourceText);
  return {
    id: `gps-${rLat}-${rLon}`,
    city: `Your Area (${rLat}, ${rLon})`,
    shortCity: 'Your Area',
    subtitle: `${sourceText} · ${agePart}`,
    sourceLabel: isWaqi
      ? 'Station observation (WAQI)'
      : 'Model-derived NAQI equivalent (Open-Meteo)',
    pm25,
    hourlyPM25: [],
    hourlyWind: [],
    hourlyError: 'Hourly forecast unavailable',
    isSynthetic: false,
    ...(isWaqi ? { pm25Approx: true } : {}),
    ...(reading.stationFallbackNote ? { stationFallbackNote: reading.stationFallbackNote } : {}),
  };
}

/** Build manual scenario. */
export function buildManualScenario(pm25Raw: number, cityLabel = 'Manual Entry'): LocationScenario {
  const pm25 = Math.max(1, Math.min(1000, Math.round(pm25Raw)));
  const nowStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return {
    id: `manual-${pm25}`,
    city: cityLabel,
    shortCity: cityLabel,
    subtitle: `Manual PM2.5 entry at ${nowStr}`,
    sourceLabel: `Manual entry (${nowStr})`,
    pm25,
    hourlyPM25: [],
    hourlyWind: [],
    hourlyError: 'Hourly forecast unavailable',
    isSynthetic: false,
  };
}
