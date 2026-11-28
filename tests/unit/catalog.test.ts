// Satisfies: TEST-001, DATA-004, D3, D4, D6
import { describe, it, expect } from 'vitest';
import catalogData from '../../src/catalog/catalog.json';
import { ActionSchema, CatalogSchema } from '../../src/catalog/catalog.schema';

const BANNED_PATTERNS = [
  /ozone\s*generator/i,
  /ionizer/i,
  /open\s*windows?\s*(during|at)\s*peak/i,
  /plant.*(clean|purif).*air/i,
  /houseplant/i,
  /air-purifying\s*plants/i,
  /prescribe/i,
  /antibiotic/i,
  /steroid\s*inhaler/i,
  /cure\s*asthma/i,
];

describe('Action Catalog Integrity & Safety', () => {
  it('validates catalog.json against CatalogSchema and ActionSchema', () => {
    const parsedCatalog = CatalogSchema.safeParse(catalogData);
    expect(parsedCatalog.success).toBe(true);
    expect(catalogData.actions.length).toBeGreaterThanOrEqual(25);

    for (const action of catalogData.actions) {
      const parsed = ActionSchema.safeParse(action);
      expect(parsed.success, `Action ${action.id} failed schema validation`).toBe(true);
    }
  });

  it('guarantees every action has a non-empty sourceNote and valid range (DATA-004)', () => {
    for (const action of catalogData.actions) {
      expect(
        action.impact.sourceNote.trim().length,
        `Action ${action.id} sourceNote is empty`
      ).toBeGreaterThanOrEqual(5);
      expect(action.impact.magnitudeRange.low).toBeLessThanOrEqual(
        action.impact.magnitudeRange.high
      );
    }
  });

  it('verifies unique sequential action IDs matching ACT-XXX format', () => {
    const ids = catalogData.actions.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^ACT-\d{3}$/);
    }
  });

  it('enforces safety guard: zero banned or harmful advice patterns (D3)', () => {
    for (const action of catalogData.actions) {
      const serialized = JSON.stringify(action);
      for (const pattern of BANNED_PATTERNS) {
        expect(
          pattern.test(serialized),
          `Action ${action.id} violates safety policy by matching banned pattern ${pattern}`
        ).toBe(false);
      }
    }
  });
});
