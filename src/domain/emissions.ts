// Single Source of Truth for Emissions, Exposure & Colony Impact Constants
// Strictly typed, functions < 40 lines, file < 250 lines (NFR-004)

export type CommuteModeKey = 'solo_car' | 'two_wheeler' | 'public_transit' | 'wfh';

export interface SourcedConstant<T> {
  value: T;
  sourceNote: string;
  confidence: 'high' | 'medium' | 'low';
  isEstimate: boolean;
}

/**
 * Net tailpipe CO2 saved per km when shifting from the given commute mode to low-emission transit.
 * Units: kg CO2 / km.
 */
export const CO2_PER_KM: SourcedConstant<Record<CommuteModeKey, number>> = {
  value: {
    solo_car: 0.136,
    two_wheeler: 0.037,
    public_transit: 0.0,
    wfh: 0.0,
  },
  sourceNote:
    'Heuristic net CO2 delta per km vs urban transit (unverified composite estimate; ICCT/CPCB range)',
  confidence: 'low',
  isEstimate: true,
};

/**
 * Net tailpipe NOx saved per km when shifting from the given commute mode to low-emission transit.
 * Units: g NOx / km (grams, not milligrams).
 */
export const NOX_PER_KM: SourcedConstant<Record<CommuteModeKey, number>> = {
  value: {
    solo_car: 0.65,
    two_wheeler: 0.28,
    public_transit: 0.0,
    wfh: 0.0,
  },
  sourceNote:
    'Heuristic net NOx delta per km in g/km for urban Indian petrol cars & 2-wheelers (unverified estimate)',
  confidence: 'low',
  isEstimate: true,
};

/**
 * Fixed daily CO2 / NOx savings for modes that do not scale linearly by commute km
 * (public_transit errand-batching and WFH zero-idling/home-energy baseline).
 */
export const COMMUTE_BASELINE_CO2_KG: SourcedConstant<{ public_transit: number; wfh: number }> = {
  value: { public_transit: 0.65, wfh: 0.85 },
  sourceNote: 'Heuristic daily CO2 saving from errand batching & zero-idling (unverified estimate)',
  confidence: 'low',
  isEstimate: true,
};

export const COMMUTE_BASELINE_NOX_G: SourcedConstant<{ public_transit: number; wfh: number }> = {
  value: { public_transit: 3.2, wfh: 2.6 },
  sourceNote: 'Heuristic daily NOx saving in grams from errand batching & zero-idling (unverified)',
  confidence: 'low',
  isEstimate: true,
};

/** Baseline daily household kitchen/errand CO2 (kg) and NOx (g) savings. */
export const HOUSEHOLD_BASELINE_CO2_KG: SourcedConstant<number> = {
  value: 0.35,
  sourceNote: 'Heuristic daily household cooking/idling CO2 saving baseline (unverified estimate)',
  confidence: 'low',
  isEstimate: true,
};

export const HOUSEHOLD_BASELINE_NOX_G: SourcedConstant<number> = {
  value: 1.4,
  sourceNote: 'Heuristic daily household NOx saving baseline in grams (unverified estimate)',
  confidence: 'low',
  isEstimate: true,
};

/**
 * Additive indoor PM2.5 exposure reduction components (percentage points), capped at maxCap.
 */
export const EXPOSURE_DROP_COMPONENTS: SourcedConstant<{
  base: number;
  kitchenExhaust: number;
  purifierOneRoom: number;
  purifierWholeHome: number;
  budgetDiyNoPurifier: number;
  budgetPaidNoPurifier: number;
  maxCap: number;
}> = {
  value: {
    base: 46,
    kitchenExhaust: 6,
    purifierOneRoom: 14,
    purifierWholeHome: 22,
    budgetDiyNoPurifier: 12,
    budgetPaidNoPurifier: 16,
    maxCap: 76,
  },
  sourceNote:
    'Heuristic additive indoor PM2.5 reduction model (window sealing + wet mop + HEPA/exhaust); unverified composite estimate',
  confidence: 'low',
  isEstimate: true,
};

export const DEFAULT_COMMUTE_KM: SourcedConstant<number> = {
  value: 16,
  sourceNote: 'Default NCR urban round-trip commute distance when user commuteKm is unset',
  confidence: 'low',
  isEstimate: true,
};

export const WEEKS_PER_MONTH: SourcedConstant<number> = {
  value: 4.3,
  sourceNote: 'Approximate weeks per month (~52 / 12) for monthly colony projections',
  confidence: 'medium',
  isEstimate: true,
};

export const TREE_ABSORPTION_KG_CO2_MONTH: SourcedConstant<number> = {
  value: 1.75,
  sourceNote:
    'Mature tree CO2 absorption ~21 kg/year (~1.75 kg/month; EEA & Arbor Day Foundation rough average)',
  confidence: 'medium',
  isEstimate: true,
};

export const PETROL_CO2_PER_LITRE: SourcedConstant<number> = {
  value: 2.31,
  sourceNote:
    'IPCC / US EPA standard combustion emission factor for finished motor gasoline (2.31 kg CO2/L)',
  confidence: 'high',
  isEstimate: false,
};

export const PM25_PER_CIGARETTE: SourcedConstant<number> = {
  value: 22.0,
  sourceNote:
    'Berkeley Earth methodology (Muller & Rohde 2015): 22 µg/m³ PM2.5 equates to ~1 cigarette/day exposure',
  confidence: 'medium',
  isEstimate: true,
};

export interface ColonySimulationResult {
  families: number;
  daysPerWeek: number;
  monthlyCo2Kg: number;
  monthlyPetrolLitres: number;
  monthlyTreesEquiv: number;
  monthlyNoxGrams: number;
  confidence: 'low';
  isEstimate: true;
  methodologyNote: string;
}

/**
 * Rough estimate of monthly collective savings when neighbours swap solo car commutes.
 */
export function simulateColonyImpact(
  families: number,
  daysPerWeek: number,
  avgRoundTripKm = DEFAULT_COMMUTE_KM.value
): ColonySimulationResult {
  const cleanFamilies = Math.max(1, Math.min(10000, families));
  const cleanDays = Math.max(1, Math.min(7, daysPerWeek));
  const monthlySwaps = cleanFamilies * cleanDays * WEEKS_PER_MONTH.value;

  const monthlyCo2Kg = Math.round(monthlySwaps * avgRoundTripKm * CO2_PER_KM.value.solo_car);
  const monthlyPetrolLitres = Math.round(monthlyCo2Kg / PETROL_CO2_PER_LITRE.value);
  const monthlyTreesEquiv = Math.round(monthlyCo2Kg / TREE_ABSORPTION_KG_CO2_MONTH.value);
  const monthlyNoxGrams = Math.round(monthlySwaps * avgRoundTripKm * NOX_PER_KM.value.solo_car);

  return {
    families: cleanFamilies,
    daysPerWeek: cleanDays,
    monthlyCo2Kg,
    monthlyPetrolLitres,
    monthlyTreesEquiv,
    monthlyNoxGrams,
    confidence: 'low',
    isEstimate: true,
    methodologyNote:
      'Rough estimate based on swapping 1 solo car trip for clean transit/carpool per pledged family.',
  };
}
