-- ============================================================================
-- Rasheed AI — Database Migration
-- Migration: 00003_household_profile_fields.sql
-- Issue:     F19 · ملف المنزل للتخصيص
-- ============================================================================

ALTER TABLE public.households
  ADD COLUMN home_area_m2 numeric(10,2) CHECK (home_area_m2 > 0),
  ADD COLUMN ac_type text CHECK (ac_type IN ('split', 'window', 'central', 'other')),
  ADD COLUMN water_heater_type text CHECK (water_heater_type IN ('electric', 'solar', 'gas', 'other'));

COMMENT ON COLUMN public.households.home_area_m2 IS 'Home area in square meters.';
COMMENT ON COLUMN public.households.ac_type IS 'Primary type of air conditioning.';
COMMENT ON COLUMN public.households.water_heater_type IS 'Primary type of water heater.';
