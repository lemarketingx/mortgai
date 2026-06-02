-- FINZO: Banker directory tables
-- Run after supabase-schema.sql (requires no FK dependencies on other tables).
-- Safe to run multiple times (all statements are idempotent).

-- ──────────────────────────────────────────────────────────────────────────────
-- advisor_bankers: per-advisor address book of bank contacts
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS advisor_bankers (
  id           TEXT        PRIMARY KEY,
  advisor_id   TEXT        NOT NULL,
  bank_name    TEXT        NOT NULL DEFAULT '',
  branch_name  TEXT        NOT NULL DEFAULT '',
  region       TEXT        NOT NULL DEFAULT '',
  banker_name  TEXT        NOT NULL DEFAULT '',
  phone        TEXT        NOT NULL DEFAULT '',
  email        TEXT        NOT NULL DEFAULT '',
  role_title   TEXT        NOT NULL DEFAULT '',
  specialties  TEXT        NOT NULL DEFAULT '',
  notes        TEXT        NOT NULL DEFAULT '',
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS advisor_bankers_advisor_idx
  ON advisor_bankers (advisor_id);

CREATE INDEX IF NOT EXISTS advisor_bankers_bank_idx
  ON advisor_bankers (advisor_id, bank_name);

ALTER TABLE advisor_bankers ENABLE ROW LEVEL SECURITY;


-- ──────────────────────────────────────────────────────────────────────────────
-- case_bankers: bankers assigned to a specific lead/case
-- Stores snapshots of name/email/phone at assignment time so history is
-- stable even if the advisor_bankers record later changes.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS case_bankers (
  id                    TEXT        PRIMARY KEY,
  lead_id               TEXT        NOT NULL,
  advisor_id            TEXT        NOT NULL,
  banker_id             TEXT        NOT NULL,
  bank_name_snapshot    TEXT        NOT NULL DEFAULT '',
  banker_name_snapshot  TEXT        NOT NULL DEFAULT '',
  email_snapshot        TEXT        NOT NULL DEFAULT '',
  phone_snapshot        TEXT        NOT NULL DEFAULT '',
  status                TEXT        NOT NULL DEFAULT 'selected',
  sent_at               TIMESTAMPTZ,
  last_contacted_at     TIMESTAMPTZ,
  notes                 TEXT        NOT NULL DEFAULT '',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS case_bankers_lead_idx
  ON case_bankers (lead_id, advisor_id);

CREATE INDEX IF NOT EXISTS case_bankers_advisor_idx
  ON case_bankers (advisor_id);

ALTER TABLE case_bankers ENABLE ROW LEVEL SECURITY;
