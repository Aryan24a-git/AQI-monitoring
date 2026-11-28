import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  clearWaqiCache,
  fetchWaqiStation,
  usAqiToPm10,
  usAqiToPm25,
  validateWaqiReading,
  type WaqiStationReading,
} from '../../src/server/providers/waqiAirQuality';
import { buildCombinedScenario } from '../../src/server/api/cityScenario';

describe('WAQI Air Quality Provider', () => {
  beforeEach(() => {
    clearWaqiCache();
  });

  it('converts US EPA AQI (2024 breakpoints) sub-indices back to PM2.5 and PM10 µg/m³', () => {
    expect(usAqiToPm25(50)).toBe(9);
    expect(usAqiToPm25(150)).toBe(55);
    expect(usAqiToPm25(200)).toBe(125);
    expect(usAqiToPm10(100)).toBe(154);
  });

  it('parses WAQI feed response and rounds coordinates cleanly', async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      expect(String(url)).toContain('geo:28.66;77.22');
      return {
        ok: true,
        json: async () => ({
          status: 'ok',
          data: {
            aqi: 155,
            city: { name: 'ITO, Delhi' },
            time: { iso: '2026-11-26T15:00:00+05:30' },
            iaqi: {
              pm25: { v: 155 },
              pm10: { v: 110 },
              no2: { v: 24 },
              w: { v: 2.0 },
            },
          },
        }),
      } as Response;
    });

    const reading = await fetchWaqiStation(28.6612, 77.2219, 'dummy-token', fetchMock as never);
    expect(reading.aqi).toBe(155);
    expect(reading.pm25).toBeGreaterThan(55);
    expect(reading.windKmh).toBe(7);
    expect(reading.stationName).toBe('ITO, Delhi');
  });

  describe('station validation and model combination', () => {
    const nowMs = Date.parse('2026-11-27T12:00:00+05:30');
    const meteoFixture = {
      aq: {
        timezone_abbreviation: 'IST',
        current: {
          time: '2026-11-27T12:00',
          pm10: 210,
          pm2_5: 135,
          nitrogen_dioxide: 42,
          us_aqi: 190,
        },
        hourly: { pm2_5: Array(24).fill(130) as number[] },
      },
      wx: {
        current: { time: '2026-11-27T12:00', wind_speed_10m: 6 },
        hourly: { wind_speed_10m: Array(24).fill(6) as number[] },
      },
    };

    const baseReading: WaqiStationReading = {
      aqi: 195,
      pm25: 140,
      pm10: 200,
      hasPm25: true,
      stationName: 'ITO, Delhi',
      timeIso: '2026-11-27T11:15:00+05:30',
      distanceKm: 4.2,
    };

    it('passes fresh station within 25km and uses Open-Meteo concentrations for NAQI', () => {
      expect(validateWaqiReading(baseReading, nowMs).valid).toBe(true);
      const scenario = buildCombinedScenario('Delhi', 'Delhi', meteoFixture, baseReading, nowMs);
      expect(scenario.pm25).toBe(135);
      expect(scenario.stationAqi?.usAqi).toBe(195);
      expect(scenario.stationAqi?.mismatchWarning).toBeUndefined();
    });

    it('rejects stale station reading older than 3 hours', () => {
      const stale = { ...baseReading, timeIso: '2026-11-27T07:30:00+05:30' };
      expect(validateWaqiReading(stale, nowMs)).toEqual(
        expect.objectContaining({ valid: false, reason: 'stale' })
      );
      const scenario = buildCombinedScenario('Delhi', 'Delhi', meteoFixture, stale, nowMs);
      expect(scenario.stationAqi).toBeUndefined();
      expect(scenario.stationFallbackNote).toContain('>3h old');
    });

    it('rejects station reading farther than 25km', () => {
      const far = { ...baseReading, distanceKm: 32.5 };
      expect(validateWaqiReading(far, nowMs)).toEqual({ valid: false, reason: 'far' });
      const scenario = buildCombinedScenario('Delhi', 'Delhi', meteoFixture, far, nowMs);
      expect(scenario.stationAqi).toBeUndefined();
      expect(scenario.stationFallbackNote).toContain('>25km away');
    });

    it('rejects station reading missing pm2.5', () => {
      const missing = { ...baseReading, hasPm25: false };
      expect(validateWaqiReading(missing, nowMs)).toEqual({ valid: false, reason: 'missing_pm25' });
    });

    it('emits plain warning note when station AQI and model AQI differ by >2x', () => {
      const mismatched = { ...baseReading, aqi: 420 };
      const scenario = buildCombinedScenario('Delhi', 'Delhi', meteoFixture, mismatched, nowMs);
      expect(scenario.stationAqi?.mismatchWarning).toContain('differ by >2x');
    });
  });
});
