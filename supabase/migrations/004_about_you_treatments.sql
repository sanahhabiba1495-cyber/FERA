-- Store anthropometrics and current treatments from the redesigned intake.
alter table public.intake_responses
  add column if not exists about_you jsonb;

alter table public.intake_responses
  add column if not exists treatments jsonb;
