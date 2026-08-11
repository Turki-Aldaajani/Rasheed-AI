import { HouseholdProfile } from '@/lib/household';
import { Recommendation } from '@/data/mock-analysis';

/**
 * Returns personalized recommendations based on the household profile.
 * Does not mutate the original baseline recommendations.
 * If the profile is null, it returns the baseline unchanged.
 */
export function getPersonalizedRecommendations(
  profile: HouseholdProfile | null,
  baselineRecommendations: Recommendation[]
): Recommendation[] {
  // Deep clone to avoid mutating the original array or its objects
  const personalized = baselineRecommendations.map(rec => ({ ...rec }));

  if (!profile) {
    return personalized;
  }

  // 1. Personalize AC / Cooling recommendations
  const acHoursRec = personalized.find(r => r.id === 'acHours');
  const acTempRec = personalized.find(r => r.id === 'acTemp');

  const hasWindowAc = profile.ac_type === 'window';
  const hasManyAcs = profile.ac_units && profile.ac_units >= 5;
  const hasLargeHome = profile.home_area_m2 && profile.home_area_m2 >= 300;

  if (acHoursRec && (hasWindowAc || hasManyAcs || hasLargeHome)) {
    // Enhance the description to make it highly relevant
    if (hasWindowAc) {
      acHoursRec.description = "مكيفات الشباك تستهلك طاقة أعلى. قلل ساعات التشغيل قدر الإمكان، وفكر في استبدالها بمكيفات سبليت حديثة.";
    } else if (hasManyAcs) {
      acHoursRec.description = `لديك عدد كبير من المكيفات (${profile.ac_units}). إطفاء المكيفات في الغرف غير المستخدمة سيحدث فرقًا هائلاً في فاتورتك.`;
    } else if (hasLargeHome) {
      acHoursRec.description = "في المنازل الكبيرة، التبريد المركزي أو المتعدد يستهلك الكثير من الطاقة. استخدم المؤقتات لتقليل الهدر.";
    }
  }

  // 2. Personalize Water Heating recommendations
  const heaterRec = personalized.find(r => r.id === 'heaterHours');
  const hasElectricHeater = profile.water_heater_type === 'electric';
  const hasLargeFamily = profile.residents && profile.residents >= 5;

  if (heaterRec && hasElectricHeater && hasLargeFamily) {
    heaterRec.description = `سخانات المياه الكهربائية تستهلك الكثير من الطاقة لعائلة مكونة من ${profile.residents} أفراد. شغل السخان فقط أوقات الاستحمام بدلاً من تركه يعمل باستمرار.`;
  }

  // Sort recommendations to prioritize those that are most relevant
  // E.g., if large family + electric heater, move heater recommendation up
  personalized.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    if (a.id === 'heaterHours' && hasElectricHeater && hasLargeFamily) scoreA += 10;
    if (b.id === 'heaterHours' && hasElectricHeater && hasLargeFamily) scoreB += 10;

    if (a.id === 'acHours' && (hasWindowAc || hasManyAcs)) scoreA += 5;
    if (b.id === 'acHours' && (hasWindowAc || hasManyAcs)) scoreB += 5;

    return scoreB - scoreA;
  });

  return personalized;
}
