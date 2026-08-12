// lib/data/history.ts
import { createClient } from '@/lib/supabase/server';
import { HistoricalBill } from '../historyComparison';
import { getOrCreateHousehold } from '../billService';
import { cookies } from 'next/headers';

export async function getHistoricalBills(billType?: 'electricity' | 'water'): Promise<HistoricalBill[]> {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    throw new Error('User not authenticated');
  }

  // We enforce that the user only gets bills from their own household.
  // Actually, RLS already limits `bills` and `bill_readings` to the user's households.
  // We just fetch all bills.
  
  let query = supabase
    .from('bills')
    .select(`
      id,
      bill_type,
      amount_sar,
      period_label,
      period_start,
      period_end,
      created_at,
      bill_readings (
        consumption,
        reading_type
      )
    `)
    .order('period_start', { ascending: false }); // descending initially to get newest, but we'll sort later anyway

  if (billType) {
    query = query.eq('bill_type', billType);
  }

  const { data: bills, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch historical bills: ${error.message}`);
  }

  return bills.map((bill: any) => {
    // There could be multiple readings, but practically one reading per bill in this system
    const readings = Array.isArray(bill.bill_readings) ? bill.bill_readings : [bill.bill_readings].filter(Boolean);
    const primaryReading = readings.find((r: any) => 
      (bill.bill_type === 'electricity' && r.reading_type === 'electricity_kwh') ||
      (bill.bill_type === 'water' && r.reading_type === 'water_m3')
    );

    return {
      id: bill.id,
      bill_type: bill.bill_type as 'electricity' | 'water',
      amount_sar: bill.amount_sar,
      period_label: bill.period_label,
      period_start: bill.period_start,
      period_end: bill.period_end,
      consumption: primaryReading ? primaryReading.consumption : null,
      created_at: bill.created_at,
    };
  });
}
