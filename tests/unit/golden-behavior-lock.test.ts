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
      const impact = computeDeterministicImpact(loc, profile);
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
    const bulletins = PROFILES.map((_p, idx) => {
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
});
