-- Phase 1 edge-case hardening: dedupe + uniqueness

-- Keep the oldest waitlist row per email, remove later duplicates
delete from public.waitlist_entries w
using public.waitlist_entries newer
where lower(w.email) = lower(newer.email)
  and w.created_at > newer.created_at;

create unique index if not exists waitlist_entries_email_unique_idx
  on public.waitlist_entries (lower(email));

-- Keep the oldest plan per user, remove later duplicates
delete from public.plans p
using public.plans newer
where p.user_id = newer.user_id
  and p.created_at > newer.created_at;

create unique index if not exists plans_user_id_unique_idx
  on public.plans (user_id);

-- Keep one open created subscription attempt per user
delete from public.subscriptions s
using public.subscriptions newer
where s.status = 'created'
  and newer.status = 'created'
  and s.user_id = newer.user_id
  and s.created_at > newer.created_at;

create unique index if not exists subscriptions_one_open_created_idx
  on public.subscriptions (user_id)
  where status = 'created';

-- Invites that already produced an intake cannot be reused
update public.waitlist_entries w
set status = 'expired'
where w.status = 'released'
  and exists (
    select 1
    from public.intake_responses i
    where i.waitlist_entry_id = w.id
  );
