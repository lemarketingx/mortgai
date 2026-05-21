-- CRM Phase 2: Mortgage Case Management Normalization
-- Safe to run after the base leads table exists.
-- Adds mortgage case fields and stores pipeline_stage as canonical English slugs.
-- This migration intentionally does not create or alter foreign keys, so it does
-- not depend on whether public.leads.id is text or uuid.

alter table public.leads
  add column if not exists pipeline_stage text,
  add column if not exists stage_updated_at timestamptz,
  add column if not exists next_action text,
  add column if not exists next_action_at timestamptz,
  add column if not exists bank_name text,
  add column if not exists mortgage_type text,
  add column if not exists documents_completion_percent integer not null default 0,
  add column if not exists appraiser_name text,
  add column if not exists appraiser_phone text,
  add column if not exists appraisal_date timestamptz,
  add column if not exists appraisal_cost numeric,
  add column if not exists appraisal_report_received boolean not null default false,
  add column if not exists appraisal_status text not null default 'not_ordered',
  add column if not exists buyer_lawyer_name text,
  add column if not exists buyer_lawyer_phone text,
  add column if not exists buyer_lawyer_email text,
  add column if not exists seller_lawyer_name text,
  add column if not exists seller_lawyer_phone text,
  add column if not exists seller_lawyer_email text,
  add column if not exists legal_contract_received boolean not null default false,
  add column if not exists legal_rights_received boolean not null default false,
  add column if not exists legal_registration_received boolean not null default false,
  add column if not exists signing_date timestamptz,
  add column if not exists signing_location text,
  add column if not exists signing_notes text,
  add column if not exists collateral_life_insurance boolean not null default false,
  add column if not exists collateral_property_insurance boolean not null default false,
  add column if not exists collateral_mortgage_registration boolean not null default false,
  add column if not exists collateral_pledge_registration boolean not null default false,
  add column if not exists collateral_municipality_documents boolean not null default false,
  add column if not exists collateral_completion_percent integer not null default 0,
  add column if not exists funds_release_status text not null default 'not_released',
  add column if not exists overall_progress_percent integer not null default 0;

update public.leads
set pipeline_stage = case
  when coalesce(pipeline_stage, lead_status, status) in ('new_lead', 'ליד חדש', 'חדש') then 'new_lead'
  when coalesce(pipeline_stage, lead_status, status) in ('contacted', 'נוצר קשר', 'נשלח ליועץ', 'בטיפול', 'נקבעה שיחה', 'פגישה נקבעה') then 'contacted'
  when coalesce(pipeline_stage, lead_status, status) in ('documents_requested', 'נשלחה רשימת מסמכים', 'נשלחו מסמכים') then 'documents_requested'
  when coalesce(pipeline_stage, lead_status, status) in ('waiting_documents', 'מחכה למסמכים', 'מחכים למסמכים') then 'waiting_documents'
  when coalesce(pipeline_stage, lead_status, status) in ('documents_received', 'מסמכים התקבלו') then 'documents_received'
  when coalesce(pipeline_stage, lead_status, status) in ('eligibility_review', 'בדיקת זכאות') then 'eligibility_review'
  when coalesce(pipeline_stage, lead_status, status) in ('appraisal_ordered', 'הוזמנה שמאות', 'שמאות הוזמנה') then 'appraisal_ordered'
  when coalesce(pipeline_stage, lead_status, status) in ('appraisal_completed', 'שמאות התקבלה', 'שמאות בוצעה') then 'appraisal_completed'
  when coalesce(pipeline_stage, lead_status, status) in ('lawyer_review', 'בדיקת עורכי דין', 'בדיקה משפטית') then 'lawyer_review'
  when coalesce(pipeline_stage, lead_status, status) in ('submitted_to_bank', 'הוגש לבנק') then 'submitted_to_bank'
  when coalesce(pipeline_stage, lead_status, status) in ('principle_approval', 'אישור עקרוני', 'אושר עקרונית') then 'principle_approval'
  when coalesce(pipeline_stage, lead_status, status) in ('bank_negotiation', 'מו"מ מול בנקים', 'משא ומתן מול בנקים') then 'bank_negotiation'
  when coalesce(pipeline_stage, lead_status, status) in ('selected_track', 'נבחר תמהיל') then 'selected_track'
  when coalesce(pipeline_stage, lead_status, status) in ('signing_scheduled', 'נקבעו חתימות') then 'signing_scheduled'
  when coalesce(pipeline_stage, lead_status, status) in ('signed', 'נחתם', 'חתום') then 'signed'
  when coalesce(pipeline_stage, lead_status, status) in ('collateral_completion', 'השלמת בטחונות', 'בטחונות') then 'collateral_completion'
  when coalesce(pipeline_stage, lead_status, status) in ('funds_released', 'כספים שוחררו', 'שחרור כספים') then 'funds_released'
  when coalesce(pipeline_stage, lead_status, status) in ('closed_won', 'נסגר בהצלחה', 'נסגר') then 'closed_won'
  when coalesce(pipeline_stage, lead_status, status) in ('closed_lost', 'לא עונה', 'לא רלוונטי', 'נדחה בבנק', 'בוטל', 'אבוד', 'עבר ליועץ אחר') then 'closed_lost'
  else 'new_lead'
end
where pipeline_stage is null
  or pipeline_stage not in (
    'new_lead','contacted','documents_requested','waiting_documents','documents_received',
    'eligibility_review','appraisal_ordered','appraisal_completed','lawyer_review',
    'submitted_to_bank','principle_approval','bank_negotiation','selected_track',
    'signing_scheduled','signed','collateral_completion','funds_released',
    'closed_won','closed_lost'
  );

alter table public.leads
  alter column pipeline_stage set default 'new_lead';

update public.leads
set pipeline_stage = 'new_lead'
where pipeline_stage is null or btrim(pipeline_stage) = '';

alter table public.leads
  alter column pipeline_stage set not null;

update public.leads
set collateral_completion_percent = round((
  (case when collateral_life_insurance then 1 else 0 end +
   case when collateral_property_insurance then 1 else 0 end +
   case when collateral_mortgage_registration then 1 else 0 end +
   case when collateral_pledge_registration then 1 else 0 end +
   case when collateral_municipality_documents then 1 else 0 end) / 5.0
) * 100)::integer;

update public.leads
set overall_progress_percent = greatest(
  0,
  least(100, round((
    (case pipeline_stage
      when 'new_lead' then 5
      when 'contacted' then 10
      when 'documents_requested' then 16
      when 'waiting_documents' then 22
      when 'documents_received' then 29
      when 'eligibility_review' then 35
      when 'appraisal_ordered' then 42
      when 'appraisal_completed' then 48
      when 'lawyer_review' then 54
      when 'submitted_to_bank' then 60
      when 'principle_approval' then 66
      when 'bank_negotiation' then 72
      when 'selected_track' then 78
      when 'signing_scheduled' then 84
      when 'signed' then 90
      when 'collateral_completion' then 95
      when 'funds_released' then 98
      when 'closed_won' then 100
      when 'closed_lost' then 100
      else 5
    end * 0.5) +
    (coalesce(documents_completion_percent, 0) * 0.3) +
    (coalesce(collateral_completion_percent, 0) * 0.2)
  ))::integer)
);

do $$
declare
  constraint_name text;
begin
  if to_regclass('public.lead_documents') is not null then
    select con.conname
      into constraint_name
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'lead_documents'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
    limit 1;

    if constraint_name is not null then
      execute format('alter table public.lead_documents drop constraint %I', constraint_name);
    end if;

    alter table public.lead_documents
      alter column status set default 'requested';

    alter table public.lead_documents
      add constraint lead_documents_status_check
      check (status in ('missing','requested','received','approved','rejected','not_required'));
  end if;
end $$;

create index if not exists idx_leads_pipeline_stage on public.leads(pipeline_stage);
create index if not exists idx_leads_next_action_at on public.leads(next_action_at);
create index if not exists idx_leads_stage_updated_at on public.leads(stage_updated_at);
create index if not exists idx_leads_signing_date on public.leads(signing_date);
create index if not exists idx_leads_appraisal_status on public.leads(appraisal_status);
create index if not exists idx_leads_funds_release_status on public.leads(funds_release_status);
