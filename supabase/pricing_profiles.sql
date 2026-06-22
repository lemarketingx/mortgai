-- advisor_pricing_profiles: stores per-advisor commission pricing model
CREATE TABLE IF NOT EXISTS public.advisor_pricing_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id          TEXT NOT NULL UNIQUE,
  pricing_model       TEXT NOT NULL DEFAULT 'percent'
                        CHECK (pricing_model IN ('fixed', 'percent', 'hybrid', 'by_lead_type')),
  fixed_fee           NUMERIC NOT NULL DEFAULT 0,
  percent_fee         NUMERIC NOT NULL DEFAULT 0,
  hybrid_base_fee     NUMERIC NOT NULL DEFAULT 0,
  hybrid_percent_fee  NUMERIC NOT NULL DEFAULT 0,
  lead_type_rules     JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricing_profiles_advisor_id
  ON public.advisor_pricing_profiles (advisor_id);

-- Safe migration: add columns if table already exists from older version
ALTER TABLE public.advisor_pricing_profiles
  ADD COLUMN IF NOT EXISTS hybrid_base_fee    NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hybrid_percent_fee NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_type_rules    JSONB NOT NULL DEFAULT '{}';

-- Enable RLS
ALTER TABLE public.advisor_pricing_profiles ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY IF NOT EXISTS "service_role_full_access"
  ON public.advisor_pricing_profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);
