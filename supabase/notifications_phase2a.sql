-- PHASE 2A: Advisor Notifications
-- Persistent notification system with RLS

CREATE TABLE IF NOT EXISTS public.advisor_notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id      TEXT NOT NULL,
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  message         TEXT NOT NULL DEFAULT '',
  entity_type     TEXT,
  entity_id       TEXT,
  priority        TEXT NOT NULL DEFAULT 'normal',
  is_read         BOOLEAN NOT NULL DEFAULT false,
  read_at         TIMESTAMPTZ,
  dedupe_key      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_advisor_id
  ON public.advisor_notifications (advisor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read
  ON public.advisor_notifications (advisor_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON public.advisor_notifications (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe
  ON public.advisor_notifications (advisor_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- Safe migration for existing tables
ALTER TABLE public.advisor_notifications
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

-- RLS
ALTER TABLE public.advisor_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "advisors_read_own_notifications"
  ON public.advisor_notifications
  FOR SELECT
  USING (advisor_id = current_setting('request.jwt.claim.sub', true));

CREATE POLICY "advisors_update_own_notifications"
  ON public.advisor_notifications
  FOR UPDATE
  USING (advisor_id = current_setting('request.jwt.claim.sub', true))
  WITH CHECK (advisor_id = current_setting('request.jwt.claim.sub', true));

-- Service role bypass (for server-side inserts)
CREATE POLICY "service_role_all_notifications"
  ON public.advisor_notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
