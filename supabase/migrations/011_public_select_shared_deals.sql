-- Migration 011: allow public read of deals that are the target of an active share.
--
-- Why: getPublicReportBySlug() in src/lib/supabase/shares.server.ts uses the
-- PostgREST embed `deal:deals!shared_reports_deal_id_fkey` to fetch the deal
-- alongside the shared_reports row. Anonymous viewers of /r/[slug] could read
-- shared_reports (public select policy added in 008) but not the embedded
-- deal — the only deals SELECT policy was owner-only, so every public visit
-- ended up returning notFound() and rendering a 404.
--
-- This adds a narrowly-scoped SELECT policy: anyone may read a deals row iff
-- there exists an `is_active = true` row in shared_reports pointing at it.
-- Revoking the share (is_active = false) immediately re-hides the deal.

drop policy if exists "deals public select via active share" on public.deals;

create policy "deals public select via active share"
  on public.deals for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.shared_reports sr
      where sr.deal_id = deals.id and sr.is_active = true
    )
  );
