'use server';

import { saveHouseholdProfile, HouseholdProfileUpdate, ACType, WaterHeaterType } from '@/lib/household';
import { revalidatePath } from 'next/cache';

export async function updateHouseholdProfile(formData: FormData) {
  try {
    const residentsRaw = formData.get('residents');
    const homeAreaRaw = formData.get('home_area_m2');
    const acUnitsRaw = formData.get('ac_units');
    const acTypeRaw = formData.get('ac_type') as string | null;
    const waterHeaterTypeRaw = formData.get('water_heater_type') as string | null;

    const residents = residentsRaw ? parseInt(residentsRaw as string, 10) : null;
    const home_area_m2 = homeAreaRaw ? parseFloat(homeAreaRaw as string) : null;
    const ac_units = acUnitsRaw ? parseInt(acUnitsRaw as string, 10) : null;

    // Validate inputs
    if (residents !== null && (isNaN(residents) || residents <= 0)) {
      return { error: 'عدد الأفراد يجب أن يكون أكبر من 0' };
    }
    if (home_area_m2 !== null && (isNaN(home_area_m2) || home_area_m2 <= 0)) {
      return { error: 'مساحة المنزل يجب أن تكون أكبر من 0' };
    }
    if (ac_units !== null && (isNaN(ac_units) || ac_units < 0)) {
      return { error: 'عدد المكيفات لا يمكن أن يكون سالبًا' };
    }

    const validAcTypes = ['split', 'window', 'central', 'other'];
    let ac_type: ACType | null = null;
    if (acTypeRaw && validAcTypes.includes(acTypeRaw)) {
      ac_type = acTypeRaw as ACType;
    } else if (acTypeRaw) {
      return { error: 'نوع التكييف غير صالح' };
    }

    const validWaterHeaterTypes = ['electric', 'solar', 'gas', 'other'];
    let water_heater_type: WaterHeaterType | null = null;
    if (waterHeaterTypeRaw && validWaterHeaterTypes.includes(waterHeaterTypeRaw)) {
      water_heater_type = waterHeaterTypeRaw as WaterHeaterType;
    } else if (waterHeaterTypeRaw) {
      return { error: 'نوع السخان غير صالح' };
    }

    const updateData: Partial<HouseholdProfileUpdate> = {};
    if (residents !== null) updateData.residents = residents;
    if (home_area_m2 !== null) updateData.home_area_m2 = home_area_m2;
    if (ac_units !== null) updateData.ac_units = ac_units;
    if (ac_type !== null) updateData.ac_type = ac_type;
    if (water_heater_type !== null) updateData.water_heater_type = water_heater_type;

    await saveHouseholdProfile(updateData);
    
    revalidatePath('/app/profile');
    revalidatePath('/app');
    
    return { success: true };
  } catch (err: any) {
    console.error('Failed to update household profile:', err);
    return { error: 'حدث خطأ أثناء حفظ بيانات المنزل' };
  }
}
