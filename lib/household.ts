import { createClient } from "@/lib/supabase/server";

export type ACType = 'split' | 'window' | 'central' | 'other';
export type WaterHeaterType = 'electric' | 'solar' | 'gas' | 'other';

export type HouseholdProfile = {
  id: string;
  residents: number | null;
  home_area_m2: number | null;
  ac_units: number | null;
  ac_type: ACType | null;
  water_heater_type: WaterHeaterType | null;
  city: string | null;
  region: string | null;
  house_type: string | null;
};

export type HouseholdProfileUpdate = Omit<HouseholdProfile, 'id'>;

/**
 * Gets the current/default household for the authenticated user.
 * For Issue #19, this is deterministically the oldest household.
 */
export async function getHouseholdProfile(): Promise<HouseholdProfile | null> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return null;
  }

  // RLS ensures we only see this user's households
  const { data, error } = await supabase
    .from('households')
    .select('id, residents, home_area_m2, ac_units, ac_type, water_heater_type, city, region, house_type')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as HouseholdProfile;
}

/**
 * Saves the household profile for the authenticated user.
 * Updates the oldest household if it exists, otherwise inserts a new one.
 */
export async function saveHouseholdProfile(update: Partial<HouseholdProfileUpdate>): Promise<void> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  const existing = await getHouseholdProfile();

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from('households')
      .update(update)
      .eq('id', existing.id);
      
    if (error) {
      console.error('Error updating household:', error);
      throw new Error('Failed to update household profile');
    }
  } else {
    // Insert new
    const { error } = await supabase
      .from('households')
      .insert({
        ...update,
        user_id: user.id
      });
      
    if (error) {
      console.error('Error inserting household:', error);
      throw new Error('Failed to create household profile');
    }
  }
}
