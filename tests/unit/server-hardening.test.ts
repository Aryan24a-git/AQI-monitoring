import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  buildCombinedScenario,
  buildWaqiScenario,
  extractHourlySeries,
  formatObservationTime,
} from '@/server/api/cityScenarioBuilder';
import { createRateLimiter, withRateLimit } from '@/server/http/withApiGuards';
import { isSafeAction } from '@/domain/rules/safety';
import { ProfileSchema } from '@/domain/profile';
import { findBandByPm25 } from '@/domain/bands';
import { findSafeVentilationWindow } from '@/domain/naqi';
import catalogData from '@/catalog/catalog.json';
import type { Action } from '@/catalog/catalog.schema';

describe('server hardening & domain branch coverage', () => {
  it('cityScenarioBuilder handles valid/invalid hourly series and missing optional pollutants', () => {
    expect(extractHourlySeries(undefined).ok).toBe(false);
    expect(extractHourlySeries([10, Number.NaN]).ok).toBe(false);
    expect(extractHourlySeries(Array(24).fill(42)).ok).toBe(true);
    expect(formatObservationTime(undefined)).toBe('latest reading');
    expect(formatObservationTime('2025-11-12T00:05', 'IST')).toBe('12:05 am IST');
    expect(formatObservationTime('2025-11-12T15:30')).toBe('3:30 pm');

    const waqiOnly = buildWaqiScenario(
      'Jaipur',
      'Rajasthan',
      {
        aqi: 200,
        pm25: 150,
        hasPm25: true,
        stationName: 'Adarsh Nagar',
        timeIso: '2025-11-12T08:00:00Z',
        distanceKm: 2,
      },
      null
    );
    expect(waqiOnly.pm10).toBeUndefined();
    expect(waqiOnly.no2).toBeUndefined();
    expect(waqiOnly.wind).toBeUndefined();
    expect(waqiOnly.hourlyError).toBe('Hourly forecast unavailable');

    const combined = buildCombinedScenario(
      { city: 'Patna' },
      {
        aq: {
          current: { pm10: 210, pm2_5: 140, nitrogen_dioxide: 42 },
          hourly: { pm2_5: Array(24).fill(140) },
        },
        wx: { current: { wind_speed_10m: 6 }, hourly: { wind_speed_10m: Array(24).fill(6) } },
      },
      null
    );
    expect(combined.pm10).toBe(210);
    expect(combined.hourlyError).toBeUndefined();
  });

  it('withRateLimit enforces per-client rate limits and maps handler throws to 500', async () => {
    const limiter = createRateLimiter(1);
    const req1 = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });
    const req2 = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });
    const okFn = vi.fn(async () => new Response('ok', { status: 200 }));
    expect((await withRateLimit(req1, limiter, okFn)).status).toBe(200);
    expect((await withRateLimit(req2, limiter, okFn)).status).toBe(429);

    const errLimiter = createRateLimiter(5);
    const throwReq = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '5.6.7.8' },
    });
    const errRes = await withRateLimit(throwReq, errLimiter, async () => {
      throw new Error('boom');
    });
    expect(errRes.status).toBe(500);
  });

  it('covers safety, bands, and naqi edge branches', () => {
    const baseAct = catalogData.actions[0] as Action;
    const makeAct = (id: string): Action => ({ ...baseAct, id });
    const profile = ProfileSchema.parse({
      schemaVersion: 1,
      members: [{ ageBand: 'adult', vulnerabilityFlags: [] }],
      housingType: 'average',
      hasPurifier: false,
      cookingFuel: 'lpg',
      heatingType: 'none',
      commuteTypes: ['metro'],
      budgetBand: 'low',
    });
    expect(isSafeAction(makeAct('ACT-026'), profile, 300, 3)).toBe(false);
    expect(isSafeAction(makeAct('ACT-007'), profile, 200, 3)).toBe(false);
    expect(isSafeAction(makeAct('ACT-008'), profile, 200, 3)).toBe(true);
    expect(isSafeAction(makeAct('ACT-013'), { ...profile, heatingType: 'wood' }, 200, 3)).toBe(
      true
    );
    expect(findBandByPm25(999).key).toBe('hazardous');
    expect(
      findSafeVentilationWindow(Array(24).fill(150), Array(24).fill(5)).startHour
    ).toBeGreaterThanOrEqual(10);
  });
});
