// Unit tests for unified emissions & impact constants (REQ-016, REQ-020)
import { describe, it, expect } from 'vitest';
import {
  CO2_PER_KM,
  NOX_PER_KM,
  PETROL_CO2_PER_LITRE,
  TREE_ABSORPTION_KG_CO2_MONTH,
  WEEKS_PER_MONTH,
  simulateColonyImpact,
} from '../../src/domain/emissions';
import { lowestPm25Window } from '../../src/domain/forecast';
import {
  SCENARIOS,
  computeDeterministicImpact as computeScenarioImpact,
} from '../../src/domain/scenarios';

describe('Emissions & Impact Model', () => {
  it('has documented sources and honest confidence for transport factors', () => {
    expect(CO2_PER_KM.sourceNote).toBeDefined();
    expect(CO2_PER_KM.value.solo_car).toBe(0.136);
    expect(CO2_PER_KM.value.two_wheeler).toBe(0.037);
    expect(CO2_PER_KM.confidence).toBe('low');
    expect(CO2_PER_KM.isEstimate).toBe(true);
    expect(NOX_PER_KM.value.solo_car).toBe(0.65);
    expect(NOX_PER_KM.isEstimate).toBe(true);
    expect(PETROL_CO2_PER_LITRE.value).toBe(2.31);
    expect(TREE_ABSORPTION_KG_CO2_MONTH.value).toBe(1.75);
    expect(WEEKS_PER_MONTH.value).toBe(4.3);
  });

  it('simulates colony impact matching UI calculations', () => {
    const sim = simulateColonyImpact(120, 4, 16);
    expect(sim.families).toBe(120);
    expect(sim.daysPerWeek).toBe(4);
    expect(sim.monthlyCo2Kg).toBe(Math.round(120 * 4 * 4.3 * 16 * 0.136));
    expect(sim.monthlyPetrolLitres).toBe(Math.round(sim.monthlyCo2Kg / 2.31));
    expect(sim.monthlyTreesEquiv).toBe(Math.round(sim.monthlyCo2Kg / 1.75));
    expect(sim.methodologyNote).toContain('Rough estimate');
    expect(sim.isEstimate).toBe(true);
  });

  it('finds lowest PM2.5 window and handles invalid forecast inputs', () => {
    expect(lowestPm25Window([10, 20], 0)).toBeNull();
    expect(lowestPm25Window([10], 2)).toBeNull();
    expect(lowestPm25Window([{ pm25: null }, { pm25: 10 }], 2)).toBeNull();
    const res = lowestPm25Window(
      [
        { time: '10:00', pm25: 180 },
        { time: '11:00', pm2_5: 90 },
        { time: '12:00', pm25: 80 },
        { time: '13:00', pm25: 150 },
      ],
      2
    );
    expect(res?.startIndex).toBe(1);
    expect(res?.minPm25).toBe(80);
    expect(res?.startTime).toBe('11:00');
  });

  it('preserves commuteKm=0 for non-wfh modes instead of defaulting to 16', () => {
    const loc = SCENARIOS.delhi;
    const zeroKm = computeScenarioImpact(loc, {
      vulnerabilities: ['none'],
      purifier: 'none',
      kitchenExhaust: false,
      commuteMode: 'solo_car',
      commuteKm: 0,
      budgetTier: 'zero_cost',
    });
    expect(zeroKm.km).toBe(0);
    expect(zeroKm.commuteCo2Kg).toBe(0);
  });

  it('computes scenario impact for public_transit, wfh, and whole_home purifier', () => {
    const loc = SCENARIOS.delhi;
    const transit = computeScenarioImpact(loc, {
      vulnerabilities: ['none'],
      purifier: 'whole_home',
      kitchenExhaust: false,
      commuteMode: 'public_transit',
      commuteKm: 10,
      budgetTier: 'paid_upgrades',
    });
    expect(transit.commuteSwapLabel).toContain('Batch evening errands');
    const wfh = computeScenarioImpact(loc, {
      vulnerabilities: ['none'],
      purifier: 'none',
      kitchenExhaust: false,
      commuteMode: 'wfh',
      commuteKm: 0,
      budgetTier: 'paid_upgrades',
    });
    expect(wfh.km).toBe(0);
  });
});
