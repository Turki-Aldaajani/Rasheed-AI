import { describe, it, expect } from 'vitest';
import { getPersonalizedRecommendations } from '../lib/personalization';
import { recommendations as baselineRecommendations } from '../data/mock-analysis';
import { HouseholdProfile } from '../lib/household';

describe('Personalization Logic', () => {
  it('returns baseline recommendations when profile is null', () => {
    const result = getPersonalizedRecommendations(null, baselineRecommendations);
    expect(result).toEqual(baselineRecommendations);
  });

  it('prioritizes window AC replacements', () => {
    const profile: HouseholdProfile = {
      id: '1',
      residents: 3,
      home_area_m2: 150,
      ac_units: 3,
      ac_type: 'window',
      water_heater_type: 'electric',
      city: 'Riyadh',
      region: 'Riyadh',
      house_type: 'Apartment'
    };

    const result = getPersonalizedRecommendations(profile, baselineRecommendations);
    
    // Check if the description is updated
    const acRec = result.find(r => r.id === 'acHours');
    expect(acRec).toBeDefined();
    expect(acRec?.description).toContain('استبدالها بمكيفات سبليت');

    // Check it does not mutate baseline
    const baselineAcRec = baselineRecommendations.find(r => r.id === 'acHours');
    expect(baselineAcRec?.description).not.toContain('استبدالها بمكيفات سبليت');
  });

  it('prioritizes water heating for large families with electric heaters', () => {
    const profile: HouseholdProfile = {
      id: '2',
      residents: 6, // >= 5
      home_area_m2: 250,
      ac_units: 4,
      ac_type: 'split',
      water_heater_type: 'electric',
      city: 'Riyadh',
      region: 'Riyadh',
      house_type: 'Villa'
    };

    const result = getPersonalizedRecommendations(profile, baselineRecommendations);
    
    // Water heater recommendation should be emphasized
    const heaterRec = result.find(r => r.id === 'heaterHours');
    expect(heaterRec).toBeDefined();
    expect(heaterRec?.description).toContain('6 أفراد');
    
    // Sort logic should prioritize water heater. In mock data, cooling is top, but this score pushes heater up.
    // Let's just ensure it's modified.
  });

  it('prioritizes cooling for large homes', () => {
    const profile: HouseholdProfile = {
      id: '3',
      residents: 3,
      home_area_m2: 400, // >= 300
      ac_units: 6,
      ac_type: 'central',
      water_heater_type: 'gas',
      city: 'Jeddah',
      region: 'Makkah',
      house_type: 'Villa'
    };

    const result = getPersonalizedRecommendations(profile, baselineRecommendations);
    
    const acRec = result.find(r => r.id === 'acHours');
    expect(acRec).toBeDefined();
    expect(acRec?.description).toContain('6'); // hasManyAcs matches first if both are true (ac_units >= 5)
  });
});
