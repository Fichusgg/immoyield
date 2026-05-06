-- Migration 008: shared_reports — capture + repair.
--
-- The table already existed in production (drift, no prior migration). This
-- migration is idempotent so it's safe to run against either:
--   * a fresh project (creates the table, FK, indexes, policies)
--   * the existing production project (no-ops the table, repairs policies/FK)
--
-- What this migration fixes vs. the prior production state:
--
--   1. `deal_id` becomes a real FK to `deals(id)` with ON DELETE CASCADE,
--      ending orphan rows. The constraint is named `shared_reports_deal_id_fkey`
--      because the PostgREST embed in shares.server.ts (`deal:deals!shared_reports_deal_id_fkey`)
--      hardcodes that name.
--
--   2. RLS policies. Prior state had three duplicate SELECT-to-public policies
--      and no INSERT/UPDATE/DELETE — meaning revoked shares stayed publicly
--      readable AND owners could not actually create / revoke their own shares
--      (writes silently failed against RLS). New policy set:
--
--        - SELECT: anon + authenticated may read only `is_active = true` rows.
--        - SELECT (owner): the deal owner sees all their shares (active or not),
--          so the existing-share lookup in createShareLinkServer works.
--        - INSERT / UPDATE / DELETE: only the owner of the parent deal.
--
--   3. View-count increment from public viewers. The /r/[slug] page bumps
--      view_count via the user-session client, which can be anonymous. The
--      tightened UPDATE policy would block this, so we expose a
--      SECURITY DEFINER RPC `increment_share_view(text)` that anyone may call.
--      The function only bumps the counter on active rows; it cannot mutate
--      anything else.

-- ── Table ────────────────────────────────────────────────────────────────────
create table if not exists public.shared_reports (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null,
  slug        text not null unique,
  expires_at  timestamptz,
  view_count  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz default now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists shared_reports_slug_idx     on public.shared_reports(slug);
create index if not exists shared_reports_deal_id_idx  on public.shared_reports(deal_id);

-- ── Foreign key (named exactly to match the PostgREST embed) ─────────────────
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'shared_reports_deal_id_fkey'
      and conrelid = 'public.shared_reports'::regclass
  ) then
    alter table public.shared_reports
      add constraint shared_reports_deal_id_fkey
      foreign key (deal_id) references public.deals(id) on delete cascade;
  end if;
end $$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.shared_reports enable row level security;

-- Drop the prior duplicate / overly-permissive SELECT policies.
drop policy if exists "Public read shared reports"   on public.shared_reports;
drop policy if exists "public can read active shares" on public.shared_reports;
drop policy if exists "shared_reports: read all"     on public.shared_reports;
-- Drop any prior versions of the new policies before recreating (idempotency).
drop policy if exists "shared_reports public select active"  on public.shared_reports;
drop policy if exists "shared_reports owner select"          on public.shared_reports;
drop policy if exists "shared_reports owner insert"          on public.shared_reports;
drop policy if exists "shared_reports owner update"          on public.shared_reports;
drop policy if exists "shared_reports owner delete"          on public.shared_reports;

-- Public viewers (anon + authenticated) see only active shares.
create policy "shared_reports public select active"
  on public.shared_reports for select
  to anon, authenticated
  using (is_active = true);

-- The deal owner sees all their shares (active and revoked) so the
-- "find existing share" lookup in createShareLinkServer works.
create policy "shared_reports owner select"
  on public.shared_reports for select
  to authenticated
  using (
    exists (
      select 1 from public.deals d
      where d.id = shared_reports.deal_id and d.user_id = auth.uid()
    )
  );

create policy "shared_reports owner insert"
  on public.shared_reports for insert
  to authenticated
  with check (
    exists (
      select 1 from public.deals d
      where d.id = shared_reports.deal_id and d.user_id = auth.uid()
    )
  );

create policy "shared_reports owner update"
  on public.shared_reports for update
  to authenticated
  using (
    exists (
      select 1 from public.deals d
      where d.id = shared_reports.deal_id and d.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.deals d
      where d.id = shared_reports.deal_id and d.user_id = auth.uid()
    )
  );

create policy "shared_reports owner delete"
  on public.shared_reports for delete
  to authenticated
  using (
    exists (
      select 1 from public.deals d
      where d.id = shared_reports.deal_id and d.user_id = auth.uid()
    )
  );

-- ── Public view-count RPC ────────────────────────────────────────────────────
-- SECURITY DEFINER lets anonymous callers bump view_count without a broad
-- UPDATE policy. The function is the only public path that can mutate the
-- table, and it can only ever increment the counter on an active row.
create or replace function public.increment_share_view(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.shared_reports
  set view_count = view_count + 1
  where slug = p_slug and is_active = true;
$$;

revoke all on function public.increment_share_view(text) from public;
grant execute on function public.increment_share_view(text) to anon, authenticated;
