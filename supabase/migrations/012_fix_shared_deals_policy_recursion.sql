-- Migration 012: fix infinite-recursion in the deals public-share policy.
--
-- Migration 011 added a policy that did:
--   exists (select 1 from shared_reports where deal_id = deals.id and is_active = true)
-- That re-enters RLS on shared_reports, whose owner policies (added in
-- migration 008) themselves do `exists (select 1 from deals where ...)`,
-- which re-enters deals RLS — Postgres detects the cycle and raises
-- "infinite recursion detected in policy for relation deals", breaking
-- both /r/[slug] and the owner's own dashboard.
--
-- Fix: move the lookup into a SECURITY DEFINER function so the inner
-- shared_reports read happens under the function owner's privileges and
-- bypasses RLS for that step. The function is read-only and only returns
-- a boolean — it cannot leak rows or be used to mutate anything.

create or replace function public.is_deal_publicly_shared(p_deal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shared_reports
    where deal_id = p_deal_id and is_active = true
  );
$$;

revoke all on function public.is_deal_publicly_shared(uuid) from public;
grant execute on function public.is_deal_publicly_shared(uuid) to anon, authenticated;

drop policy if exists "deals public select via active share" on public.deals;

create policy "deals public select via active share"
  on public.deals for select
  to anon, authenticated
  using (public.is_deal_publicly_shared(id));
