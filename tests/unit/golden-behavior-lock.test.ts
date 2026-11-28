import { describe, it, expect } from 'vitest';
import {
  SCENARIOS,
  DEFAULT_PROFILE,
  computeDeterministicImpact,
  type HouseholdProfile,
} from '@/domain/scenarios';
import { buildDeterministicPlaybook } from '@/domain/playbookEngine';
import { simulateColonyImpact } from '@/domain/emissions';
import { formatWhatsAppBulletin } from '@/domain/bulletinTemplate';
import { calculateCPCBNAQI, findSafeVentilationWindow } from '@/domain/naqi';
import { buildCombinedScenario } from '@/server/api/cityScenarioBuilder';
import { buildBasicPlan } from '@/domain/plan';
import type { Profile } from '@/domain/profile';
import type { AirQualitySnapshot } from '@/domain/types';

const PROFILES: HouseholdProfile[] = [
  DEFAULT_PROFILE,
  {
    vulnerabilities: ['asthma'],
    purifier: 'one_room',
    kitchenExhaust: false,
    commuteMode: 'two_wheeler',
    commuteKm: 12,
    budgetTier: 'diy_2000',
  },
  {
    vulnerabilities: ['none'],
    purifier: 'whole_home',
    kitchenExhaust: true,
    commuteMode: 'public_transit',
    commuteKm: 20,
    budgetTier: 'paid_upgrades',
  },
  {
    vulnerabilities: ['kids', 'asthma'],
    purifier: 'none',
    kitchenExhaust: false,
    commuteMode: 'wfh',
    commuteKm: 0,
    budgetTier: 'zero_cost',
  },
  {
    vulnerabilities: ['seniors'],
    purifier: 'one_room',
    kitchenExhaust: true,
    commuteMode: 'solo_car',
    commuteKm: 25,
    budgetTier: 'diy_2000',
  },
  {
    vulnerabilities: ['kids', 'seniors', 'asthma'],
    purifier: 'none',
    kitchenExhaust: true,
    commuteMode: 'two_wheeler',
    commuteKm: 8,
    budgetTier: 'paid_upgrades',
  },
  {
    vulnerabilities: [],
    purifier: 'whole_home',
    kitchenExhaust: false,
    commuteMode: 'solo_car',
    commuteKm: 30,
    budgetTier: 'zero_cost',
  },
  {
    vulnerabilities: ['kids'],
    purifier: 'one_room',
    kitchenExhaust: true,
    commuteMode: 'public_transit',
    commuteKm: 10,
    budgetTier: 'paid_upgrades',
  },
];

describe('Golden Behavior Lock (pre-sprint baseline)', () => {
  it('locks computeDeterministicImpact & buildDeterministicPlaybook across 8 inputs', () => {
    const scenarioList = Object.values(SCENARIOS);
    const results = PROFILES.map((profile, idx) => {
      const loc = scenarioList[idx % scenarioList.length];
      const vent = findSafeVentilationWindow(loc.hourlyPM25, loc.hourlyWind);
      const impact = computeDeterministicImpact(profile === DEFAULT_PROFILE ? loc : loc, profile);
      const playbook = buildDeterministicPlaybook(loc, profile, vent, impact);
      return { impact, vent, playbook };
    });
    expect(results).toMatchSnapshot();
  });

  it('locks calculateCPCBNAQI across 8 pollutant combinations', () => {
    const inputs: [number, number, number][] = [
      [15, 30, 20],
      [45, 80, 35],
      [75, 140, 50],
      [110, 220, 75],
      [190, 320, 95],
      [285, 410, 84],
      [380, 480, 120],
      [40, 450, 190],
    ];
    expect(inputs.map(([pm25, pm10, no2]) => calculateCPCBNAQI(pm25, pm10, no2))).toMatchSnapshot();
  });

  it('locks formatWhatsAppBulletin across 8 inputs', () => {
    const scenarioList = Object.values(SCENARIOS);
    const bulletins = PROFILES.map((p, idx) => {
      const loc = scenarioList[idx % scenarioList.length];
      const aqi = calculateCPCBNAQI(loc.pm25, loc.pm10, loc.no2);
      const vent = findSafeVentilationWindow(loc.hourlyPM25, loc.hourlyWind);
      return formatWhatsAppBulletin({
        lang: idx % 2 === 0 ? 'en' : 'hi',
        rwaName: idx % 3 === 0 ? '' : `Block ${idx} RWA`,
        city: loc.city,
        shortCity: loc.shortCity,
        wind: loc.wind,
        pm25: loc.pm25,
        naqi: aqi.naqi,
        bandLabel: aqi.band.label,
        cigsPerDay: aqi.cigsPerDay,
        windowLabel: vent?.windowLabel ?? null,
        sealLabel: vent?.sealLabel ?? null,
      });
    });
    expect(bulletins).toMatchSnapshot();
  });

  it('locks simulateColonyImpact across 8 inputs', () => {
    const inputs: [number, number, number][] = [
      [10, 1, 16],
      [50, 3, 12],
      [120, 4, 16],
      [250, 5, 20],
      [500, 7, 14],
      [1, 1, 8],
      [300, 2, 25],
      [180, 6, 18],
    ];
    expect(inputs.map(([f, d, k]) => simulateColonyImpact(f, d, k))).toMatchSnapshot();
  });

  it('locks buildCombinedScenario across 8 inputs', () => {
    const nowMs = Date.UTC(2026, 0, 15, 8, 0, 0);
    const makeMeteo = (pm25: number, pm10: number, no2: number, wind: number) => ({
      aq: {
        current: { pm2_5: pm25, pm10, nitrogen_dioxide: no2, us_aqi: Math.round(pm25 * 1.3) },
        hourly: { pm2_5: Array.from({ length: 24 }, (_, h) => Math.max(10, pm25 - h * 2)) },
        timezone_abbreviation: 'IST',
      },
      wx: {
        current: { wind_speed_10m: wind },
        hourly: { wind_speed_10m: Array.from({ length: 24 }, (_, h) => wind + (h % 5)) },
      },
    });
    const cases = [
      buildCombinedScenario('Delhi', 'Delhi', makeMeteo(200, 300, 60, 4), null, nowMs),
      buildCombinedScenario(
        'Delhi',
        'Delhi',
        makeMeteo(200, 300, 60, 4),
        {
          aqi: 320,
          pm25: 220,
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
        'Patna',
        'Bihar',
        makeMeteo(150, 240, 40, 6),
        {
          aqi: 190,
          pm25: 130,
          pm10: 210,
          no2: 38,
          windKmh: 6,
          stationName: 'Patna Station',
          timeIso: new Date(nowMs - 4 * 3600_000).toISOString(), // stale
          distanceKm: 5,
        },
        nowMs
      ),
      buildCombinedScenario(
        'Noida',
        'UP',
        makeMeteo(180, 270, 50, 5),
        {
          aqi: 240,
          pm25: 190,
          pm10: 290,
          no2: 45,
          windKmh: 4,
          stationName: 'Far Station',
          timeIso: new Date(nowMs - 20 * 60_000).toISOString(),
          distanceKm: 32, // far
        },
        nowMs
      ),
      buildCombinedScenario(
        'Kolkata',
        'WB',
        makeMeteo(95, 160, 42, 8),
        {
          aqi: 155,
          pm25: null, // missing pm25
          pm10: 150,
          no2: 40,
          windKmh: 8,
          stationName: 'Ballygunge',
          timeIso: new Date(nowMs - 15 * 60_000).toISOString(),
          distanceKm: 3,
        },
        nowMs
      ),
      buildCombinedScenario('Bengaluru', 'KA', makeMeteo(45, 80, 30, 12), null, nowMs),
      buildCombinedScenario('Jaipur', 'RJ', makeMeteo(110, 190, 35, 7), null, nowMs),
      buildCombinedScenario('Lucknow', 'UP', makeMeteo(175, 260, 55, 5), null, nowMs),
    ];
    expect(cases).toMatchSnapshot();
  });

  it('locks buildBasicPlan across 8 inputs', () => {
    const fixedNow = new Date('2026-01-15T08:00:00.000Z');
    const makePlanProfile = (overrides: Partial<Profile> = {}): Profile => ({
      schemaVersion: 1,
      members: [{ ageBand: 'child_6_12', vulnerabilityFlags: [] }],
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
      pm10: pm25 * 1.4,
      no2: 50,
      source: 'test',
      observedAt: fixedNow.toISOString(),
      hourlyForecast: Array.from({ length: 24 }, (_, i) => ({
        hour: new Date(fixedNow.getTime() + i * 3600_000).toISOString(),
        pm25: Math.max(20, pm25 - i * 4),
      })),
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
      [
        makePlanProfile({
          commuteTypes: ['motorcycle'],
          members: [{ ageBand: 'adult', vulnerabilityFlags: [] }],
        }),
        makeSnap(120, 65),
      ],
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
          members: [{ ageBand: 'infant_0_5', vulnerabilityFlags: [] }],
          commuteTypes: ['metro'],
        }),
        makeSnap(460, 320),
      ],
    ];
    expect(inputs.map(([p, s]) => buildBasicPlan(p, s, fixedNow))).toMatchSnapshot();
  });
});
