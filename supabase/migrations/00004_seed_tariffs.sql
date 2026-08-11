-- ============================================================================
-- Rasheed AI — Official Saudi Tariff Data Seed
-- Migration: 00004_seed_tariffs.sql
-- Issue:     A13 · جداول شرائح التعرفة الرسمية كمصدر حقيقة
-- ============================================================================
--
-- Populates the `tariffs` table with official Saudi residential tariff tiers
-- for electricity (SEC) and water (NWC), effective 2018-01-01 and in force
-- through the current regulatory period (2025+).
--
-- Electricity source: Saudi Electricity Company (SEC) / ECRA (now WERA)
--   https://www.se.com.sa
--   Two-tier progressive model:
--     Tier 1: 0–6,000 kWh  → 0.18 SAR/kWh  (18 halalas)
--     Tier 2: >6,000 kWh   → 0.30 SAR/kWh  (30 halalas)
--
-- Water source: National Water Company (NWC) / Saudi Water Authority (SWA)
--   https://www.nwc.com.sa
--   Five-tier progressive model (m³/month):
--     Tier 1:  0–15  m³   → 0.10 SAR/m³
--     Tier 2: 16–30  m³   → 3.00 SAR/m³
--     Tier 3: 31–45  m³   → 4.00 SAR/m³
--     Tier 4: 46–60  m³   → 6.00 SAR/m³
--     Tier 5: >60    m³   → 9.00 SAR/m³
--
-- Tariff update procedure:
--   When official tariffs change:
--     1. Set is_active = false and effective_to = <last effective date> on the
--        old rows (UPDATE public.tariffs SET is_active = false, effective_to =
--        '<date>' WHERE is_active = true AND utility_type = '<type>').
--     2. INSERT new rows with the updated sar_per_unit and a new effective_from.
--     3. Add a new migration file (e.g. 00005_update_tariffs_<date>.sql) to
--        keep the change history in version control.
--     4. Update tests/tariff.test.ts scenarios to reflect the new rates.
-- ============================================================================

-- Guard: skip if already seeded (idempotent on re-apply)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.tariffs LIMIT 1) THEN
    RAISE NOTICE 'tariffs table already has data — skipping seed.';
    RETURN;
  END IF;

  -- ──────────────────────────────────────────────────────────────────────────
  -- ELECTRICITY — SEC Residential Tiered Tariff (SAR/kWh)
  -- Two progressive tiers; applied cumulatively on monthly kWh consumption.
  -- Fixed meter charge: 10.00 SAR/month (independent of consumption tier).
  -- VAT: Not applicable on residential electricity per regulatory exemption.
  -- ──────────────────────────────────────────────────────────────────────────

  INSERT INTO public.tariffs
    (utility_type, customer_category, name, min_consumption, max_consumption,
     sar_per_unit, fixed_fee_sar, effective_from, effective_to, is_active)
  VALUES
    -- Tier 1: 0 – 6,000 kWh/month @ 0.18 SAR/kWh
    ('electricity', 'residential',
     'شريحة الكهرباء الأولى — حتى 6000 ك.و.س',
     0, 6000,
     0.1800, 10.00,
     '2018-01-01', NULL, true),

    -- Tier 2: > 6,000 kWh/month @ 0.30 SAR/kWh (open-ended — max_consumption NULL)
    ('electricity', 'residential',
     'شريحة الكهرباء الثانية — أكثر من 6000 ك.و.س',
     6000, NULL,
     0.3000, 0.00,
     '2018-01-01', NULL, true);

  -- ──────────────────────────────────────────────────────────────────────────
  -- WATER — NWC Residential Tiered Tariff (SAR/m³)
  -- Five progressive tiers; applied cumulatively on monthly m³ consumption.
  -- Sewage fee: 50% of total water consumption cost (applied separately at
  --             billing time — not stored in tariffs table).
  -- VAT: 15% applied to total water bill (also applied at billing time).
  -- Fixed meter charge: 0.00 SAR (no fixed monthly fee in NWC model).
  -- ──────────────────────────────────────────────────────────────────────────

  INSERT INTO public.tariffs
    (utility_type, customer_category, name, min_consumption, max_consumption,
     sar_per_unit, fixed_fee_sar, effective_from, effective_to, is_active)
  VALUES
    -- Tier 1: 0 – 15 m³/month @ 0.10 SAR/m³
    ('water', 'residential',
     'شريحة المياه الأولى — حتى 15 م³',
     0, 15,
     0.1000, 0.00,
     '2018-01-01', NULL, true),

    -- Tier 2: 16 – 30 m³/month @ 3.00 SAR/m³
    ('water', 'residential',
     'شريحة المياه الثانية — 16 إلى 30 م³',
     15, 30,
     3.0000, 0.00,
     '2018-01-01', NULL, true),

    -- Tier 3: 31 – 45 m³/month @ 4.00 SAR/m³
    ('water', 'residential',
     'شريحة المياه الثالثة — 31 إلى 45 م³',
     30, 45,
     4.0000, 0.00,
     '2018-01-01', NULL, true),

    -- Tier 4: 46 – 60 m³/month @ 6.00 SAR/m³
    ('water', 'residential',
     'شريحة المياه الرابعة — 46 إلى 60 م³',
     45, 60,
     6.0000, 0.00,
     '2018-01-01', NULL, true),

    -- Tier 5: > 60 m³/month @ 9.00 SAR/m³ (open-ended — max_consumption NULL)
    ('water', 'residential',
     'شريحة المياه الخامسة — أكثر من 60 م³',
     60, NULL,
     9.0000, 0.00,
     '2018-01-01', NULL, true);

  RAISE NOTICE 'tariffs seed complete: 2 electricity tiers + 5 water tiers inserted.';
END;
$$;
