-- CRM Phase 2: Mortgage Pipeline Engine
-- Run after crm_phase1.sql

alter table public.leads
  add column if not exists pipeline_stage text not null default 'ליד חדש',
  add column if not exists stage_updated_at timestamptz,
  add column if not exists next_action text,
  add column if not exists next_action_at timestamptz,
  add column if not exists bank_name text,
  add column if not exists mortgage_type text,
  add column if not exists documents_completion_percent integer not null default 0;

-- Migrate existing lead_status values into pipeline_stage
update public.leads
set pipeline_stage = case
  when lead_status in ('חדש', 'ליד חדש')                  then 'ליד חדש'
  when lead_status = 'נוצר קשר'                             then 'נוצר קשר'
  when lead_status in ('מחכים למסמכים', 'מחכה למסמכים')    then 'מחכה למסמכים'
  when lead_status in ('פגישה נקבעה', 'נקבעה שיחה')        then 'נוצר קשר'
  when lead_status = 'הוגש לבנק'                            then 'הוגש לבנק'
  when lead_status in ('אישור עקרוני', 'אושר עקרונית')     then 'אישור עקרוני'
  when lead_status = 'נסגר'                                  then 'נסגר בהצלחה'
  when lead_status in ('אבוד', 'בוטל')                      then 'בוטל'
  when lead_status = 'לא רלוונטי'                           then 'לא רלוונטי'
  else 'ליד חדש'
end
where pipeline_stage = 'ליד חדש' and lead_status is not null and lead_status != 'חדש';

create index if not exists idx_leads_pipeline_stage   on public.leads(pipeline_stage);
create index if not exists idx_leads_next_action_at   on public.leads(next_action_at);
create index if not exists idx_leads_stage_updated_at on public.leads(stage_updated_at);
