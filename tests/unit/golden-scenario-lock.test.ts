import { describe, it, expect } from 'vitest';
import { buildCombinedScenario } from '@/server/api/cityScenarioBuilder';
import { buildBasicPlan } from '@/domain/plan';
import type { Profile } from '@/domain/profile';
import type { AirQualitySnapshot } from '@/domain/types';

function makeMeteo(pm25: number, pm10: number, no2: number, wind: number) {
  return {
    aq: {
      current: { pm2_5: pm25, pm10, nitrogen_dioxide: no2, us_aqi: Math.round(pm25 * 1.3) },
      hourly: { pm2_5: Array.from({ length: 24 }, (_, h) => Math.max(10, pm25 - h * 2)) },
      timezone_abbreviation: 'IST',
    },
    wx: {
      current: { wind_speed_10m: wind },
      hourly: { wind_speed_10m: Array.from({ length: 24 }, (_, h) => wind + (h % 5)) },
    },
  };
}

describe('Golden Scenario & Plan Lock (pre-sprint baseline)', () => {
  it('locks buildCombinedScenario across 8 inputs', () => {
    const nowMs = Date.UTC(2026, 0, 15, 8, 0, 0);
    const cases = [
      buildCombinedScenario(
        { city: 'Delhi', admin1: 'Delhi' },
        makeMeteo(200, 300, 60, 4),
        null,
        nowMs
      ),
      buildCombinedScenario(
        { city: 'Delhi', admin1: 'Delhi' },
        makeMeteo(200, 300, 60, 4),
        {
          aqi: 320,
          pm25: 220,
          hasPm25: true,
          pm10: 340,
          no2: 70,
          windKmh: 5,
          stationName: 'ITO, Delhi',
          timeIso: new Date(nowMs - 30 * 60_000).toISOString(),
          distanceKm: 4.2,
        },
        nowMs
      ),
      buildCombinedScenario(
        { city: 'Patna', admin1: 'Bihar' },
        makeMeteo(150, 240, 40, 6),
        {
          aqi: 190,
          pm25: 130,
          hasPm25: true,
          pm10: 210,
          no2: 38,
          windKmh: 6,
          stationName: 'Patna Station',
          timeIso: new Date(nowMs - 4 * 3600_000).toISOString(),
          distanceKm: 5,
        },
        nowMs
      ),
      buildCombinedScenario(
        { city: 'Noida', admin1: 'UP' },
        makeMeteo(180, 270, 50, 5),
        {
          aqi: 240,
          pm25: 190,
          hasPm25: true,
          pm10: 290,
          no2: 45,
          windKmh: 4,
          stationName: 'Far Station',
          timeIso: new Date(nowMs - 20 * 60_000).toISOString(),
          distanceKm: 32,
        },
        nowMs
      ),
      buildCombinedScenario(
        { city: 'Kolkata', admin1: 'WB' },
        makeMeteo(95, 160, 42, 8),
        {
          aqi: 155,
          pm25: 90,
          hasPm25: false,
          pm10: 150,
          no2: 40,
          windKmh: 8,
          stationName: 'Ballygunge',
          timeIso: new Date(nowMs - 15 * 60_000).toISOString(),
          distanceKm: 3,
        },
        nowMs
      ),
      buildCombinedScenario(
        { city: 'Bengaluru', admin1: 'KA' },
        makeMeteo(45, 80, 30, 12),
        null,
        nowMs
      ),
      buildCombinedScenario(
        { city: 'Jaipur', admin1: 'RJ' },
        makeMeteo(110, 190, 35, 7),
        null,
        nowMs
      ),
      buildCombinedScenario(
        { city: 'Lucknow', admin1: 'UP' },
        makeMeteo(175, 260, 55, 5),
        null,
        nowMs
      ),
    ];
    expect(cases).toMatchSnapshot();
  });

  it('locks buildBasicPlan across 8 inputs', () => {
    const fixedNow = new Date('2026-01-15T08:00:00.000Z');
    const makePlanProfile = (overrides: Partial<Profile> = {}): Profile => ({
      schemaVersion: 1,
      members: [{ ageBand: 'child', vulnerabilityFlags: [] }],
      housingType: 'average',
      hasPurifier: false,
      cookingFuel: 'lpg',
      heatingType: 'none',
      commuteTypes: ['car_petrol'],
      budgetBand: 'none',
      ...overrides,
    });
    const makeSnap = (aqi: number, pm25: number): AirQualitySnapshot => ({
      aqi,
      pm25,
      timestamp: fixedNow.toISOString(),
      provider: 'test',
      isStale: false,
      isFallback: false,
      hourlyPm25: Array.from({ length: 24 }, (_, i) => Math.max(20, pm25 - i * 4)),
    });
    const inputs: [Profile, AirQualitySnapshot][] = [
      [makePlanProfile(), makeSnap(350, 220)],
      [
        makePlanProfile({
          members: [{ ageBand: 'adult', vulnerabilityFlags: ['asthma'] }],
          budgetBand: 'low',
        }),
        makeSnap(420, 280),
      ],
      [makePlanProfile({ hasPurifier: true, budgetBand: 'high' }), makeSnap(260, 140)],
      [makePlanProfile({ commuteTypes: ['work_from_home'] }), makeSnap(180, 90)],
      [makePlanProfile({ commuteTypes: ['motorcycle'] }), makeSnap(120, 65)],
      [makePlanProfile({ cookingFuel: 'biomass', heatingType: 'wood' }), makeSnap(310, 190)],
      [
        makePlanProfile({
          housingType: 'well_sealed',
          members: [{ ageBand: 'adult', vulnerabilityFlags: ['pregnant'] }],
        }),
        makeSnap(210, 110),
      ],
      [
        makePlanProfile({
          members: [{ ageBand: 'infant', vulnerabilityFlags: [] }],
          commuteTypes: ['metro'],
        }),
        makeSnap(460, 320),
      ],
    ];
    expect(inputs.map(([p, s]) => buildBasicPlan(p, s, fixedNow))).toMatchSnapshot();
  });
});
