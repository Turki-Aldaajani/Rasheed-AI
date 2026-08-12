import { HouseholdProfile } from '@/lib/household';
import { baseline, currentScenario, simulate, billFromKwh, SimulationInput } from '@/lib/simulation';
import { recommendedSettings, consumptionBreakdown } from '@/data/mock-analysis';
import { waterBill } from '@/data/mock-bill';
import { calcWaterBill } from '@/lib/tariffCalculator';

export type ImpactLevel = 'high' | 'medium' | 'low';
export type EffortLevel = 'low' | 'medium' | 'high';
export type RecommendationCategory = 'ac' | 'appliances' | 'water' | 'other';

export interface PlanRecommendation {
  id: string;
  category: RecommendationCategory;
  title: string;
  description: string;
  action: string;
  estimatedSavingSar: number;
  impact: ImpactLevel;
  effort: EffortLevel;
  priorityScore: number;
  from?: string;
  to?: string;
}

const IMPACT_SCORE: Record<ImpactLevel, number> = { high: 3, medium: 2, low: 1 };
const EFFORT_SCORE: Record<EffortLevel, number> = { low: 3, medium: 2, high: 1 };

// ─────────────────────────────────────────────────────────────────────────────
// MODEL ASSUMPTIONS — explicit, documented, not official Saudi efficiency claims
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AC maintenance efficiency assumption.
 *
 * Dirty filters and unmaintained AC units are assumed to consume more energy
 * than a properly serviced unit. This constant represents the fraction of
 * cooling kWh that can be recovered by performing routine maintenance
 * (cleaning filters, checking refrigerant, clearing vents).
 *
 * Value: 5% of current cooling kWh.
 *
 * Source: Model assumption for demonstration purposes. Not an official SEC or
 * SASO figure. In a production system this should be calibrated against
 * measured maintenance studies.
 */
const AC_MAINTENANCE_RECOVERY_FRACTION = 0.05;

/**
 * Standby/phantom load reduction assumption.
 *
 * The simulation model already allocates an "other" category (18% of total
 * consumption) which explicitly includes "أجهزة الاستعداد" (standby devices).
 * This constant represents the fraction of that "other" kWh component that can
 * be eliminated by unplugging unused devices and using smart power strips.
 *
 * Value: 15% of the "other" component.
 *
 * Source: Model assumption. Not an official appliance efficiency claim.
 */
const STANDBY_REDUCTION_FRACTION = 0.15;

/**
 * Water fixture reduction assumption.
 *
 * Installing low-flow aerators on taps and shower heads is assumed to reduce
 * total household water consumption by this fraction.
 *
 * Value: 10% of current monthly water consumption (m³).
 *
 * Source: Model assumption for demonstration purposes. Not an official NWC
 * figure. The saving is calculated using the official water tariff tiers.
 */
const WATER_FIXTURE_REDUCTION_FRACTION = 0.10;

// ─────────────────────────────────────────────────────────────────────────────
// Saving calculators — each uses existing model data + tariff functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates the SAR saving from an isolated simulation parameter change.
 * Uses the same baseline for all comparisons so individual cards are
 * independently comparable.
 */
function simulationParamSaving(paramKey: keyof SimulationInput): number {
  if (!(paramKey in recommendedSettings)) return 0;
  const testInput: SimulationInput = {
    ...baseline.input,
    [paramKey]: recommendedSettings[paramKey as keyof typeof recommendedSettings],
  };
  const isolatedBill = simulate(testInput).billSar;
  return Math.max(0, currentScenario.billSar - isolatedBill);
}

/**
 * AC maintenance saving: reducing cooling kWh by the maintenance recovery
 * fraction and recalculating the total bill via the official tariff.
 */
function acMaintenanceSaving(): number {
  const recoveredKwh = baseline.coolingKwh * AC_MAINTENANCE_RECOVERY_FRACTION;
  const reducedTotalKwh = baseline.totalKwh - recoveredKwh;
  if (reducedTotalKwh < 0) return 0;
  const reducedBill = billFromKwh(reducedTotalKwh);
  const saving = currentScenario.billSar - reducedBill;
  return Number.isFinite(saving) && saving > 0 ? saving : 0;
}

/**
 * Standby/phantom load saving: reducing the "other" kWh component by the
 * standby reduction fraction and recalculating the total bill via the
 * official tariff.
 */
function standbyReductionSaving(): number {
  const otherShare = consumptionBreakdown.find(c => c.id === 'other');
  if (!otherShare) return 0;
  const otherKwh = baseline.totalKwh * (otherShare.share / 100);
  const reducedKwh = otherKwh * STANDBY_REDUCTION_FRACTION;
  const reducedTotalKwh = baseline.totalKwh - reducedKwh;
  if (reducedTotalKwh < 0) return 0;
  const reducedBill = billFromKwh(reducedTotalKwh);
  const saving = currentScenario.billSar - reducedBill;
  return Number.isFinite(saving) && saving > 0 ? saving : 0;
}

/**
 * Water fixture saving: reducing water consumption by the fixture reduction
 * fraction and recalculating the bill via the official NWC tariff tiers.
 */
function waterFixtureSaving(): number {
  const currentM3 = waterBill.consumptionM3;
  if (!currentM3 || currentM3 <= 0) return 0;
  const reducedM3 = currentM3 * (1 - WATER_FIXTURE_REDUCTION_FRACTION);
  const currentWaterBill = calcWaterBill(currentM3);
  const reducedWaterBill = calcWaterBill(reducedM3);
  const saving = currentWaterBill.totalSar - reducedWaterBill.totalSar;
  return Number.isFinite(saving) && saving > 0 ? saving : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan generator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a personalized operating plan based on the household profile and
 * simulation baseline. Uses deterministic impact-vs-effort ranking.
 *
 * Every recommendation has a defensible, calculated saving:
 *   - acTemp / acHours / heaterHours: via existing simulation.ts model
 *   - acMaintenance: via cooling kWh × recovery fraction → tariff
 *   - standbyReduction: via "other" kWh × reduction fraction → tariff
 *   - waterFixtures: via water m³ × reduction fraction → NWC tariff
 *
 * Recommendations with zero or non-finite savings are excluded.
 */
export function generateOperatingPlan(profile: HouseholdProfile | null): PlanRecommendation[] {
  type RawRec = Omit<PlanRecommendation, 'estimatedSavingSar' | 'priorityScore'> & {
    savingFn: () => number;
  };

  const rawRecommendations: RawRec[] = [
    // ── AC: Temperature ───────────────────────────────────────────────
    {
      id: 'acTemp',
      category: 'ac',
      title: 'ضبط درجة حرارة المكيف',
      description: 'رفع درجة حرارة المكيف ضمن نطاق مريح يقلل استهلاك التبريد بشكل ملحوظ.',
      action: 'ارفع درجة الحرارة درجتين مع تشغيل المراوح للحفاظ على الإحساس بالبرودة.',
      from: `${baseline.input.acTemp} درجة مئوية`,
      to: `${recommendedSettings.acTemp} درجة مئوية`,
      impact: 'high',
      effort: 'low',
      savingFn: () => simulationParamSaving('acTemp'),
    },
    // ── AC: Operating hours ───────────────────────────────────────────
    {
      id: 'acHours',
      category: 'ac',
      title: 'تقليل ساعات تشغيل المكيفات',
      description: 'تقليل ساعات تشغيل المكيفات اليومية مع الحفاظ على مستوى راحة مناسب.',
      action: 'أطفئ المكيفات في الغرف غير المستخدمة، واستخدم المؤقّت قبل الخروج من المنزل.',
      from: `${baseline.input.acHours} ساعة يوميًا`,
      to: `${recommendedSettings.acHours} ساعة يوميًا`,
      impact: 'high',
      effort: 'medium',
      savingFn: () => simulationParamSaving('acHours'),
    },
    // ── AC: Maintenance ───────────────────────────────────────────────
    {
      id: 'acMaintenance',
      category: 'ac',
      title: 'صيانة المكيفات وتنظيف الفلاتر',
      description: 'تنظيف فلاتر المكيفات وصيانتها الدورية يحسّن كفاءة التبريد ويقلل الاستهلاك.',
      action: 'نظّف فلاتر المكيفات شهريًا، وتأكد من صيانة الوحدات الخارجية وفحص مستوى الفريون سنويًا.',
      impact: 'medium',
      effort: 'medium',
      savingFn: acMaintenanceSaving,
    },
    // ── Electrical appliances: Standby load ───────────────────────────
    {
      id: 'standbyReduction',
      category: 'appliances',
      title: 'تقليل استهلاك أجهزة الاستعداد',
      description: 'الأجهزة الإلكترونية في وضع الاستعداد تستهلك طاقة دون استخدام فعلي.',
      action: 'افصل الأجهزة غير المستخدمة من الكهرباء أو استخدم مشتركات ذكية بمفتاح إيقاف.',
      impact: 'low',
      effort: 'low',
      savingFn: standbyReductionSaving,
    },
    // ── Water: Heater hours ───────────────────────────────────────────
    {
      id: 'heaterHours',
      category: 'water',
      title: 'تحسين تشغيل سخان المياه',
      description: 'تقليل ساعات تشغيل السخان غير الضرورية يوفر في فاتورة الكهرباء.',
      action: 'شغّل السخان قبل أوقات الاستخدام فقط بدلًا من إبقائه يعمل باستمرار.',
      from: `${baseline.input.heaterHours} ساعات يوميًا`,
      to: `${recommendedSettings.heaterHours} ساعات يوميًا`,
      impact: 'medium',
      effort: 'low',
      savingFn: () => simulationParamSaving('heaterHours'),
    },
    // ── Water: Fixtures ───────────────────────────────────────────────
    {
      id: 'waterFixtures',
      category: 'water',
      title: 'تركيب مرشّدات المياه على الحنفيات ورؤوس الدش',
      description: 'مرشّدات المياه تقلل التدفق دون التأثير على تجربة الاستخدام اليومي.',
      action: 'ركّب رؤوس دش ومرشّدات حنفيات موفّرة للمياه في جميع الحمامات والمطبخ.',
      from: `${waterBill.consumptionM3} م³ شهريًا`,
      to: `≈ ${Math.round(waterBill.consumptionM3 * (1 - WATER_FIXTURE_REDUCTION_FRACTION))} م³ شهريًا`,
      impact: 'low',
      effort: 'medium',
      savingFn: waterFixtureSaving,
    },
  ];

  // ── Personalization based on household profile ─────────────────────
  if (profile) {
    const acHoursRec = rawRecommendations.find(r => r.id === 'acHours');
    if (acHoursRec) {
      if (profile.ac_type === 'window') {
        acHoursRec.description = 'مكيفات الشباك تستهلك طاقة أعلى. قلل ساعات التشغيل قدر الإمكان.';
      } else if (profile.ac_units && profile.ac_units >= 5) {
        acHoursRec.description = `لديك عدد كبير من المكيفات (${profile.ac_units}). إطفاء المكيفات في الغرف غير المستخدمة سيحدث فرقًا هائلاً.`;
      } else if (profile.home_area_m2 && profile.home_area_m2 >= 300) {
        acHoursRec.description = 'في المنازل الكبيرة، التبريد المتعدد يستهلك الكثير من الطاقة. استخدم المؤقتات لتقليل الهدر.';
      }
    }

    const heaterRec = rawRecommendations.find(r => r.id === 'heaterHours');
    if (heaterRec && profile.water_heater_type === 'electric' && profile.residents && profile.residents >= 5) {
      heaterRec.description = `سخانات المياه الكهربائية تستهلك الكثير لعائلة مكونة من ${profile.residents} أفراد. شغل السخان فقط أوقات الاستحمام.`;
      heaterRec.impact = 'high';
    }
  }

  // ── Calculate savings and scores ───────────────────────────────────
  const recommendationsWithSavings: PlanRecommendation[] = rawRecommendations.map(rec => {
    const estimatedSavingSar = rec.savingFn();
    const impactScore = IMPACT_SCORE[rec.impact];
    const effortScore = EFFORT_SCORE[rec.effort];
    const priorityScore = (impactScore * 10) + effortScore;

    // Destructure to remove savingFn before returning
    const { savingFn: _, ...rest } = rec;

    return { ...rest, estimatedSavingSar, priorityScore };
  });

  // Filter out recommendations with 0, negative, or non-finite savings
  const validRecommendations = recommendationsWithSavings.filter(
    rec => Number.isFinite(rec.estimatedSavingSar) && rec.estimatedSavingSar > 0
  );

  // Sort deterministically:
  // 1. priority score descending
  // 2. estimated saving descending (tie-breaker only)
  // 3. stable ID ascending (final tie-breaker)
  return validRecommendations.sort((a, b) => {
    if (a.priorityScore !== b.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    if (a.estimatedSavingSar !== b.estimatedSavingSar) {
      return b.estimatedSavingSar - a.estimatedSavingSar;
    }
    return a.id.localeCompare(b.id);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Combined savings (anti-double-counting)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates the combined savings of applying all plan recommendations.
 *
 * For electricity recommendations that map to SimulationInput parameters
 * (acTemp, acHours, heaterHours): applied sequentially via simulate() to
 * prevent double-counting on overlapping consumption components.
 *
 * For non-simulation recommendations (acMaintenance, standbyReduction,
 * waterFixtures): these affect independent consumption components that do
 * not overlap with each other or with the simulation parameters, so their
 * isolated savings can be safely added.
 *
 *   - acMaintenance affects an efficiency multiplier on coolingKwh (not
 *     the same dimension as temp/hours adjustments in the simulation).
 *   - standbyReduction affects the "other" baseload component which is
 *     treated as constant in simulate().
 *   - waterFixtures affects the water bill, completely independent of
 *     electricity.
 */
export function calculateCombinedSavings(recs: PlanRecommendation[]): number {
  if (recs.length === 0) return 0;

  // 1. Sequential simulation for simulation-parameter recommendations
  let settings: SimulationInput = { ...baseline.input };
  const simKeys = new Set(['acTemp', 'acHours', 'heaterHours']);
  for (const rec of recs) {
    if (simKeys.has(rec.id)) {
      const key = rec.id as keyof typeof recommendedSettings;
      if (key in recommendedSettings) {
        settings = { ...settings, [key]: recommendedSettings[key] };
      }
    }
  }
  const simulationSaving = Math.max(0, currentScenario.billSar - simulate(settings).billSar);

  // 2. Add independent non-simulation savings
  let independentSaving = 0;
  for (const rec of recs) {
    if (!simKeys.has(rec.id)) {
      independentSaving += rec.estimatedSavingSar;
    }
  }

  const total = simulationSaving + independentSaving;
  return (Number.isFinite(total) && total > 0) ? total : 0;
}

