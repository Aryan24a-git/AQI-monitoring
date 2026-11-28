// Satisfies: REQ-002, SEC-001, DATA-001, DATA-002
// Profile schema and validation — pure functions, no I/O

import { z } from 'zod';

// ─── Enums (V1 Legacy) ────────────────────────────────────────────────────────

export const BudgetBandSchema = z.enum(['none', 'low', 'medium', 'high']);
export type BudgetBand = z.infer<typeof BudgetBandSchema>;

export const HousingTypeSchema = z.enum(['well_sealed', 'average', 'poorly_sealed', 'open']);
type HousingType = z.infer<typeof HousingTypeSchema>;

export const CookingFuelSchema = z.enum([
  'lpg',
  'natural_gas',
  'kerosene',
  'biomass',
  'electric',
  'induction',
]);
type CookingFuel = z.infer<typeof CookingFuelSchema>;

export const HeatingTypeSchema = z.enum([
  'none',
  'electric',
  'gas',
  'kerosene',
  'wood',
  'coal',
  'other',
]);
type HeatingType = z.infer<typeof HeatingTypeSchema>;

export const CommuteTypeSchema = z.enum([
  'walk',
  'bicycle',
  'motorcycle',
  'car_petrol',
  'car_diesel',
  'car_electric',
  'autorickshaw',
  'bus',
  'metro',
  'work_from_home',
]);
export type CommuteType = z.infer<typeof CommuteTypeSchema>;

export const VulnerabilityFlagSchema = z.enum([
  'asthma',
  'heart_disease',
  'lung_disease',
  'elderly',
  'infant',
  'pregnant',
]);
export type VulnerabilityFlag = z.infer<typeof VulnerabilityFlagSchema>;

export const AgeBandSchema = z.enum(['infant', 'child', 'teen', 'adult', 'elderly']);
type AgeBand = z.infer<typeof AgeBandSchema>;

export const HouseholdMemberSchema = z.object({
  ageBand: AgeBandSchema,
  vulnerabilityFlags: z.array(VulnerabilityFlagSchema).max(6),
});
export type HouseholdMember = z.infer<typeof HouseholdMemberSchema>;

// ─── Profile V1 ───────────────────────────────────────────────────────────────

export const PROFILE_SCHEMA_VERSION = 1;

export const ProfileSchema = z.object({
  schemaVersion: z.literal(PROFILE_SCHEMA_VERSION),
  members: z.array(HouseholdMemberSchema).min(1).max(20),
  housingType: HousingTypeSchema,
  hasPurifier: z.boolean(),
  cookingFuel: CookingFuelSchema,
  heatingType: HeatingTypeSchema,
  commuteTypes: z.array(CommuteTypeSchema).min(0).max(5),
  budgetBand: BudgetBandSchema,
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type Profile = z.infer<typeof ProfileSchema>;

// ─── Profile V2 (CR-01 / REQ-002) ─────────────────────────────────────────────

export const VulnerabilityV2Schema = z.enum(['kids', 'seniors', 'asthma', 'none']);
export type VulnerabilityV2 = z.infer<typeof VulnerabilityV2Schema>;

export const PurifierV2Schema = z.enum(['none', 'one_room', 'whole_home']);
type PurifierV2 = z.infer<typeof PurifierV2Schema>;

export const CommuteModeV2Schema = z.enum(['solo_car', 'two_wheeler', 'public_transit', 'wfh']);
export type CommuteModeV2 = z.infer<typeof CommuteModeV2Schema>;

export const BudgetTierV2Schema = z.enum(['zero_cost', 'diy_2000', 'paid_upgrades']);
export type BudgetTierV2 = z.infer<typeof BudgetTierV2Schema>;

export const ProfileV2Schema = z.object({
  schemaVersion: z.literal(2).default(2),
  vulnerabilities: z
    .array(VulnerabilityV2Schema)
    .min(1)
    .max(4)
    .refine((arr) => !arr.includes('none') || arr.length === 1, {
      message: "'none' cannot be combined with specific vulnerabilities",
    }),
  purifier: PurifierV2Schema,
  kitchenExhaust: z.boolean(),
  commuteMode: CommuteModeV2Schema,
  commuteKm: z.number().int().min(1).max(100),
  budgetTier: BudgetTierV2Schema,
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type ProfileV2 = z.infer<typeof ProfileV2Schema>;

/** Create default profile v2. */
export function createDefaultProfileV2(): ProfileV2 {
  return {
    schemaVersion: 2,
    vulnerabilities: ['kids', 'seniors'],
    purifier: 'none',
    kitchenExhaust: true,
    commuteMode: 'solo_car',
    commuteKm: 16,
    budgetTier: 'zero_cost',
  };
}

function mapV1Vulnerabilities(members: Profile['members']): VulnerabilityV2[] {
  const vulns: VulnerabilityV2[] = [];
  if (members.some((m) => m.ageBand === 'infant' || m.ageBand === 'child')) vulns.push('kids');
  if (members.some((m) => m.ageBand === 'elderly')) vulns.push('seniors');
  const hasResp = members.some(
    (m) => m.vulnerabilityFlags.includes('asthma') || m.vulnerabilityFlags.includes('lung_disease')
  );
  if (hasResp) vulns.push('asthma');
  return vulns.length > 0 ? vulns : ['none'];
}

function mapV1Commute(commuteTypes: Profile['commuteTypes']): CommuteModeV2 {
  if (commuteTypes.includes('work_from_home')) return 'wfh';
  if (commuteTypes.includes('bus') || commuteTypes.includes('metro')) return 'public_transit';
  if (commuteTypes.includes('motorcycle')) return 'two_wheeler';
  return 'solo_car';
}

function mapV1Budget(budgetBand: Profile['budgetBand']): BudgetTierV2 {
  if (budgetBand === 'medium' || budgetBand === 'high') return 'paid_upgrades';
  return budgetBand === 'low' ? 'diy_2000' : 'zero_cost';
}

/** @testonly */
export function migrateProfileV1ToV2(raw: unknown): ProfileV2 {
  const direct = ProfileV2Schema.safeParse(raw);
  if (direct.success) return direct.data;
  const v1 = ProfileSchema.safeParse(raw);
  if (!v1.success) return createDefaultProfileV2();
  const data = v1.data;
  return {
    schemaVersion: 2,
    vulnerabilities: mapV1Vulnerabilities(data.members),
    purifier: data.hasPurifier ? 'one_room' : 'none',
    kitchenExhaust: data.cookingFuel === 'electric' || data.cookingFuel === 'induction',
    commuteMode: mapV1Commute(data.commuteTypes),
    commuteKm: 16,
    budgetTier: mapV1Budget(data.budgetBand),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

// ─── Helpers (V1 Compatibility) ──────────────────────────────────────────────

/** Get all vulnerability flags. */
export function getAllVulnerabilityFlags(profile: Profile): Set<VulnerabilityFlag> {
  const flags = new Set<VulnerabilityFlag>();
  for (const member of profile.members) {
    for (const flag of member.vulnerabilityFlags) flags.add(flag);
  }
  if (profile.members.some((m) => m.ageBand === 'elderly')) flags.add('elderly');
  if (profile.members.some((m) => m.ageBand === 'infant')) flags.add('infant');
  return flags;
}

/** Has early escalation vulnerability. */
export function hasEarlyEscalationVulnerability(profile: Profile): boolean {
  const flags = getAllVulnerabilityFlags(profile);
  const early: VulnerabilityFlag[] = [
    'asthma',
    'heart_disease',
    'lung_disease',
    'elderly',
    'infant',
    'pregnant',
  ];
  return early.some((f) => flags.has(f));
}

/** Count vulnerability flags. */
export function countVulnerabilityFlags(profile: Profile): number {
  return getAllVulnerabilityFlags(profile).size;
}

/** Migrate profile v2 to v1. */
export function migrateProfileV2ToV1(data: ProfileV2): Profile {
  const members: HouseholdMember[] = [];
  if (data.vulnerabilities.includes('kids'))
    members.push({ ageBand: 'child', vulnerabilityFlags: [] });
  if (data.vulnerabilities.includes('seniors'))
    members.push({ ageBand: 'elderly', vulnerabilityFlags: ['elderly'] });
  if (data.vulnerabilities.includes('asthma'))
    members.push({ ageBand: 'adult', vulnerabilityFlags: ['asthma'] });
  if (members.length === 0) members.push({ ageBand: 'adult', vulnerabilityFlags: [] });

  const bMap: Record<BudgetTierV2, BudgetBand> = {
    zero_cost: 'none',
    diy_2000: 'low',
    paid_upgrades: 'medium',
  };
  const cMap: Record<CommuteModeV2, CommuteType[]> = {
    wfh: ['work_from_home'],
    public_transit: ['metro', 'bus'],
    two_wheeler: ['motorcycle'],
    solo_car: ['car_petrol'],
  };

  return {
    schemaVersion: 1,
    members,
    housingType: 'average',
    hasPurifier: data.purifier !== 'none',
    cookingFuel: data.kitchenExhaust ? 'electric' : 'lpg',
    heatingType: 'none',
    commuteTypes: cMap[data.commuteMode] ?? ['car_petrol'],
    budgetBand: bMap[data.budgetTier] ?? 'low',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/** @testonly */
export function migrateProfile(raw: unknown): Profile | null {
  const v1 = ProfileSchema.safeParse(raw);
  if (v1.success) return v1.data;
  const v2 = ProfileV2Schema.safeParse(raw);
  if (v2.success) return migrateProfileV2ToV1(v2.data);
  return null;
}

/** Create default profile. */
export function createDefaultProfile(): Profile {
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    members: [{ ageBand: 'adult', vulnerabilityFlags: [] }],
    housingType: 'average',
    hasPurifier: false,
    cookingFuel: 'lpg',
    heatingType: 'none',
    commuteTypes: ['car_petrol'],
    budgetBand: 'low',
  };
}
