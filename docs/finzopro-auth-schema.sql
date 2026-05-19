-- FINZO PRO — Supabase Auth integration schema
-- Run these migrations on your Supabase project (SQL Editor)

-- New columns on the advisors table for Supabase Auth + profile fields
ALTER TABLE public.advisors ADD COLUMN IF NOT EXISTS auth_user_id text DEFAULT '';
ALTER TABLE public.advisors ADD COLUMN IF NOT EXISTS region text DEFAULT '';
ALTER TABLE public.advisors ADD COLUMN IF NOT EXISTS advisor_type text DEFAULT '';
ALTER TABLE public.advisors ADD COLUMN IF NOT EXISTS business_name text DEFAULT '';

-- Optional: index for fast auth_user_id lookup on login
CREATE INDEX IF NOT EXISTS advisors_auth_user_id_idx ON public.advisors (auth_user_id);

-- No advisor_applications table needed — instant-access SaaS model, no manual approval.
