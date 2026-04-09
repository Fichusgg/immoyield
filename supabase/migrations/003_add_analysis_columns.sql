-- ─────────────────────────────────────────────────────────────────────────────
-- immoyield: add analysis/wizard columns to deals
--
-- These columns store the full DealInput form data and calculated AnalysisResult
-- produced by the wizard flow (POST /api/deals/calculate → saveDeal()).
--
-- Run: supabase db push  (or paste into Supabase SQL editor)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.deals
  -- Investment strategy type (residential | airbnb | flip | multifamily | commercial)
  -- Distinct from `type` which is physical structure (apartment | house | ...)
  add column if not exists property_type  text
    check (property_type in ('residential','airbnb','flip','multifamily','commercial')),

  -- Full DealInput JSON snapshot (wizard form data)
  add column if not exists inputs         jsonb,

  -- Full AnalysisResult JSON snapshot (calculated metrics, schedule, projections)
  add column if not exists results_cache  jsonb;

-- Index to filter by investment strategy
create index if not exists deals_property_type_idx
  on public.deals(property_type)
  where property_type is not null;
