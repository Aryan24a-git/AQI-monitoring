// Safety rules for filtering catalog actions based on AQI, escalation, and housing.

import type { Action } from '../../catalog/catalog.schema';
import type { Profile } from '../profile';
import { getAllVulnerabilityFlags } from '../profile';

const UNSAFE_RULES: Record<
  string,
  (profile: Profile, aqi: number, effectiveEscalation: number) => boolean
> = {
  'ACT-026': () => false,
  'ACT-003': (profile, _aqi, effectiveEscalation) =>
    !(getAllVulnerabilityFlags(profile).size > 0 && effectiveEscalation >= 3),
  'ACT-004': (_profile, aqi) => aqi <= 100,
  'ACT-007': (_profile, aqi) => aqi <= 100,
  'ACT-006': (profile) => !profile.hasPurifier && profile.housingType !== 'well_sealed',
  'ACT-008': (profile) => profile.housingType !== 'well_sealed',
  'ACT-013': (profile) => profile.heatingType === 'wood' || profile.heatingType === 'coal',
};

/** Returns true if the given catalog action is safe for the household and current AQI. */
export function isSafeAction(
  action: Action,
  profile: Profile,
  aqi: number,
  effectiveEscalation: number
): boolean {
  const rule = UNSAFE_RULES[action.id];
  return rule ? rule(profile, aqi, effectiveEscalation) : true;
}
