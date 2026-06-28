-- FINZO PRO Monetization & Automation Layer
-- Run once in Supabase SQL editor or via supabase db push
-- All statements are idempotent (safe to run multiple times)

-- ============================================================================
-- 1. advisor_notifications – per-advisor notification inbox
-- ============================================================================

create table if not exists public.advisor_notifications (
  id            uuid        primary key default gen_random_uuid(),
  advisor_id    text        not null,
  type          text        not null,
  title         text        not null,
  body          text        default '',
  lead_id       text,
  metadata      jsonb       default '{}'::jsonb,
  is_read       boolean     not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists idx_advisor_notifications_advisor
  on public.advisor_notifications (advisor_id);
create index if not exists idx_advisor_notifications_unread
  on public.advisor_notifications (advisor_id, is_read);
create index if not exists idx_advisor_notifications_created
  on public.advisor_notifications (created_at desc);

alter table public.advisor_notifications enable row level security;

-- ============================================================================
-- 2. advisor_calendar_events – calendar / scheduling
-- ============================================================================

create table if not exists public.advisor_calendar_events (
  id            uuid        primary key default gen_random_uuid(),
  advisor_id    text        not null,
  lead_id       text,
  title         text        not null,
  description   text        default '',
  event_type    text        not null default 'general',
  start_at      timestamptz not null,
  end_at        timestamptz,
  all_day       boolean     not null default false,
  source        text        default 'manual',
  source_id     text,
  color         text        default 'violet',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_advisor_calendar_events_advisor_start
  on public.advisor_calendar_events (advisor_id, start_at);
create index if not exists idx_advisor_calendar_events_lead
  on public.advisor_calendar_events (lead_id);

alter table public.advisor_calendar_events enable row level security;

-- ============================================================================
-- 3. advisor_commissions – commission tracking per deal
-- ============================================================================

create table if not exists public.advisor_commissions (
  id                  uuid        primary key default gen_random_uuid(),
  advisor_id          text        not null,
  lead_id             text        not null,
  bank                text        default '',
  loan_amount         numeric     not null default 0,
  commission_percent  numeric     not null default 0,
  commission_amount   numeric     not null default 0,
  status              text        not null default 'pending',
  paid_at             timestamptz,
  notes               text        default '',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_advisor_commissions_advisor
  on public.advisor_commissions (advisor_id);
create index if not exists idx_advisor_commissions_lead
  on public.advisor_commissions (lead_id);
create index if not exists idx_advisor_commissions_status
  on public.advisor_commissions (status);
create index if not exists idx_advisor_commissions_advisor_status
  on public.advisor_commissions (advisor_id, status);

alter table public.advisor_commissions enable row level security;

-- ============================================================================
-- 4. advisor_alert_rules – configurable lead alert filters
-- ============================================================================

create table if not exists public.advisor_alert_rules (
  id                uuid        primary key default gen_random_uuid(),
  advisor_id        text        not null,
  rule_name         text        not null default '',
  is_active         boolean     not null default true,
  filter_city       text,
  filter_lead_type  text,
  filter_min_budget numeric,
  filter_max_budget numeric,
  filter_min_score  integer,
  filter_heat_level text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_advisor_alert_rules_advisor_active
  on public.advisor_alert_rules (advisor_id, is_active);

alter table public.advisor_alert_rules enable row level security;

-- ============================================================================
-- 5. workflow_automation_logs – audit trail for automated actions
-- ============================================================================

create table if not exists public.workflow_automation_logs (
  id            uuid        primary key default gen_random_uuid(),
  advisor_id    text,
  lead_id       text,
  rule_type     text        not null,
  trigger_value text        default '',
  action_taken  text        not null,
  metadata      jsonb       default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists idx_workflow_automation_logs_lead_created
  on public.workflow_automation_logs (lead_id, created_at desc);
create index if not exists idx_workflow_automation_logs_rule_type
  on public.workflow_automation_logs (rule_type);

alter table public.workflow_automation_logs enable row level security;

-- ============================================================================
-- RLS Policies
-- We use permissive policies because all access is via service role key.
-- The application layer enforces advisor_id filtering.
-- Policies exist so if we later switch to anon/user keys, RLS is ready.
-- ============================================================================

-- advisor_notifications
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'advisor_notifications' and policyname = 'advisor_notifications_select') then
    create policy "advisor_notifications_select" on public.advisor_notifications for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'advisor_notifications' and policyname = 'advisor_notifications_insert') then
    create policy "advisor_notifications_insert" on public.advisor_notifications for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'advisor_notifications' and policyname = 'advisor_notifications_update') then
    create policy "advisor_notifications_update" on public.advisor_notifications for update using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'advisor_notifications' and policyname = 'advisor_notifications_delete') then
    create policy "advisor_notifications_delete" on public.advisor_notifications for delete using (true);
  end if;
end $$;

-- advisor_calendar_events
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'advisor_calendar_events' and policyname = 'advisor_calendar_events_select') then
    create policy "advisor_calendar_events_select" on public.advisor_calendar_events for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'advisor_calendar_events' and policyname = 'advisor_calendar_events_insert') then
    create policy "advisor_calendar_events_insert" on public.advisor_calendar_events for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'advisor_calendar_events' and policyname = 'advisor_calendar_events_update') then
    create policy "advisor_calendar_events_update" on public.advisor_calendar_events for update using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'advisor_calendar_events' and policyname = 'advisor_calendar_events_delete') then
    create policy "advisor_calendar_events_delete" on public.advisor_calendar_events for delete using (true);
  end if;
end $$;

-- advisor_commissions
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'advisor_commissions' and policyname = 'advisor_commissions_select') then
    create policy "advisor_commissions_select" on public.advisor_commissions for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'advisor_commissions' and policyname = 'advisor_commissions_insert') then
    create policy "advisor_commissions_insert" on public.advisor_commissions for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'advisor_commissions' and policyname = 'advisor_commissions_update') then
    create policy "advisor_commissions_update" on public.advisor_commissions for update using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'advisor_commissions' and policyname = 'advisor_commissions_delete') then
    create policy "advisor_commissions_delete" on public.advisor_commissions for delete using (true);
  end if;
end $$;

-- advisor_alert_rules
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'advisor_alert_rules' and policyname = 'advisor_alert_rules_select') then
    create policy "advisor_alert_rules_select" on public.advisor_alert_rules for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'advisor_alert_rules' and policyname = 'advisor_alert_rules_insert') then
    create policy "advisor_alert_rules_insert" on public.advisor_alert_rules for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'advisor_alert_rules' and policyname = 'advisor_alert_rules_update') then
    create policy "advisor_alert_rules_update" on public.advisor_alert_rules for update using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'advisor_alert_rules' and policyname = 'advisor_alert_rules_delete') then
    create policy "advisor_alert_rules_delete" on public.advisor_alert_rules for delete using (true);
  end if;
end $$;

-- workflow_automation_logs
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'workflow_automation_logs' and policyname = 'workflow_automation_logs_select') then
    create policy "workflow_automation_logs_select" on public.workflow_automation_logs for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'workflow_automation_logs' and policyname = 'workflow_automation_logs_insert') then
    create policy "workflow_automation_logs_insert" on public.workflow_automation_logs for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'workflow_automation_logs' and policyname = 'workflow_automation_logs_update') then
    create policy "workflow_automation_logs_update" on public.workflow_automation_logs for update using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'workflow_automation_logs' and policyname = 'workflow_automation_logs_delete') then
    create policy "workflow_automation_logs_delete" on public.workflow_automation_logs for delete using (true);
  end if;
end $$;
