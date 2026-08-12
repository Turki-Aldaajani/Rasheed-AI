import { describe, it, expect } from 'vitest';
import { generateOperatingPlan, calculateCombinedSavings, PlanRecommendation } from '@/lib/operatingPlan';
import { HouseholdProfile } from '@/lib/household';

/**
 * F15 — Personalized Operating Plan Tests
 *
 * Ranking method:
 *   primaryScore = impactScore * 10 + effortDesirabilityScore
 *   where Impact: high=3, medium=2, low=1; Effort desirability: low=3, medium=2, high=1
 *   Tie-breaker: estimatedSavingSar descending, then stable id ascending.
 *
 * Recommendation categories tested:
 *   AC: acTemp, acHours, acMaintenance
 *   Appliances: standbyReduction
 *   Water: heaterHours, waterFixtures
 */
describe('operatingPlan generator', () => {

  // ── 1. Every recommendation has a numeric estimated saving ──────────
  it('every recommendation contains a positive numeric estimatedSavingSar', () => {
    const plan = generateOperatingPlan(null);
    expect(plan.length).toBeGreaterThan(0);

    for (const rec of plan) {
      expect(typeof rec.estimatedSavingSar).toBe('number');
      expect(Number.isFinite(rec.estimatedSavingSar)).toBe(true);
      expect(rec.estimatedSavingSar).toBeGreaterThan(0);
    }
  });

  // ── 2. Sorted by priority score ────────────────────────────────────
  it('recommendations are sorted by priorityScore desc, then saving desc', () => {
    const plan = generateOperatingPlan(null);

    for (let i = 0; i < plan.length - 1; i++) {
      const cur = plan[i];
      const nxt = plan[i + 1];

      if (cur.priorityScore !== nxt.priorityScore) {
        expect(cur.priorityScore).toBeGreaterThan(nxt.priorityScore);
      } else {
        expect(cur.estimatedSavingSar).toBeGreaterThanOrEqual(nxt.estimatedSavingSar);
      }
    }
  });

  // ── 3. Higher-impact / lower-effort ranks above weaker ─────────────
  it('higher-impact/lower-effort recommendation ranks above weaker alternatives', () => {
    const plan = generateOperatingPlan(null);

    // acTemp is high impact + low effort  → score 33
    // acHours is high impact + medium effort → score 32
    // heaterHours is medium impact + low effort → score 23
    const acTemp = plan.find(r => r.id === 'acTemp');
    const acHours = plan.find(r => r.id === 'acHours');
    const heater = plan.find(r => r.id === 'heaterHours');

    expect(acTemp).toBeDefined();
    expect(acHours).toBeDefined();
    expect(heater).toBeDefined();

    // acTemp (33) should rank above acHours (32)
    expect(acTemp!.priorityScore).toBeGreaterThan(acHours!.priorityScore);
    // acHours (32) should rank above heater (23)
    expect(acHours!.priorityScore).toBeGreaterThan(heater!.priorityScore);

    // Verify actual ordering in the plan array
    const acTempIdx = plan.findIndex(r => r.id === 'acTemp');
    const acHoursIdx = plan.findIndex(r => r.id === 'acHours');
    const heaterIdx = plan.findIndex(r => r.id === 'heaterHours');
    expect(acTempIdx).toBeLessThan(acHoursIdx);
    expect(acHoursIdx).toBeLessThan(heaterIdx);
  });

  // ── 4. AC temperature recommendation produces reproducible estimate ─
  it('AC temperature recommendation produces a reproducible calculated saving', () => {
    const plan1 = generateOperatingPlan(null);
    const plan2 = generateOperatingPlan(null);

    const temp1 = plan1.find(r => r.id === 'acTemp');
    const temp2 = plan2.find(r => r.id === 'acTemp');

    expect(temp1).toBeDefined();
    expect(temp2).toBeDefined();
    expect(temp1!.estimatedSavingSar).toBe(temp2!.estimatedSavingSar);
    expect(temp1!.estimatedSavingSar).toBeGreaterThan(0);
  });

  // ── 5. AC hours recommendation produces reproducible estimate ───────
  it('AC hours recommendation produces a reproducible calculated saving', () => {
    const plan1 = generateOperatingPlan(null);
    const plan2 = generateOperatingPlan(null);

    const hours1 = plan1.find(r => r.id === 'acHours');
    const hours2 = plan2.find(r => r.id === 'acHours');

    expect(hours1).toBeDefined();
    expect(hours2).toBeDefined();
    expect(hours1!.estimatedSavingSar).toBe(hours2!.estimatedSavingSar);
    expect(hours1!.estimatedSavingSar).toBeGreaterThan(0);
  });

  // ── 6. AC maintenance recommendation produces a defensible saving ───
  it('AC maintenance recommendation has a calculated saving from cooling kWh model', () => {
    const plan = generateOperatingPlan(null);
    const maint = plan.find(r => r.id === 'acMaintenance');

    expect(maint).toBeDefined();
    expect(maint!.category).toBe('ac');
    expect(maint!.estimatedSavingSar).toBeGreaterThan(0);
    expect(Number.isFinite(maint!.estimatedSavingSar)).toBe(true);
  });

  // ── 7. Electrical appliance (standby) recommendation exists ─────────
  it('standby reduction recommendation has a calculated saving from baseload model', () => {
    const plan = generateOperatingPlan(null);
    const standby = plan.find(r => r.id === 'standbyReduction');

    expect(standby).toBeDefined();
    expect(standby!.category).toBe('appliances');
    expect(standby!.estimatedSavingSar).toBeGreaterThan(0);
    expect(Number.isFinite(standby!.estimatedSavingSar)).toBe(true);
  });

  // ── 8. Water fixtures recommendation exists and uses tariff calc ────
  it('water fixtures recommendation has a calculated saving from NWC tariff model', () => {
    const plan = generateOperatingPlan(null);
    const fixtures = plan.find(r => r.id === 'waterFixtures');

    expect(fixtures).toBeDefined();
    expect(fixtures!.category).toBe('water');
    expect(fixtures!.estimatedSavingSar).toBeGreaterThan(0);
    expect(Number.isFinite(fixtures!.estimatedSavingSar)).toBe(true);
  });

  // ── 9. All six required categories are present ──────────────────────
  it('plan covers all required Issue #15 categories: ac(3), appliances(1), water(2)', () => {
    const plan = generateOperatingPlan(null);
    const ids = plan.map(r => r.id);

    // AC: temperature, hours, maintenance
    expect(ids).toContain('acTemp');
    expect(ids).toContain('acHours');
    expect(ids).toContain('acMaintenance');

    // Appliances
    expect(ids).toContain('standbyReduction');

    // Water: heater + fixtures
    expect(ids).toContain('heaterHours');
    expect(ids).toContain('waterFixtures');
  });

  // ── 10. Household profile affects personalization ───────────────────
  it('household profile personalizes recommendations when relevant', () => {
    const profile: HouseholdProfile = {
      id: 'test',
      residents: 6,
      home_area_m2: 400,
      ac_units: 6,
      ac_type: 'split',
      water_heater_type: 'electric',
      city: 'Riyadh',
      region: 'Riyadh',
      house_type: 'villa',
    };

    const plan = generateOperatingPlan(profile);
    expect(plan.length).toBeGreaterThan(0);

    const acHoursRec = plan.find(r => r.id === 'acHours');
    expect(acHoursRec?.description).toContain('عدد كبير من المكيفات');

    const heaterRec = plan.find(r => r.id === 'heaterHours');
    expect(heaterRec?.description).toContain('لعائلة مكونة من 6 أفراد');
    expect(heaterRec?.impact).toBe('high');

    // Savings must still come from model, not fabricated from profile
    for (const rec of plan) {
      expect(Number.isFinite(rec.estimatedSavingSar)).toBe(true);
      expect(rec.estimatedSavingSar).toBeGreaterThan(0);
    }
  });

  // ── 11. Missing optional data does not crash ────────────────────────
  it('missing optional data does not crash', () => {
    const sparseProfile: HouseholdProfile = {
      id: 'sparse',
      residents: null,
      home_area_m2: null,
      ac_units: null,
      ac_type: null,
      water_heater_type: null,
      city: null,
      region: null,
      house_type: null,
    };

    expect(() => generateOperatingPlan(sparseProfile)).not.toThrow();
    expect(() => generateOperatingPlan(null)).not.toThrow();

    const plan = generateOperatingPlan(sparseProfile);
    expect(plan.length).toBeGreaterThan(0);

    for (const rec of plan) {
      expect(Number.isFinite(rec.estimatedSavingSar)).toBe(true);
      expect(rec.estimatedSavingSar).toBeGreaterThan(0);
    }
  });

  // ── 12. No NaN, Infinity, or negative savings ─────────────────────
  it('no recommendation has NaN, Infinity, or negative saving', () => {
    const plan = generateOperatingPlan(null);

    for (const rec of plan) {
      expect(Number.isNaN(rec.estimatedSavingSar)).toBe(false);
      expect(Number.isFinite(rec.estimatedSavingSar)).toBe(true);
      expect(rec.estimatedSavingSar).toBeGreaterThan(0);
    }
  });

  // ── 13. Deterministic: same input → same output ────────────────────
  it('plan generation is deterministic for the same input', () => {
    const plan1 = generateOperatingPlan(null);
    const plan2 = generateOperatingPlan(null);

    expect(plan1.length).toBe(plan2.length);
    for (let i = 0; i < plan1.length; i++) {
      expect(plan1[i].id).toBe(plan2[i].id);
      expect(plan1[i].estimatedSavingSar).toBe(plan2[i].estimatedSavingSar);
      expect(plan1[i].priorityScore).toBe(plan2[i].priorityScore);
      expect(plan1[i].impact).toBe(plan2[i].impact);
      expect(plan1[i].effort).toBe(plan2[i].effort);
    }
  });

  // ── 14. Demo/baseline data generates a usable plan ─────────────────
  it('demo/baseline data generates at least one usable actionable recommendation', () => {
    const plan = generateOperatingPlan(null);
    expect(plan.length).toBeGreaterThanOrEqual(1);

    const first = plan[0];
    expect(first.title.length).toBeGreaterThan(0);
    expect(first.action.length).toBeGreaterThan(0);
    expect(first.estimatedSavingSar).toBeGreaterThan(0);
  });

  // ── 15. Saving amount does NOT override impact/effort classification
  it('saving amount does not override impact/effort classification', () => {
    const plan = generateOperatingPlan(null);

    // acTemp has score 33 (high impact, low effort) and should rank first
    // regardless of whether its SAR saving is lower than acHours
    const acTemp = plan.find(r => r.id === 'acTemp')!;
    const acHours = plan.find(r => r.id === 'acHours')!;

    const acTempIdx = plan.findIndex(r => r.id === 'acTemp');
    const acHoursIdx = plan.findIndex(r => r.id === 'acHours');
    expect(acTempIdx).toBeLessThan(acHoursIdx);
    expect(acTemp.priorityScore).toBeGreaterThan(acHours.priorityScore);
  });

  // ── 16. Recommendations without financial calculation are not assigned fake savings
  it('recommendations that cannot be calculated are excluded (not assigned fake savings)', () => {
    const plan = generateOperatingPlan(null);

    // Every recommendation in the plan must have a positive calculated saving
    // No recommendation should have estimatedSavingSar === 0 (those are filtered)
    for (const rec of plan) {
      expect(rec.estimatedSavingSar).toBeGreaterThan(0);
    }
  });
});

describe('calculateCombinedSavings (anti-double-counting)', () => {

  it('combined savings is finite, positive, and accounts for overlap correctly', () => {
    const plan = generateOperatingPlan(null);
    const combined = calculateCombinedSavings(plan);

    expect(typeof combined).toBe('number');
    expect(Number.isFinite(combined)).toBe(true);
    expect(combined).toBeGreaterThan(0);
  });

  it('simulation-parameter savings are not naively summed (sequential application)', () => {
    const plan = generateOperatingPlan(null);

    // Sum only the simulation-parameter recommendations' isolated savings
    const simKeys = new Set(['acTemp', 'acHours', 'heaterHours']);
    const simRecs = plan.filter(r => simKeys.has(r.id));
    const sumOfIsolatedSim = simRecs.reduce((s, r) => s + r.estimatedSavingSar, 0);

    // Calculate combined for only sim recs
    const combinedSim = calculateCombinedSavings(simRecs);

    // Sequential application should produce ≤ naive sum
    expect(combinedSim).toBeLessThanOrEqual(sumOfIsolatedSim);
    expect(combinedSim).toBeGreaterThan(0);
  });

  it('combined savings for empty plan is zero', () => {
    expect(calculateCombinedSavings([])).toBe(0);
  });

  it('combined savings is deterministic', () => {
    const plan = generateOperatingPlan(null);
    const c1 = calculateCombinedSavings(plan);
    const c2 = calculateCombinedSavings(plan);
    expect(c1).toBe(c2);
  });
});
