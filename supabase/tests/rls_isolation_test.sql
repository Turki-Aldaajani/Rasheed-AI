-- ============================================================================
-- Rasheed AI — RLS Isolation Test
-- ============================================================================
--
-- PURPOSE:
--   Verify that Row Level Security correctly isolates user data:
--     1. User A can see ONLY their own data (not User B's)
--     2. User B can see ONLY their own data (not User A's)
--     3. Both users can read tariff reference data
--     4. Neither user can insert, update, or delete tariff data
--
-- REQUIREMENTS:
--   • A running Supabase local instance (supabase start)
--   • The migration 00001_create_schema.sql must be applied first
--   • The auth schema and auth.uid() function must exist
--
-- HOW TO RUN:
--   supabase start
--   supabase db reset          # applies migrations
--   psql "$(supabase status | grep 'DB URL' | awk '{print $NF}')" \
--        -f supabase/tests/rls_isolation_test.sql
--
-- The entire test runs inside a transaction and rolls back at the end,
-- leaving the database clean regardless of pass/fail outcome.
--
-- IMPORTANT:
--   All data-access assertions execute as the `authenticated` Postgres role
--   with JWT claims set via request.jwt.claims — NOT as postgres, service_role,
--   or any role that can bypass RLS.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ============================================================================
-- SETUP: Insert test fixtures as superuser (postgres)
-- ============================================================================

-- Deterministic UUIDs for reproducibility
\set user_a_id  '\'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\''
\set user_b_id  '\'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb\''

-- Insert test users into auth.users
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES
  (:user_a_id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'user-a@test.rasheed.ai', crypt('testpass_a', gen_salt('bf')), now(), now(), now()),
  (:user_b_id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'user-b@test.rasheed.ai', crypt('testpass_b', gen_salt('bf')), now(), now(), now());

-- Create profiles (as superuser, bypassing RLS)
INSERT INTO public.users (id, display_name) VALUES
  (:user_a_id::uuid, 'User A — Test'),
  (:user_b_id::uuid, 'User B — Test');

-- Create households
INSERT INTO public.households (id, user_id, city, house_type, residents, ac_units) VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, :user_a_id::uuid, 'الرياض', 'فيلا', 6, 5),
  ('22222222-2222-2222-2222-222222222222'::uuid, :user_b_id::uuid, 'جدة',    'شقة',  4, 3);

-- Create bills
INSERT INTO public.bills (id, household_id, bill_type, amount_sar, period_label) VALUES
  ('aaaa1111-0000-0000-0000-000000000001'::uuid, '11111111-1111-1111-1111-111111111111'::uuid,
   'electricity', 620.00, 'يوليو ٢٠٢٥ — User A'),
  ('bbbb2222-0000-0000-0000-000000000002'::uuid, '22222222-2222-2222-2222-222222222222'::uuid,
   'electricity', 450.00, 'يوليو ٢٠٢٥ — User B');

-- Create bill readings
INSERT INTO public.bill_readings (id, bill_id, reading_type, consumption) VALUES
  ('aaaa1111-0000-0000-0000-000000000011'::uuid,
   'aaaa1111-0000-0000-0000-000000000001'::uuid, 'electricity_kwh', 2450.00),
  ('bbbb2222-0000-0000-0000-000000000022'::uuid,
   'bbbb2222-0000-0000-0000-000000000002'::uuid, 'electricity_kwh', 1800.00);

-- Create recommendations
INSERT INTO public.recommendations (id, household_id, category, title, estimated_saving_sar) VALUES
  ('aaaa1111-0000-0000-0000-000000000111'::uuid,
   '11111111-1111-1111-1111-111111111111'::uuid, 'acHours', 'توصية A', 75.00),
  ('bbbb2222-0000-0000-0000-000000000222'::uuid,
   '22222222-2222-2222-2222-222222222222'::uuid, 'acTemp',  'توصية B', 40.00);

-- Create simulations
INSERT INTO public.simulations (id, household_id, ac_hours, ac_temp, heater_hours, total_kwh, bill_sar, saving_sar) VALUES
  ('aaaa1111-0000-0000-0000-000000001111'::uuid,
   '11111111-1111-1111-1111-111111111111'::uuid, 14, 26, 4, 1908.00, 485.00, 135.00),
  ('bbbb2222-0000-0000-0000-000000002222'::uuid,
   '22222222-2222-2222-2222-222222222222'::uuid, 16, 25, 3, 1400.00, 360.00,  90.00);

-- Create tariff reference data (global, not user-owned)
INSERT INTO public.tariffs (id, utility_type, customer_category, name, min_consumption, max_consumption, sar_per_unit, fixed_fee_sar, effective_from) VALUES
  ('cccccccc-0000-0000-0000-000000000001'::uuid, 'electricity', 'residential',
   'Test Tier 1 (0–2000 kWh)', 0, 2000, 0.1800, 0, '2024-01-01'),
  ('cccccccc-0000-0000-0000-000000000002'::uuid, 'electricity', 'residential',
   'Test Tier 2 (2001–4000 kWh)', 2000, 4000, 0.3000, 0, '2024-01-01');

RAISE NOTICE '✅ Setup complete — test data inserted as superuser.';


-- ============================================================================
-- TEST GROUP 1: User A can see ONLY User A's data
-- ============================================================================

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';

DO $$
DECLARE
  row_count integer;
BEGIN
  RAISE NOTICE '--- Testing as User A ---';

  -- users: should see exactly 1 (own profile)
  SELECT count(*) INTO row_count FROM public.users;
  IF row_count != 1 THEN
    RAISE EXCEPTION 'FAIL [User A · users]: expected 1 row, got %', row_count;
  END IF;
  RAISE NOTICE 'PASS [User A · users]: sees 1 own profile';

  -- households: should see exactly 1
  SELECT count(*) INTO row_count FROM public.households;
  IF row_count != 1 THEN
    RAISE EXCEPTION 'FAIL [User A · households]: expected 1 row, got %', row_count;
  END IF;
  RAISE NOTICE 'PASS [User A · households]: sees 1 own household';

  -- bills: should see exactly 1
  SELECT count(*) INTO row_count FROM public.bills;
  IF row_count != 1 THEN
    RAISE EXCEPTION 'FAIL [User A · bills]: expected 1 row, got %', row_count;
  END IF;
  RAISE NOTICE 'PASS [User A · bills]: sees 1 own bill';

  -- bill_readings: should see exactly 1
  SELECT count(*) INTO row_count FROM public.bill_readings;
  IF row_count != 1 THEN
    RAISE EXCEPTION 'FAIL [User A · bill_readings]: expected 1 row, got %', row_count;
  END IF;
  RAISE NOTICE 'PASS [User A · bill_readings]: sees 1 own reading';

  -- recommendations: should see exactly 1
  SELECT count(*) INTO row_count FROM public.recommendations;
  IF row_count != 1 THEN
    RAISE EXCEPTION 'FAIL [User A · recommendations]: expected 1 row, got %', row_count;
  END IF;
  RAISE NOTICE 'PASS [User A · recommendations]: sees 1 own recommendation';

  -- simulations: should see exactly 1
  SELECT count(*) INTO row_count FROM public.simulations;
  IF row_count != 1 THEN
    RAISE EXCEPTION 'FAIL [User A · simulations]: expected 1 row, got %', row_count;
  END IF;
  RAISE NOTICE 'PASS [User A · simulations]: sees 1 own simulation';

  -- tariffs: should see ALL reference data (2 tiers)
  SELECT count(*) INTO row_count FROM public.tariffs;
  IF row_count != 2 THEN
    RAISE EXCEPTION 'FAIL [User A · tariffs read]: expected 2 rows, got %', row_count;
  END IF;
  RAISE NOTICE 'PASS [User A · tariffs read]: sees 2 reference tariff tiers';
END;
$$;

-- Test: User A cannot INSERT into tariffs
DO $$
BEGIN
  INSERT INTO public.tariffs (utility_type, name, min_consumption, sar_per_unit, effective_from)
  VALUES ('electricity', 'Injected by User A', 0, 99.99, '2024-01-01');
  RAISE EXCEPTION 'FAIL [User A · tariffs insert]: should have been denied';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS [User A · tariffs insert]: correctly denied';
END;
$$;

-- Test: User A cannot UPDATE tariffs
DO $$
BEGIN
  UPDATE public.tariffs SET sar_per_unit = 0 WHERE id = 'cccccccc-0000-0000-0000-000000000001'::uuid;
  -- UPDATE with no matching RLS policy silently affects 0 rows, but still shouldn't succeed
  -- Check that no actual change occurred
  IF FOUND THEN
    RAISE EXCEPTION 'FAIL [User A · tariffs update]: should have been denied';
  END IF;
  RAISE NOTICE 'PASS [User A · tariffs update]: correctly denied (0 rows affected)';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS [User A · tariffs update]: correctly denied (exception)';
END;
$$;

-- Test: User A cannot DELETE tariffs
DO $$
BEGIN
  DELETE FROM public.tariffs WHERE id = 'cccccccc-0000-0000-0000-000000000001'::uuid;
  IF FOUND THEN
    RAISE EXCEPTION 'FAIL [User A · tariffs delete]: should have been denied';
  END IF;
  RAISE NOTICE 'PASS [User A · tariffs delete]: correctly denied (0 rows affected)';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS [User A · tariffs delete]: correctly denied (exception)';
END;
$$;

-- Test: User A cannot see User B's data by querying with known IDs
DO $$
DECLARE
  row_count integer;
BEGIN
  -- Try to read User B's household directly
  SELECT count(*) INTO row_count FROM public.households
   WHERE id = '22222222-2222-2222-2222-222222222222'::uuid;
  IF row_count != 0 THEN
    RAISE EXCEPTION 'FAIL [User A · cross-user households]: saw User B household';
  END IF;
  RAISE NOTICE 'PASS [User A · cross-user households]: cannot see User B household';

  -- Try to read User B's bill directly
  SELECT count(*) INTO row_count FROM public.bills
   WHERE id = 'bbbb2222-0000-0000-0000-000000000002'::uuid;
  IF row_count != 0 THEN
    RAISE EXCEPTION 'FAIL [User A · cross-user bills]: saw User B bill';
  END IF;
  RAISE NOTICE 'PASS [User A · cross-user bills]: cannot see User B bill';

  -- Try to read User B's bill reading directly
  SELECT count(*) INTO row_count FROM public.bill_readings
   WHERE id = 'bbbb2222-0000-0000-0000-000000000022'::uuid;
  IF row_count != 0 THEN
    RAISE EXCEPTION 'FAIL [User A · cross-user bill_readings]: saw User B reading';
  END IF;
  RAISE NOTICE 'PASS [User A · cross-user bill_readings]: cannot see User B reading';

  -- Try to read User B's recommendation directly
  SELECT count(*) INTO row_count FROM public.recommendations
   WHERE id = 'bbbb2222-0000-0000-0000-000000000222'::uuid;
  IF row_count != 0 THEN
    RAISE EXCEPTION 'FAIL [User A · cross-user recommendations]: saw User B recommendation';
  END IF;
  RAISE NOTICE 'PASS [User A · cross-user recommendations]: cannot see User B recommendation';

  -- Try to read User B's simulation directly
  SELECT count(*) INTO row_count FROM public.simulations
   WHERE id = 'bbbb2222-0000-0000-0000-000000002222'::uuid;
  IF row_count != 0 THEN
    RAISE EXCEPTION 'FAIL [User A · cross-user simulations]: saw User B simulation';
  END IF;
  RAISE NOTICE 'PASS [User A · cross-user simulations]: cannot see User B simulation';
END;
$$;


-- ============================================================================
-- TEST GROUP 2: User B can see ONLY User B's data
-- ============================================================================

RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';

DO $$
DECLARE
  row_count integer;
BEGIN
  RAISE NOTICE '--- Testing as User B ---';

  -- users: should see exactly 1 (own profile)
  SELECT count(*) INTO row_count FROM public.users;
  IF row_count != 1 THEN
    RAISE EXCEPTION 'FAIL [User B · users]: expected 1 row, got %', row_count;
  END IF;
  RAISE NOTICE 'PASS [User B · users]: sees 1 own profile';

  -- households: should see exactly 1
  SELECT count(*) INTO row_count FROM public.households;
  IF row_count != 1 THEN
    RAISE EXCEPTION 'FAIL [User B · households]: expected 1 row, got %', row_count;
  END IF;
  RAISE NOTICE 'PASS [User B · households]: sees 1 own household';

  -- bills: should see exactly 1
  SELECT count(*) INTO row_count FROM public.bills;
  IF row_count != 1 THEN
    RAISE EXCEPTION 'FAIL [User B · bills]: expected 1 row, got %', row_count;
  END IF;
  RAISE NOTICE 'PASS [User B · bills]: sees 1 own bill';

  -- bill_readings: should see exactly 1
  SELECT count(*) INTO row_count FROM public.bill_readings;
  IF row_count != 1 THEN
    RAISE EXCEPTION 'FAIL [User B · bill_readings]: expected 1 row, got %', row_count;
  END IF;
  RAISE NOTICE 'PASS [User B · bill_readings]: sees 1 own reading';

  -- recommendations: should see exactly 1
  SELECT count(*) INTO row_count FROM public.recommendations;
  IF row_count != 1 THEN
    RAISE EXCEPTION 'FAIL [User B · recommendations]: expected 1 row, got %', row_count;
  END IF;
  RAISE NOTICE 'PASS [User B · recommendations]: sees 1 own recommendation';

  -- simulations: should see exactly 1
  SELECT count(*) INTO row_count FROM public.simulations;
  IF row_count != 1 THEN
    RAISE EXCEPTION 'FAIL [User B · simulations]: expected 1 row, got %', row_count;
  END IF;
  RAISE NOTICE 'PASS [User B · simulations]: sees 1 own simulation';

  -- tariffs: should see ALL reference data (2 tiers)
  SELECT count(*) INTO row_count FROM public.tariffs;
  IF row_count != 2 THEN
    RAISE EXCEPTION 'FAIL [User B · tariffs read]: expected 2 rows, got %', row_count;
  END IF;
  RAISE NOTICE 'PASS [User B · tariffs read]: sees 2 reference tariff tiers';
END;
$$;

-- Test: User B cannot see User A's data
DO $$
DECLARE
  row_count integer;
BEGIN
  -- Try to read User A's household directly
  SELECT count(*) INTO row_count FROM public.households
   WHERE id = '11111111-1111-1111-1111-111111111111'::uuid;
  IF row_count != 0 THEN
    RAISE EXCEPTION 'FAIL [User B · cross-user households]: saw User A household';
  END IF;
  RAISE NOTICE 'PASS [User B · cross-user households]: cannot see User A household';

  -- Try to read User A's bill directly
  SELECT count(*) INTO row_count FROM public.bills
   WHERE id = 'aaaa1111-0000-0000-0000-000000000001'::uuid;
  IF row_count != 0 THEN
    RAISE EXCEPTION 'FAIL [User B · cross-user bills]: saw User A bill';
  END IF;
  RAISE NOTICE 'PASS [User B · cross-user bills]: cannot see User A bill';

  -- Try to read User A's bill reading directly
  SELECT count(*) INTO row_count FROM public.bill_readings
   WHERE id = 'aaaa1111-0000-0000-0000-000000000011'::uuid;
  IF row_count != 0 THEN
    RAISE EXCEPTION 'FAIL [User B · cross-user bill_readings]: saw User A reading';
  END IF;
  RAISE NOTICE 'PASS [User B · cross-user bill_readings]: cannot see User A reading';

  -- Try to read User A's recommendation directly
  SELECT count(*) INTO row_count FROM public.recommendations
   WHERE id = 'aaaa1111-0000-0000-0000-000000000111'::uuid;
  IF row_count != 0 THEN
    RAISE EXCEPTION 'FAIL [User B · cross-user recommendations]: saw User A recommendation';
  END IF;
  RAISE NOTICE 'PASS [User B · cross-user recommendations]: cannot see User A recommendation';

  -- Try to read User A's simulation directly
  SELECT count(*) INTO row_count FROM public.simulations
   WHERE id = 'aaaa1111-0000-0000-0000-000000001111'::uuid;
  IF row_count != 0 THEN
    RAISE EXCEPTION 'FAIL [User B · cross-user simulations]: saw User A simulation';
  END IF;
  RAISE NOTICE 'PASS [User B · cross-user simulations]: cannot see User A simulation';
END;
$$;

-- Test: User B cannot modify tariffs
DO $$
BEGIN
  INSERT INTO public.tariffs (utility_type, name, min_consumption, sar_per_unit, effective_from)
  VALUES ('water', 'Injected by User B', 0, 99.99, '2024-01-01');
  RAISE EXCEPTION 'FAIL [User B · tariffs insert]: should have been denied';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS [User B · tariffs insert]: correctly denied';
END;
$$;

DO $$
BEGIN
  DELETE FROM public.tariffs WHERE id = 'cccccccc-0000-0000-0000-000000000002'::uuid;
  IF FOUND THEN
    RAISE EXCEPTION 'FAIL [User B · tariffs delete]: should have been denied';
  END IF;
  RAISE NOTICE 'PASS [User B · tariffs delete]: correctly denied (0 rows affected)';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS [User B · tariffs delete]: correctly denied (exception)';
END;
$$;


-- ============================================================================
-- RESULT
-- ============================================================================

RESET ROLE;
RAISE NOTICE '';
RAISE NOTICE '============================================';
RAISE NOTICE '  ALL RLS ISOLATION TESTS PASSED ✅';
RAISE NOTICE '============================================';
RAISE NOTICE '';

-- Roll back all test data — leaves the database clean
ROLLBACK;
