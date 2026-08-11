import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateHouseholdProfile } from '../app/actions/household';
import * as householdModule from '../lib/household';
import * as nextCache from 'next/cache';

vi.mock('../lib/household', () => ({
  saveHouseholdProfile: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Household Action - updateHouseholdProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates negative residents and returns error', async () => {
    const formData = new FormData();
    formData.append('residents', '-1');

    const result = await updateHouseholdProfile(formData);
    expect(result).toEqual({ error: 'عدد الأفراد يجب أن يكون أكبر من 0' });
    expect(householdModule.saveHouseholdProfile).not.toHaveBeenCalled();
  });

  it('validates invalid ac_type and returns error', async () => {
    const formData = new FormData();
    formData.append('ac_type', 'unknown_type');

    const result = await updateHouseholdProfile(formData);
    expect(result).toEqual({ error: 'نوع التكييف غير صالح' });
    expect(householdModule.saveHouseholdProfile).not.toHaveBeenCalled();
  });

  it('saves valid data successfully and revalidates paths', async () => {
    const formData = new FormData();
    formData.append('residents', '5');
    formData.append('ac_type', 'split');

    const result = await updateHouseholdProfile(formData);
    
    expect(result).toEqual({ success: true });
    expect(householdModule.saveHouseholdProfile).toHaveBeenCalledWith({
      residents: 5,
      ac_type: 'split',
    });
    expect(nextCache.revalidatePath).toHaveBeenCalledWith('/app/profile');
    expect(nextCache.revalidatePath).toHaveBeenCalledWith('/app');
  });

  it('calls saveHouseholdProfile correctly for partial data', async () => {
    const formData = new FormData();
    formData.append('home_area_m2', '120.5');

    const result = await updateHouseholdProfile(formData);
    
    expect(result).toEqual({ success: true });
    expect(householdModule.saveHouseholdProfile).toHaveBeenCalledWith({
      home_area_m2: 120.5,
    });
  });
});
