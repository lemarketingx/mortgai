-- FINZO PRO Persistent Storage Layer
-- Run once in Supabase SQL editor or via supabase db push
-- All statements are idempotent (safe to run multiple times)

-- ============================================================================
-- 1. advisor_tasks – per-advisor task management
-- ============================================================================

create table if not exists public.advisor_tasks (
  id            uuid        primary key default gen_random_uuid(),
  advisor_id    text        not null,
  lead_id       text,
  title         text        not null,
  description   text        default '',
  status        text        not null default 'pending',
  priority      text        not null default 'medium',
  type          text        not null default 'general',
  due_date      timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_advisor_tasks_advisor
  on public.advisor_tasks (advisor_id);
create index if not exists idx_advisor_tasks_lead
  on public.advisor_tasks (lead_id);
create index if not exists idx_advisor_tasks_status
  on public.advisor_tasks (status);
create index if not exists idx_advisor_tasks_due
  on public.advisor_tasks (due_date) where status = 'pending';

alter table public.advisor_tasks enable row level security;

-- ============================================================================
-- 2. audit_events – append-only audit trail
-- ============================================================================

create table if not exists public.audit_events (
  id            uuid        primary key default gen_random_uuid(),
  advisor_id    text,
  lead_id       text,
  event_type    text        not null,
  title         text        not null default '',
  description   text        default '',
  field         text,
  old_value     text,
  new_value     text,
  metadata      jsonb       default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists idx_audit_events_lead
  on public.audit_events (lead_id, created_at desc);
create index if not exists idx_audit_events_advisor
  on public.audit_events (advisor_id, created_at desc);
create index if not exists idx_audit_events_type
  on public.audit_events (event_type);

alter table public.audit_events enable row level security;

-- ============================================================================
-- 3. advisor_favorites – starred / pinned leads per advisor
-- ============================================================================

create table if not exists public.advisor_favorites (
  id            uuid        primary key default gen_random_uuid(),
  advisor_id    text        not null,
  lead_id       text        not null,
  created_at    timestamptz not null default now(),
  unique(advisor_id, lead_id)
);

create index if not exists idx_advisor_favorites_advisor
  on public.advisor_favorites (advisor_id);

alter table public.advisor_favorites enable row level security;

-- ============================================================================
-- 4. idempotency_keys – request deduplication
-- ============================================================================

create table if not exists public.idempotency_keys (
  key           text        primary key,
  advisor_id    text        not null,
  endpoint      text        not null,
  request_hash  text        not null,
  response_json jsonb,
  status        text        not null default 'processing',
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '24 hours')
);

create index if not exists idx_idempotency_keys_advisor
  on public.idempotency_keys (advisor_id);
create index if not exists idx_idempotency_keys_expires
  on public.idempotency_keys (expires_at);

alter table public.idempotency_keys enable row level security;

-- ============================================================================
-- 5. lead_pricing_rules – dynamic lead scoring adjustments
-- ============================================================================

create table if not exists public.lead_pricing_rules (
  id            uuid        primary key default gen_random_uuid(),
  rule_name     text        not null unique,
  field         text        not null,
  operator      text        not null default 'gte',
  threshold     text        not null default '0',
  adjustment    integer     not null default 0,
  label_he      text        not null default '',
  is_active     boolean     not null default true,
  priority      integer     not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.lead_pricing_rules enable row level security;

-- ============================================================================
-- RLS Policies
-- We use permissive policies because all access is via service role key.
-- The application layer enforces advisor_id filtering.
-- Policies exist so if we later switch to anon/user keys, RLS is ready.
-- ============================================================================

-- advisor_tasks
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'advisor_tasks' and policyname = 'advisor_tasks_select') then
    create policy "advisor_tasks_select" on public.advisor_tasks for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'advisor_tasks' and policyname = 'advisor_tasks_insert') then
    create policy "advisor_tasks_insert" on public.advisor_tasks for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'advisor_tasks' and policyname = 'advisor_tasks_update') then
    create policy "advisor_tasks_update" on public.advisor_tasks for update using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'advisor_tasks' and policyname = 'advisor_tasks_delete') then
    create policy "advisor_tasks_delete" on public.advisor_tasks for delete using (true);
  end if;
end $$;

-- audit_events
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'audit_events' and policyname = 'audit_events_select') then
    create policy "audit_events_select" on public.audit_events for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'audit_events' and policyname = 'audit_events_insert') then
    create policy "audit_events_insert" on public.audit_events for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'audit_events' and policyname = 'audit_events_update') then
    create policy "audit_events_update" on public.audit_events for update using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'audit_events' and policyname = 'audit_events_delete') then
    create policy "audit_events_delete" on public.audit_events for delete using (true);
  end if;
end $$;

-- advisor_favorites
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'advisor_favorites' and policyname = 'advisor_favorites_select') then
    create policy "advisor_favorites_select" on public.advisor_favorites for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'advisor_favorites' and policyname = 'advisor_favorites_insert') then
    create policy "advisor_favorites_insert" on public.advisor_favorites for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'advisor_favorites' and policyname = 'advisor_favorites_update') then
    create policy "advisor_favorites_update" on public.advisor_favorites for update using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'advisor_favorites' and policyname = 'advisor_favorites_delete') then
    create policy "advisor_favorites_delete" on public.advisor_favorites for delete using (true);
  end if;
end $$;

-- idempotency_keys
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'idempotency_keys' and policyname = 'idempotency_keys_select') then
    create policy "idempotency_keys_select" on public.idempotency_keys for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'idempotency_keys' and policyname = 'idempotency_keys_insert') then
    create policy "idempotency_keys_insert" on public.idempotency_keys for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'idempotency_keys' and policyname = 'idempotency_keys_update') then
    create policy "idempotency_keys_update" on public.idempotency_keys for update using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'idempotency_keys' and policyname = 'idempotency_keys_delete') then
    create policy "idempotency_keys_delete" on public.idempotency_keys for delete using (true);
  end if;
end $$;

-- lead_pricing_rules
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'lead_pricing_rules' and policyname = 'lead_pricing_rules_select') then
    create policy "lead_pricing_rules_select" on public.lead_pricing_rules for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'lead_pricing_rules' and policyname = 'lead_pricing_rules_insert') then
    create policy "lead_pricing_rules_insert" on public.lead_pricing_rules for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'lead_pricing_rules' and policyname = 'lead_pricing_rules_update') then
    create policy "lead_pricing_rules_update" on public.lead_pricing_rules for update using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'lead_pricing_rules' and policyname = 'lead_pricing_rules_delete') then
    create policy "lead_pricing_rules_delete" on public.lead_pricing_rules for delete using (true);
  end if;
end $$;

-- ============================================================================
-- Seed data: lead_pricing_rules
-- Uses ON CONFLICT (rule_name) DO NOTHING for idempotency
-- ============================================================================

insert into public.lead_pricing_rules (rule_name, field, operator, threshold, adjustment, label_he, priority) values
  ('high_finzo_score',    'finzoScore',        'gte', '80',  100,  'ציון FINZO גבוה',            10),
  ('medium_finzo_score',  'finzoScore',        'gte', '60',  50,   'ציון FINZO בינוני-גבוה',     9),
  ('hot_quality',         'computedQuality',   'eq',  'חם',  50,   'ליד חם',                     8),
  ('signed_contract',     'contractStatus',    'eq',  'חוזה חתום', 75, 'חוזה חתום',              7),
  ('docs_attached',       'documentsCount',    'gte', '5',   30,   'מסמכים מצורפים',             6),
  ('high_equity',         'equityRatio',       'gte', '0.3', 25,   'הון עצמי 30%+',              5),
  ('fresh_lead_24h',      'daysSinceCreated',  'lte', '1',   40,   'ליד טרי (24 שעות)',          4),
  ('fresh_lead_3d',       'daysSinceCreated',  'lte', '3',   20,   'ליד חדש (3 ימים)',           3),
  ('old_lead',            'daysSinceCreated',  'gte', '14',  -30,  'ליד ישן (מעל שבועיים)',      2)
on conflict (rule_name) do nothing;
