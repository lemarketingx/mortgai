-- MortgAI / FINZO — Supabase schema v2
-- Run this once in the Supabase SQL Editor.
-- All statements are idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- Safe to run against an existing database — no data is dropped or altered.

-- ──────────────────────────────────────────────────────────────────────────────
-- EXTENSION
-- ──────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ══════════════════════════════════════════════════════════════════════════════
-- LEADS TABLE
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS leads (
  id              TEXT PRIMARY KEY,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_updated    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Contact
  name            TEXT NOT NULL DEFAULT '',
  phone           TEXT NOT NULL DEFAULT '',
  city            TEXT NOT NULL DEFAULT '',

  -- Mortgage summary
  mortgage_amount NUMERIC      NOT NULL DEFAULT 0,
  purchase_status TEXT         NOT NULL DEFAULT '',
  approval_score  NUMERIC      NOT NULL DEFAULT 0,
  main_issue      TEXT         NOT NULL DEFAULT '',
  source          TEXT         NOT NULL DEFAULT 'mortgai2',
  status          TEXT         NOT NULL DEFAULT 'חדש',

  -- Advisor assignment
  assigned_advisor    TEXT NOT NULL DEFAULT '',
  advisor_phone       TEXT NOT NULL DEFAULT '',
  advisor_email       TEXT NOT NULL DEFAULT '',
  assigned_advisor_id TEXT NOT NULL DEFAULT '',

  -- CRM workflow
  lead_status       TEXT NOT NULL DEFAULT 'חדש',
  lead_quality      TEXT NOT NULL DEFAULT '',
  lead_priority     TEXT NOT NULL DEFAULT '',
  follow_up_date    TEXT NOT NULL DEFAULT '',
  follow_up_stage   TEXT NOT NULL DEFAULT 'לא טופל',
  last_contacted_at TEXT NOT NULL DEFAULT '',
  internal_notes    TEXT NOT NULL DEFAULT '',
  notes             TEXT NOT NULL DEFAULT '',

  -- Commission
  expected_commission  TEXT NOT NULL DEFAULT '',
  actual_commission    TEXT NOT NULL DEFAULT '',
  commission_status    TEXT NOT NULL DEFAULT 'pending',
  commission_agreement TEXT NOT NULL DEFAULT '',
  commission_amount    TEXT NOT NULL DEFAULT '',

  -- UTM / attribution
  utm_source   TEXT NOT NULL DEFAULT '',
  utm_medium   TEXT NOT NULL DEFAULT '',
  utm_campaign TEXT NOT NULL DEFAULT '',
  utm_content  TEXT NOT NULL DEFAULT '',
  utm_term     TEXT NOT NULL DEFAULT '',
  referrer     TEXT NOT NULL DEFAULT '',
  landing_page TEXT NOT NULL DEFAULT '',

  -- Financial profile
  estimated_approval_result NUMERIC,
  estimated_payment         NUMERIC,
  property_price            NUMERIC,
  equity_amount             NUMERIC,
  monthly_income            NUMERIC,
  debt_level                NUMERIC,

  -- Qualification fields
  employment_status      TEXT NOT NULL DEFAULT '',
  has_existing_mortgage  TEXT NOT NULL DEFAULT '',
  contract_status        TEXT NOT NULL DEFAULT '',
  property_city          TEXT NOT NULL DEFAULT '',
  requested_contact_time TEXT NOT NULL DEFAULT '',

  -- Lead marketplace / store
  store_status     TEXT    NOT NULL DEFAULT 'available',
  store_price      NUMERIC NOT NULL DEFAULT 0,
  exclusive_price  NUMERIC NOT NULL DEFAULT 0,
  preview_summary  TEXT    NOT NULL DEFAULT '',
  sold_at          TEXT    NOT NULL DEFAULT '',
  buyer_advisor_id TEXT    NOT NULL DEFAULT ''
);

-- Safe migration: add any column that may be missing from an older schema
ALTER TABLE leads ADD COLUMN IF NOT EXISTS advisor_email           TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_advisor_id    TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_status            TEXT NOT NULL DEFAULT 'חדש';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_quality           TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_priority          TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_date         TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_stage        TEXT NOT NULL DEFAULT 'לא טופל';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contacted_at      TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS internal_notes         TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS commission_amount      TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS commission_agreement   TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_source             TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_medium             TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_campaign           TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_content            TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_term               TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referrer               TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS landing_page           TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS estimated_approval_result NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS estimated_payment      NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS property_price         NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS equity_amount          NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS monthly_income         NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS debt_level             NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS employment_status      TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS has_existing_mortgage  TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contract_status        TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS property_city          TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS requested_contact_time TEXT NOT NULL DEFAULT '';
-- Marketplace columns (added in v2)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS store_status     TEXT    NOT NULL DEFAULT 'available';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS store_price      NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS exclusive_price  NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS preview_summary  TEXT    NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sold_at          TEXT    NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS buyer_advisor_id TEXT    NOT NULL DEFAULT '';

-- ── FINZO Lead Score v2 columns (safe migration) ─────────────────────────────
-- New fields added for score-based pricing. All idempotent.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email                    TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS monthly_obligations      NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS desired_monthly_payment  NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS process_stage            TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS consent_advisor_contact  BOOLEAN NOT NULL DEFAULT FALSE;
-- Lead Score fields
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score               INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score_tier          TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score_breakdown     JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS price_at_creation        INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score_version            TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_sellable              BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS quality_notes            TEXT NOT NULL DEFAULT '';
-- Ensure UTM/source columns exist (in case of older schema)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source        TEXT NOT NULL DEFAULT 'mortgai2';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_source    TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_medium    TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_campaign  TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_content   TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_term      TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referrer      TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS landing_page  TEXT NOT NULL DEFAULT '';

-- Indexes
CREATE INDEX IF NOT EXISTS leads_created_at_idx   ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_status_idx        ON leads (lead_status);
CREATE INDEX IF NOT EXISTS leads_phone_idx         ON leads (phone);
CREATE INDEX IF NOT EXISTS leads_quality_idx       ON leads (lead_quality);
CREATE INDEX IF NOT EXISTS leads_store_status_idx  ON leads (store_status);
CREATE INDEX IF NOT EXISTS leads_buyer_advisor_idx ON leads (buyer_advisor_id);
CREATE INDEX IF NOT EXISTS leads_lead_score_idx    ON leads (lead_score DESC);
CREATE INDEX IF NOT EXISTS leads_is_sellable_idx   ON leads (is_sellable);
CREATE INDEX IF NOT EXISTS leads_score_tier_idx    ON leads (lead_score_tier);

-- Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;


-- ══════════════════════════════════════════════════════════════════════════════
-- ADVISORS TABLE
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS advisors (
  advisor_id        TEXT PRIMARY KEY,
  auth_user_id      TEXT NOT NULL DEFAULT '',  -- Supabase Auth user.id
  name              TEXT NOT NULL DEFAULT '',
  phone             TEXT NOT NULL DEFAULT '',
  email             TEXT NOT NULL DEFAULT '',
  active            BOOLEAN NOT NULL DEFAULT true,
  commission_type   TEXT NOT NULL DEFAULT '',
  commission_amount TEXT NOT NULL DEFAULT '',
  region            TEXT NOT NULL DEFAULT '',
  advisor_type      TEXT NOT NULL DEFAULT '',
  business_name     TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe migration: add any column that may be missing from an older schema
ALTER TABLE advisors ADD COLUMN IF NOT EXISTS auth_user_id      TEXT NOT NULL DEFAULT '';
ALTER TABLE advisors ADD COLUMN IF NOT EXISTS region            TEXT NOT NULL DEFAULT '';
ALTER TABLE advisors ADD COLUMN IF NOT EXISTS advisor_type      TEXT NOT NULL DEFAULT '';
ALTER TABLE advisors ADD COLUMN IF NOT EXISTS business_name     TEXT NOT NULL DEFAULT '';

-- Indexes
CREATE INDEX IF NOT EXISTS advisors_email_idx        ON advisors (email);
CREATE INDEX IF NOT EXISTS advisors_auth_user_id_idx ON advisors (auth_user_id);

-- Row Level Security
ALTER TABLE advisors ENABLE ROW LEVEL SECURITY;


-- ══════════════════════════════════════════════════════════════════════════════
-- LEAD PURCHASES TABLE
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lead_purchases (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lead_id       TEXT        NOT NULL,
  advisor_id    TEXT        NOT NULL,
  purchase_type TEXT        NOT NULL DEFAULT 'regular',  -- 'regular' | 'exclusive'
  price         NUMERIC     NOT NULL DEFAULT 0,
  is_exclusive  BOOLEAN     NOT NULL DEFAULT false,
  purchased_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS lead_purchases_advisor_idx  ON lead_purchases (advisor_id);
CREATE INDEX IF NOT EXISTS lead_purchases_lead_idx     ON lead_purchases (lead_id);
CREATE INDEX IF NOT EXISTS lead_purchases_purchased_idx ON lead_purchases (purchased_at DESC);

-- Row Level Security
ALTER TABLE lead_purchases ENABLE ROW LEVEL SECURITY;


-- ══════════════════════════════════════════════════════════════════════════════
-- LEAD DOCUMENTS TABLE  (extended for client upload portal)
-- ══════════════════════════════════════════════════════════════════════════════
-- Core table — created by activitiesStore.js logic. These ALTER statements add
-- file-upload columns that may be missing from an older schema.
ALTER TABLE lead_documents ADD COLUMN IF NOT EXISTS storage_path  TEXT;
ALTER TABLE lead_documents ADD COLUMN IF NOT EXISTS file_name     TEXT;
ALTER TABLE lead_documents ADD COLUMN IF NOT EXISTS file_size     INTEGER;
ALTER TABLE lead_documents ADD COLUMN IF NOT EXISTS mime_type     TEXT;
ALTER TABLE lead_documents ADD COLUMN IF NOT EXISTS uploaded_by   TEXT NOT NULL DEFAULT 'advisor';
ALTER TABLE lead_documents ADD COLUMN IF NOT EXISTS uploaded_at   TIMESTAMPTZ;
ALTER TABLE lead_documents ADD COLUMN IF NOT EXISTS reviewed_at   TIMESTAMPTZ;
ALTER TABLE lead_documents ADD COLUMN IF NOT EXISTS review_note   TEXT;


-- ══════════════════════════════════════════════════════════════════════════════
-- DOCUMENT UPLOAD TOKENS TABLE
-- ══════════════════════════════════════════════════════════════════════════════
-- Secure tokens that give a client one-case upload access without exposing
-- lead IDs or requiring authentication.
CREATE TABLE IF NOT EXISTS document_upload_tokens (
  id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  token        TEXT        NOT NULL UNIQUE,
  lead_id      TEXT        NOT NULL,
  advisor_id   TEXT        NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS doc_upload_tokens_token_idx   ON document_upload_tokens (token);
CREATE INDEX IF NOT EXISTS doc_upload_tokens_lead_idx    ON document_upload_tokens (lead_id);
CREATE INDEX IF NOT EXISTS doc_upload_tokens_advisor_idx ON document_upload_tokens (advisor_id);

ALTER TABLE document_upload_tokens ENABLE ROW LEVEL SECURITY;


-- ══════════════════════════════════════════════════════════════════════════════
-- DOCUMENT REMINDERS TABLE
-- ══════════════════════════════════════════════════════════════════════════════
-- Tracks upload deadlines and reminder state per case.
-- Phase 1: manual send only (WhatsApp copy). Future: automated background job.
CREATE TABLE IF NOT EXISTS document_reminders (
  id                     TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lead_id                TEXT        NOT NULL,
  advisor_id             TEXT        NOT NULL,
  upload_token_id        TEXT,
  deadline_at            TIMESTAMPTZ,
  channel                TEXT        NOT NULL DEFAULT 'whatsapp',
  status                 TEXT        NOT NULL DEFAULT 'not_scheduled',
  missing_document_types JSONB,
  last_reminder_sent_at  TIMESTAMPTZ,
  reminder_count         INTEGER     NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at           TIMESTAMPTZ,
  cancelled_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS doc_reminders_lead_idx    ON document_reminders (lead_id);
CREATE INDEX IF NOT EXISTS doc_reminders_advisor_idx ON document_reminders (advisor_id);
CREATE INDEX IF NOT EXISTS doc_reminders_status_idx  ON document_reminders (status);

ALTER TABLE document_reminders ENABLE ROW LEVEL SECURITY;


-- ══════════════════════════════════════════════════════════════════════════════
-- ══════════════════════════════════════════════════════════════════════════════
-- ADVISOR PROFILES TABLE
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS advisor_profiles (
  advisor_id   TEXT PRIMARY KEY,
  name         TEXT NOT NULL DEFAULT '',
  phone        TEXT NOT NULL DEFAULT '',
  email        TEXT NOT NULL DEFAULT '',
  city         TEXT NOT NULL DEFAULT '',
  license      TEXT NOT NULL DEFAULT '',
  bio          TEXT NOT NULL DEFAULT '',
  specialties  JSONB NOT NULL DEFAULT '[]'::JSONB,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- ADVISOR NOTIFICATION PREFERENCES TABLE
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS advisor_notification_prefs (
  advisor_id        TEXT PRIMARY KEY,
  overdue_alert     BOOLEAN NOT NULL DEFAULT FALSE,
  daily_reminder    BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_new_lead BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SUPABASE STORAGE  (manual step — cannot be done via SQL)
-- ══════════════════════════════════════════════════════════════════════════════
-- Create a PRIVATE bucket named: mortgage-documents
--
-- Steps in the Supabase dashboard:
--   Storage → New bucket
--   Name:   mortgage-documents
--   Public: OFF  (private)
--   Save
--
-- No SQL needed for bucket creation.
