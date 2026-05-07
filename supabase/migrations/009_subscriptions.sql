-- Subscription / billing state on public.users + lifetime free-tier deal cap.
--
-- The `plan` column already exists (default 'free') and is the canonical tier.
-- We add the remaining Stripe state, lock subscription columns down so users
-- can't self-promote via the existing "users: update own" policy, and enforce
-- the 3-deal lifetime free-tier cap with a BEFORE INSERT trigger on `deals`
-- (deal inserts happen from many client paths, so DB is the only safe gate).

-- ── 1. Subscription columns ──────────────────────────────────────────────────

alter table public.users
  add column if not exists stripe_customer_id   text,
  add column if not exists subscription_status  text  not null default 'free',
  add column if not exists current_period_end   timestamptz;

-- Tighten the existing `plan` column and the new status to known values.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_plan_check'
  ) then
    alter table public.users
      add constraint users_plan_check check (plan in ('free', 'premium'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'users_subscription_status_check'
  ) then
    alter table public.users
      add constraint users_subscription_status_check
      check (subscription_status in ('free', 'active', 'past_due', 'canceled'));
  end if;
end$$;

create unique index if not exists users_stripe_customer_id_key
  on public.users (stripe_customer_id)
  where stripe_customer_id is not null;

-- ── 2. Stop authenticated users from self-promoting to premium ──────────────
--
-- The existing "users: update own" policy lets a user update their own row.
-- We keep that (so they can edit full_name etc.) but reject any change to
-- billing-controlled columns unless the change comes from the service role
-- (the webhook handler).

create or replace function public.guard_users_billing_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service_role bypasses the guard; webhook updates run with that role.
  if current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' then
    return new;
  end if;

  if new.plan                 is distinct from old.plan
  or new.subscription_status  is distinct from old.subscription_status
  or new.stripe_customer_id   is distinct from old.stripe_customer_id
  or new.current_period_end   is distinct from old.current_period_end then
    raise exception 'billing columns are read-only for end users'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_users_billing_columns on public.users;
create trigger guard_users_billing_columns
  before update on public.users
  for each row execute function public.guard_users_billing_columns();

-- ── 3. Lifetime free-tier deal cap ───────────────────────────────────────────
--
-- Counts existing rows for this user; if plan='free' and count >= 3, reject.
-- Source of truth is the `deals` table itself — no separate counter to drift.

create or replace function public.enforce_free_deal_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_plan text;
  current_count int;
begin
  select plan into user_plan from public.users where id = new.user_id;
  -- Missing user row (shouldn't happen — handle_new_user trigger creates it)
  -- defaults to free. Premium users have no cap.
  if user_plan = 'premium' then
    return new;
  end if;

  select count(*) into current_count from public.deals where user_id = new.user_id;
  if current_count >= 3 then
    raise exception 'free_tier_deal_limit_reached'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_free_deal_limit on public.deals;
create trigger enforce_free_deal_limit
  before insert on public.deals
  for each row execute function public.enforce_free_deal_limit();

-- ── 4. Webhook idempotency ───────────────────────────────────────────────────
--
-- Stripe retries webhooks. Insert event_id on processing; ON CONFLICT skip.

create table if not exists public.stripe_processed_events (
  event_id     text primary key,
  type         text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_processed_events enable row level security;
-- No policies → only the service role (which bypasses RLS) can read/write.

-- ── 5. Index for entitlement reads ───────────────────────────────────────────

create index if not exists users_plan_idx on public.users (plan);

-- ── 6. Trigger functions are not RPC-callable ────────────────────────────────

revoke execute on function public.guard_users_billing_columns() from public, anon, authenticated;
revoke execute on function public.enforce_free_deal_limit()      from public, anon, authenticated;
