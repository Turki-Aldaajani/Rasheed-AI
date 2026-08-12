-- ============================================================================
-- Rasheed AI — Gemini Usage & Cost Tracking Schema
-- Migration: 00005_gemini_usage_tracking.sql
-- Issue:     Q27 · حدود المعدل ومراقبة تكلفة Gemini
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gemini_usage_logs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  ip_address          text,
  endpoint            text        NOT NULL DEFAULT 'extract-invoice',
  model               text        NOT NULL DEFAULT 'gemini-3.5-flash',
  prompt_tokens       integer     NOT NULL DEFAULT 0,
  candidates_tokens   integer     NOT NULL DEFAULT 0,
  estimated_cost_usd  numeric(10,6) NOT NULL DEFAULT 0,
  status              text        NOT NULL CHECK (status IN ('success', 'rate_limited', 'error')),
  error_message       text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.gemini_usage_logs IS
  'Tracks Gemini API usage, rate limits, token counts, and estimated cost per call.';

-- Indexes for efficient rate limit window filtering
CREATE INDEX IF NOT EXISTS idx_gemini_usage_user_id_created_at
  ON public.gemini_usage_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gemini_usage_ip_created_at
  ON public.gemini_usage_logs (ip_address, created_at DESC);

-- Enable RLS
ALTER TABLE public.gemini_usage_logs ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read their own usage logs
CREATE POLICY "Users can view own Gemini usage logs"
  ON public.gemini_usage_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: allow authenticated users to insert usage logs
CREATE POLICY "Authenticated users can insert Gemini usage logs"
  ON public.gemini_usage_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Policy: allow anon users/service calls to insert usage logs
CREATE POLICY "Anon can insert Gemini usage logs"
  ON public.gemini_usage_logs
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);
