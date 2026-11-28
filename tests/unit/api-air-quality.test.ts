import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import * as envModule from '@/server/config/env';
import * as waqiModule from '@/server/providers/waqiAirQuality';
import * as openMeteoModule from '@/server/providers/openMeteoAirQuality';
import { GET } from '../../src/app/api/air-quality/route';

describe('/api/air-quality Endpoint', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 on invalid coordinates', async () => {
    const req = new NextRequest('http://localhost:3000/api/air-quality?lat=abc&lon=77.2');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns WAQI station reading when valid', async () => {
    vi.spyOn(envModule, 'getEnv').mockReturnValue({
      ...envModule.getEnv(),
      AQ_PROVIDER: 'waqi',
      WAQI_API_TOKEN: 'test-token',
    });
    vi.spyOn(waqiModule, 'fetchWaqiStation').mockResolvedValue({
      aqi: 205,
      pm25: 141,
      stationName: 'Mandir Marg',
      distanceKm: 3.6,
      timeIso: '2026-11-28T09:00:00+05:30',
      timeRaw: '2026-11-28 09:00:00',
    } as never);
    vi.spyOn(waqiModule, 'validateWaqiReading').mockReturnValue({
      valid: true,
      ageHours: 1.2,
    });

    const req = new NextRequest('http://localhost:3000/api/air-quality?lat=28.61&lon=77.20');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.source).toBe('WAQI Station (aqicn.org)');
    expect(data.pm25).toBe(141);
  });

  it('falls back to Open-Meteo with note when WAQI is stale, far, or missing pm25', async () => {
    vi.spyOn(envModule, 'getEnv').mockReturnValue({
      ...envModule.getEnv(),
      AQ_PROVIDER: 'waqi',
      WAQI_API_TOKEN: 'test-token',
    });
    vi.spyOn(waqiModule, 'fetchWaqiStation').mockResolvedValue({
      aqi: 180,
      pm25: null,
      stationName: 'Far Station',
      distanceKm: 30,
      timeIso: null,
      timeRaw: null,
    } as never);
    vi.spyOn(openMeteoModule, 'fetchOpenMeteoSnapshot').mockResolvedValue({
      aqi: 190,
      pm25: 110,
      timestamp: '2026-11-28T10:00:00Z',
      provider: 'Open-Meteo Model',
      isFallback: false,
      isStale: false,
      band: 'poor',
    } as never);

    const validateSpy = vi.spyOn(waqiModule, 'validateWaqiReading');
    for (const reason of ['stale', 'far', 'missing_pm25'] as const) {
      validateSpy.mockReturnValueOnce({ valid: false, reason });
      const req = new NextRequest('http://localhost:3000/api/air-quality?lat=28.61&lon=77.20');
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.stationFallbackNote).toContain('showing model only');
    }
  });

  it('returns 503 when upstream provider throws', async () => {
    vi.spyOn(envModule, 'getEnv').mockReturnValue({
      ...envModule.getEnv(),
      AQ_PROVIDER: 'open-meteo',
      WAQI_API_TOKEN: '',
    });
    vi.spyOn(openMeteoModule, 'fetchOpenMeteoSnapshot').mockRejectedValue(
      new Error('upstream down')
    );

    const req = new NextRequest('http://localhost:3000/api/air-quality?lat=28.61&lon=77.20');
    const res = await GET(req);
    expect(res.status).toBe(503);
  });
});
