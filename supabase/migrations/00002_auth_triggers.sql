-- ============================================================================
-- Rasheed AI — Auth Triggers
-- Migration: 00002_auth_triggers.sql
-- Issue:     Issue #6 (Auth)
-- ============================================================================
-- Creates a trigger on auth.users to automatically provision a profile 
-- row in public.users on sign up. Idempotent and secure.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, display_name, avatar_url, locale)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'locale', 'ar-SA')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a user profile upon sign up.';

-- The trigger attaches to the Supabase auth schema.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
