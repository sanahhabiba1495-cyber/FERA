-- Fera Phase 1 schema
-- Run this in the Supabase SQL editor (or via the CLI) on a fresh project.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.subscription_status as enum ('none', 'pending_payment', 'active', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.billing_cycle as enum ('monthly', 'quarterly', 'yearly');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.waitlist_status as enum ('waiting', 'released', 'expired');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.diagnosis_status as enum ('diagnosed', 'suspected', 'has_recent_labs');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.plan_status as enum ('pending_review', 'approved', 'active');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.subscription_record_status as enum ('created', 'active', 'past_due', 'cancelled');
exception when duplicate_object then null;
end $$;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  email text,
  subscription_status public.subscription_status not null default 'none',
  billing_cycle public.billing_cycle,
  created_at timestamptz not null default now()
);

create table if not exists public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  status public.waitlist_status not null default 'waiting',
  created_at timestamptz not null default now(),
  released_at timestamptz
);

create table if not exists public.intake_responses (
  id uuid primary key default gen_random_uuid(),
  waitlist_entry_id uuid not null references public.waitlist_entries (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  diagnosis_status public.diagnosis_status not null,
  cycle_pattern text not null,
  top_symptoms jsonb not null default '[]'::jsonb,
  lifestyle_snapshot jsonb not null default '{}'::jsonb,
  primary_goal text not null,
  existing_investigations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint top_symptoms_max_five check (jsonb_array_length(top_symptoms) <= 5)
);

create table if not exists public.snapshots (
  id uuid primary key default gen_random_uuid(),
  intake_response_id uuid not null references public.intake_responses (id) on delete cascade,
  pain_points jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  generated_from_intake_id uuid not null references public.intake_responses (id) on delete cascade,
  steps_target integer not null,
  water_target_l numeric not null,
  protein_target_g integer not null,
  fiber_target_g integer not null,
  movement_guidance text not null,
  supplement_regimen jsonb not null default '[]'::jsonb,
  status public.plan_status not null default 'pending_review',
  doctor_notes text,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  razorpay_subscription_id text not null,
  plan_tier public.billing_cycle not null,
  price_paid numeric not null,
  status public.subscription_record_status not null,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists subscriptions_razorpay_subscription_id_idx
  on public.subscriptions (razorpay_subscription_id);

alter table public.users enable row level security;
alter table public.waitlist_entries enable row level security;
alter table public.intake_responses enable row level security;
alter table public.snapshots enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;

-- users: a user can select/update only their own row
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select using (id = auth.uid());

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

-- waitlist: public insert; select/update only via service role (admin API)
drop policy if exists "waitlist_public_insert" on public.waitlist_entries;
create policy "waitlist_public_insert" on public.waitlist_entries
  for insert to anon, authenticated
  with check (true);

-- intake: insert checked at the API layer; users can read their own row once linked
drop policy if exists "intake_insert" on public.intake_responses;
create policy "intake_insert" on public.intake_responses
  for insert to anon, authenticated
  with check (true);

drop policy if exists "intake_select_own" on public.intake_responses;
create policy "intake_select_own" on public.intake_responses
  for select using (user_id = auth.uid());

-- snapshots: readable by the linked user
drop policy if exists "snapshots_select_own" on public.snapshots;
create policy "snapshots_select_own" on public.snapshots
  for select using (
    exists (
      select 1 from public.intake_responses ir
      where ir.id = snapshots.intake_response_id
        and ir.user_id = auth.uid()
    )
  );

-- plans: user can select own row; no client writes (service role only)
drop policy if exists "plans_select_own" on public.plans;
create policy "plans_select_own" on public.plans
  for select using (user_id = auth.uid());

-- subscriptions: user can select own row; no client writes (service role / webhook only)
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (user_id = auth.uid());

-- Admin reads/writes in Phase 1 go through API routes using the service role key,
-- which bypasses RLS. A full admin role system is out of scope for Phase 1.
