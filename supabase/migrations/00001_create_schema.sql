-- ============================================================================
-- Rasheed AI — Initial Database Schema
-- Migration: 00001_create_schema.sql
-- Issue:     G1 · سكيما Supabase (بوابة)
-- ============================================================================
--
-- Creates the foundational 7 tables for the Rasheed product:
--   1. users            — Profile data extending auth.users
--   2. households       — Household profiles (1:N per user)
--   3. bills            — Electricity and water bills
--   4. bill_readings    — Per-bill consumption readings
--   5. tariffs          — Reference tariff tiers (global, read-only)
--   6. recommendations  — Personalized saving recommendations
--   7. simulations      — "What-if" simulation result snapshots
--
-- Design principles:
--   • Row Level Security on every table with user-owned data.
--   • Ownership enforced via auth.uid() through user → household chain.
--   • SECURITY DEFINER helpers to avoid nested RLS in policy subqueries.
--   • Tariffs use a tiered model (min/max consumption ranges).
--   • Explicit TO authenticated on all policies.
--   • Safe to apply to a fresh database.
-- ============================================================================


-- ============================================================================
-- SECTION 1: Utility functions
-- ============================================================================

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ============================================================================
-- SECTION 2: Table definitions
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. users — Profile table extending auth.users
-- --------------------------------------------------------------------------
-- Links 1:1 with auth.users via the same UUID primary key.
-- Does NOT store authentication secrets (email, password, etc.) —
-- those live exclusively in auth.users.

CREATE TABLE public.users (
  id            uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  text,
  avatar_url    text,
  locale        text        NOT NULL DEFAULT 'ar-SA',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.users IS
  'User profile data. Links 1:1 to auth.users via shared PK. Does not store auth secrets.';

-- --------------------------------------------------------------------------
-- 2. households — Household profiles (1:N per user)
-- --------------------------------------------------------------------------
-- One authenticated user may own multiple households.
-- This table is the ownership root for bills, recommendations, and simulations.

CREATE TABLE public.households (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  city        text,
  region      text,
  house_type  text,
  residents   integer     CHECK (residents > 0),
  ac_units    integer     CHECK (ac_units >= 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.households IS
  'Household profiles. One user can own multiple households (1:N). Ownership root for downstream data.';

-- --------------------------------------------------------------------------
-- 3. bills — Electricity and water bills
-- --------------------------------------------------------------------------

CREATE TABLE public.bills (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id      uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  bill_type         text        NOT NULL CHECK (bill_type IN ('electricity', 'water')),
  amount_sar        numeric(10,2) NOT NULL,
  period_start      date,
  period_end        date,
  period_label      text,
  meter_number      text,
  invoice_image_url text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bills IS
  'Electricity and water bills linked to a household.';

-- --------------------------------------------------------------------------
-- 4. bill_readings — Per-bill consumption readings
-- --------------------------------------------------------------------------

CREATE TABLE public.bill_readings (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id               uuid          NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  reading_type          text          NOT NULL CHECK (reading_type IN ('electricity_kwh', 'water_m3')),
  consumption           numeric(12,2) NOT NULL,
  previous_consumption  numeric(12,2),
  previous_amount_sar   numeric(10,2),
  created_at            timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bill_readings IS
  'Per-bill consumption readings (kWh or m³) with optional previous-period comparison data.';

-- --------------------------------------------------------------------------
-- 5. tariffs — Reference tariff tiers (global, read-only)
-- --------------------------------------------------------------------------
-- Supports tiered pricing: multiple rows per utility_type/customer_category
-- represent consumption bands (e.g. 0–2000 kWh @ rate A, 2001–4000 kWh @ rate B).
--
-- max_consumption is NULL for the open-ended top tier.
-- Issue #13 will populate official Saudi tariff tier data.

CREATE TABLE public.tariffs (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  utility_type        text          NOT NULL CHECK (utility_type IN ('electricity', 'water')),
  customer_category   text          NOT NULL DEFAULT 'residential',
  name                text          NOT NULL,
  min_consumption     numeric(12,2) NOT NULL CHECK (min_consumption >= 0),
  max_consumption     numeric(12,2) CHECK (max_consumption IS NULL OR max_consumption > min_consumption),
  sar_per_unit        numeric(8,4)  NOT NULL CHECK (sar_per_unit >= 0),
  fixed_fee_sar       numeric(8,2)  NOT NULL DEFAULT 0,
  effective_from      date          NOT NULL,
  effective_to        date,
  is_active           boolean       NOT NULL DEFAULT true,
  created_at          timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tariffs IS
  'Reference tariff tiers. Global read-only data for authenticated users. Supports tiered pricing via min/max consumption ranges. Managed by service_role/admin only.';

-- --------------------------------------------------------------------------
-- 6. recommendations — Personalized saving recommendations
-- --------------------------------------------------------------------------

CREATE TABLE public.recommendations (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id          uuid          NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  bill_id               uuid          REFERENCES public.bills(id) ON DELETE SET NULL,
  category              text          NOT NULL,
  title                 text          NOT NULL,
  description           text,
  detail                text,
  setting_from          text,
  setting_to            text,
  estimated_saving_sar  numeric(10,2),
  is_applied            boolean       NOT NULL DEFAULT false,
  created_at            timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.recommendations IS
  'Personalized energy/water saving recommendations per household.';

-- --------------------------------------------------------------------------
-- 7. simulations — "What-if" simulation result snapshots
-- --------------------------------------------------------------------------

CREATE TABLE public.simulations (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id      uuid          NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  bill_id           uuid          REFERENCES public.bills(id) ON DELETE SET NULL,
  ac_hours          numeric(4,1)  NOT NULL,
  ac_temp           numeric(4,1)  NOT NULL,
  heater_hours      numeric(4,1)  NOT NULL,
  cooling_kwh       numeric(10,2),
  water_heating_kwh numeric(10,2),
  baseload_kwh      numeric(10,2),
  total_kwh         numeric(10,2),
  bill_sar          numeric(10,2),
  saving_sar        numeric(10,2),
  saving_percent    numeric(5,2),
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.simulations IS
  '"What-if" simulation result snapshots storing inputs and computed outputs.';


-- ============================================================================
-- SECTION 3: Indexes
-- ============================================================================

CREATE INDEX idx_households_user_id
  ON public.households(user_id);

CREATE INDEX idx_bills_household_id
  ON public.bills(household_id);

CREATE INDEX idx_bills_household_type_period
  ON public.bills(household_id, bill_type, period_start);

CREATE INDEX idx_bill_readings_bill_id
  ON public.bill_readings(bill_id);

CREATE INDEX idx_tariffs_utility_active
  ON public.tariffs(utility_type, customer_category, is_active);

CREATE INDEX idx_recommendations_household_id
  ON public.recommendations(household_id);

CREATE INDEX idx_simulations_household_id
  ON public.simulations(household_id);


-- ============================================================================
-- SECTION 4: Triggers
-- ============================================================================

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER households_updated_at
  BEFORE UPDATE ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================================
-- SECTION 5: Private schema + ownership helper functions (SECURITY DEFINER)
-- ============================================================================
-- Helper functions live in the `private` schema — NOT in the API-exposed
-- `public` schema. This prevents direct invocation via the PostgREST/Data API.
--
-- These functions resolve the user → household → bill ownership chain
-- while bypassing RLS on intermediate tables. This avoids nested/recursive
-- RLS policy evaluation and improves performance.
--
-- Security measures on each function:
--   • SECURITY DEFINER: runs as the function owner (postgres), bypassing RLS.
--   • SET search_path = '': empty path prevents search_path injection attacks.
--   • All object references fully qualified (public.households, auth.uid()).
--   • STABLE: no side effects, safe for use in RLS policies.
--   • EXECUTE revoked from PUBLIC and anon; granted only to authenticated.
--   • Functions accept no caller-supplied user ID — ownership always derived
--     from auth.uid().

CREATE SCHEMA IF NOT EXISTS private;

-- Lock down the private schema: no default access.
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
-- authenticated needs USAGE to call the helpers from RLS policy evaluation.
GRANT USAGE ON SCHEMA private TO authenticated;

-- ··········································································
-- private.get_user_household_ids()
-- ··········································································

CREATE FUNCTION private.get_user_household_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.households WHERE user_id = auth.uid();
$$;

COMMENT ON FUNCTION private.get_user_household_ids() IS
  'Returns household IDs owned by the current authenticated user. Lives in private schema to avoid Data API exposure. SECURITY DEFINER to bypass intermediate RLS.';

REVOKE EXECUTE ON FUNCTION private.get_user_household_ids() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.get_user_household_ids() FROM anon;
GRANT  EXECUTE ON FUNCTION private.get_user_household_ids() TO authenticated;

-- ··········································································
-- private.get_user_bill_ids()
-- ··········································································

CREATE FUNCTION private.get_user_bill_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT b.id
    FROM public.bills b
   INNER JOIN public.households h ON h.id = b.household_id
   WHERE h.user_id = auth.uid();
$$;

COMMENT ON FUNCTION private.get_user_bill_ids() IS
  'Returns bill IDs belonging to households owned by the current authenticated user. Lives in private schema to avoid Data API exposure. SECURITY DEFINER to bypass intermediate RLS.';

REVOKE EXECUTE ON FUNCTION private.get_user_bill_ids() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.get_user_bill_ids() FROM anon;
GRANT  EXECUTE ON FUNCTION private.get_user_bill_ids() TO authenticated;


-- ============================================================================
-- SECTION 6: Row Level Security — Enable + Policies
-- ============================================================================

-- --------------------------------------------------------------------------
-- users
-- --------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY users_insert ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- WITH CHECK prevents changing id to another user's UUID.
CREATE POLICY users_update ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- No DELETE policy: profile rows cascade-delete when auth.users row is removed.

-- --------------------------------------------------------------------------
-- households
-- --------------------------------------------------------------------------
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

CREATE POLICY households_select ON public.households
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY households_insert ON public.households
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- WITH CHECK on both clauses prevents re-assigning household to another user.
CREATE POLICY households_update ON public.households
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY households_delete ON public.households
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- --------------------------------------------------------------------------
-- bills
-- --------------------------------------------------------------------------
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY bills_select ON public.bills
  FOR SELECT TO authenticated
  USING (household_id IN (SELECT private.get_user_household_ids()));

-- WITH CHECK ensures you can only insert bills into your own households.
CREATE POLICY bills_insert ON public.bills
  FOR INSERT TO authenticated
  WITH CHECK (household_id IN (SELECT private.get_user_household_ids()));

-- WITH CHECK on UPDATE prevents moving a bill to another user's household.
CREATE POLICY bills_update ON public.bills
  FOR UPDATE TO authenticated
  USING (household_id IN (SELECT private.get_user_household_ids()))
  WITH CHECK (household_id IN (SELECT private.get_user_household_ids()));

CREATE POLICY bills_delete ON public.bills
  FOR DELETE TO authenticated
  USING (household_id IN (SELECT private.get_user_household_ids()));

-- --------------------------------------------------------------------------
-- bill_readings
-- --------------------------------------------------------------------------
ALTER TABLE public.bill_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY bill_readings_select ON public.bill_readings
  FOR SELECT TO authenticated
  USING (bill_id IN (SELECT private.get_user_bill_ids()));

CREATE POLICY bill_readings_insert ON public.bill_readings
  FOR INSERT TO authenticated
  WITH CHECK (bill_id IN (SELECT private.get_user_bill_ids()));

-- WITH CHECK on UPDATE prevents moving a reading to another user's bill.
CREATE POLICY bill_readings_update ON public.bill_readings
  FOR UPDATE TO authenticated
  USING (bill_id IN (SELECT private.get_user_bill_ids()))
  WITH CHECK (bill_id IN (SELECT private.get_user_bill_ids()));

CREATE POLICY bill_readings_delete ON public.bill_readings
  FOR DELETE TO authenticated
  USING (bill_id IN (SELECT private.get_user_bill_ids()));

-- --------------------------------------------------------------------------
-- tariffs — Global read-only for authenticated users
-- --------------------------------------------------------------------------
ALTER TABLE public.tariffs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all tariff tiers.
CREATE POLICY tariffs_select ON public.tariffs
  FOR SELECT TO authenticated
  USING (true);

-- No INSERT, UPDATE, or DELETE policies for the authenticated role.
-- Tariff data is managed exclusively via service_role or direct admin access.

-- --------------------------------------------------------------------------
-- recommendations
-- --------------------------------------------------------------------------
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY recommendations_select ON public.recommendations
  FOR SELECT TO authenticated
  USING (household_id IN (SELECT private.get_user_household_ids()));

CREATE POLICY recommendations_insert ON public.recommendations
  FOR INSERT TO authenticated
  WITH CHECK (household_id IN (SELECT private.get_user_household_ids()));

CREATE POLICY recommendations_update ON public.recommendations
  FOR UPDATE TO authenticated
  USING (household_id IN (SELECT private.get_user_household_ids()))
  WITH CHECK (household_id IN (SELECT private.get_user_household_ids()));

CREATE POLICY recommendations_delete ON public.recommendations
  FOR DELETE TO authenticated
  USING (household_id IN (SELECT private.get_user_household_ids()));

-- --------------------------------------------------------------------------
-- simulations
-- --------------------------------------------------------------------------
ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY simulations_select ON public.simulations
  FOR SELECT TO authenticated
  USING (household_id IN (SELECT private.get_user_household_ids()));

CREATE POLICY simulations_insert ON public.simulations
  FOR INSERT TO authenticated
  WITH CHECK (household_id IN (SELECT private.get_user_household_ids()));

CREATE POLICY simulations_update ON public.simulations
  FOR UPDATE TO authenticated
  USING (household_id IN (SELECT private.get_user_household_ids()))
  WITH CHECK (household_id IN (SELECT private.get_user_household_ids()));

CREATE POLICY simulations_delete ON public.simulations
  FOR DELETE TO authenticated
  USING (household_id IN (SELECT private.get_user_household_ids()));


-- ============================================================================
-- SECTION 7: Grants
-- ============================================================================
-- Explicit grants for the authenticated role. Supabase may provide default
-- grants, but being explicit ensures the migration is self-contained.

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE    ON public.users           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.households       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bills             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bill_readings     TO authenticated;
GRANT SELECT                         ON public.tariffs           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommendations   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.simulations       TO authenticated;

-- Helper function grants (private.get_user_household_ids, private.get_user_bill_ids)
-- are managed in Section 5 alongside their REVOKE statements.

GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO authenticated;
