// Playbook Engine Unit Tests
import { describe, expect, it } from 'vitest';
import { SCENARIOS, DEFAULT_PROFILE, computeDeterministicImpact } from '../../src/domain/scenarios';
import { findSafeVentilationWindow } from '../../src/domain/naqi';
import { buildDeterministicPlaybook } from '../../src/domain/playbookEngine';

describe('Deterministic Playbook Engine', () => {
  it('generates 3 indoor hacks and 3 emission swaps', () => {
    const loc = SCENARIOS.delhi;
    const vent = findSafeVentilationWindow(loc.hourlyPM25, loc.hourlyWind);
    const impact = computeDeterministicImpact(loc, DEFAULT_PROFILE);
    const playbook = buildDeterministicPlaybook(loc, DEFAULT_PROFILE, vent, impact);

    expect(playbook.iaqHacks).toHaveLength(3);
    expect(playbook.emissionSwaps).toHaveLength(3);
    expect(playbook.iaqHacks[0].title).toContain('Wet Mop Only');
    expect(playbook.explainer.healthWhy).toContain('cigarettes/day today');
  });

  it('customizes indoor hack for DIY < 2000 budget tier', () => {
    const loc = SCENARIOS.delhi;
    const profile = { ...DEFAULT_PROFILE, budgetTier: 'diy_2000' as const };
    const vent = findSafeVentilationWindow(loc.hourlyPM25, loc.hourlyWind);
    const impact = computeDeterministicImpact(loc, profile);
    const playbook = buildDeterministicPlaybook(loc, profile, vent, impact);

    const hack2 = playbook.iaqHacks[1];
    expect(hack2.tag).toBe('DIY < ₹2,000');
  });

  it('customizes commute swap for two-wheeler commute mode', () => {
    const loc = SCENARIOS.delhi;
    const profile = { ...DEFAULT_PROFILE, commuteMode: 'two_wheeler' as const };
    const vent = findSafeVentilationWindow(loc.hourlyPM25, loc.hourlyWind);
    const impact = computeDeterministicImpact(loc, profile);
    const playbook = buildDeterministicPlaybook(loc, profile, vent, impact);

    const swap1 = playbook.emissionSwaps[0];
    expect(swap1.title).toContain('Two-Wheeler');
  });

  it('escalates vulnerability advice when household has kids or seniors', () => {
    const loc = SCENARIOS.delhi;
    const profile = { ...DEFAULT_PROFILE, vulnerabilities: ['kids' as const, 'seniors' as const] };
    const vent = findSafeVentilationWindow(loc.hourlyPM25, loc.hourlyWind);
    const impact = computeDeterministicImpact(loc, profile);
    const playbook = buildDeterministicPlaybook(loc, profile, vent, impact);

    expect(playbook.explainer.vulnerabilityNote).toContain('High-Priority Protection');
  });

  it('omits wind and PM10 details when measurements are absent (manual entry)', () => {
    const loc = {
      id: 'manual-180',
      city: 'Manual Entry',
      shortCity: 'Manual Entry',
      subtitle: 'Manual PM2.5 entry',
      sourceLabel: 'Manual entry',
      pm25: 180,
      hourlyPM25: [],
      hourlyWind: [],
      isSynthetic: false,
    };
    const impact = computeDeterministicImpact(loc, DEFAULT_PROFILE);
    const playbook = buildDeterministicPlaybook(loc, DEFAULT_PROFILE, null, impact);
    expect(impact.aqi.isPm25Only).toBe(true);
    expect(playbook.iaqHacks[0].detail).not.toContain('undefined');
    expect(playbook.explainer.emissionWhy).not.toContain('km/h');
    expect(playbook.explainer.emissionWhy).not.toContain('undefined');
  });
});
