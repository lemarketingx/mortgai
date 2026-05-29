-- CRM Phase 1 migration
-- Run once in Supabase SQL editor or via supabase db push

-- 1. New columns on leads table
alter table public.leads
  add column if not exists first_contact_at  timestamptz,
  add column if not exists last_activity_at  timestamptz,
  add column if not exists heat_score        integer not null default 0,
  add column if not exists missing_documents_count integer not null default 0;

-- 2. Activity log table (append-only)
create table if not exists public.lead_activities (
  id            uuid        primary key default gen_random_uuid(),
  lead_id       uuid        not null references public.leads(id) on delete cascade,
  advisor_id    text,
  activity_type text        not null check (activity_type in (
    'lead_created','status_changed','task_created','task_completed',
    'call_logged','whatsapp_opened','whatsapp_sent','email_opened',
    'email_sent','document_requested','document_received','note_added','reminder_set'
  )),
  title         text        not null,
  body          text,
  channel       text,
  metadata      jsonb       not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists idx_lead_activities_lead_created_at
  on public.lead_activities (lead_id, created_at desc);

-- 3. Document tracking table
create table if not exists public.lead_documents (
  id            uuid        primary key default gen_random_uuid(),
  lead_id       uuid        not null references public.leads(id) on delete cascade,
  document_type text        not null,
  status        text        not null default 'requested' check (
    status in ('requested','received','approved','rejected')
  ),
  requested_at  timestamptz,
  due_at        timestamptz,
  received_at   timestamptz,
  file_url      text,
  notes         text,
  created_by    text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_lead_documents_lead_status
  on public.lead_documents (lead_id, status);

-- 4. RLS policies (adjust to your setup)
-- alter table public.lead_activities enable row level security;
-- alter table public.lead_documents  enable row level security;
-- create policy "advisors_own_activities" on public.lead_activities
--   using (advisor_id = auth.uid()::text);
