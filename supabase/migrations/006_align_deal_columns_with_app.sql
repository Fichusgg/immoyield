-- Migration 006: Align the deals table with the app's TypeScript model.
--
-- Two long-standing drift issues fixed here:
--
--   1. Code uses `deal.title` (28 refs across the app) but the column was
--      historically named `name`. The saveDeal() insert tried to write into
--      a `title` column that didn't exist; reads worked only because the
--      TypeScript interface lied about the shape and `select *` just
--      returned `name` under whatever key Supabase mapped. This rename also
--      removes the `name` shadowing that caused the storage RLS bug fixed
--      in migration 005.
--
--   2. Code uses `deal.type` (physical property structure — apartment /
--      house / commercial / land / …) which never existed as a column.
--      Distinct from `property_type` (investment strategy — residential /
--      airbnb / flip / …).

-- Rename name → title.
ALTER TABLE public.deals RENAME COLUMN name TO title;

-- Add structural property type. Nullable; legacy rows default to NULL.
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS type text;

COMMENT ON COLUMN public.deals.title IS
  'Display title of the deal (e.g. "Apartamento Vila Madalena"). Renamed from `name` in migration 006.';
COMMENT ON COLUMN public.deals.type IS
  'Physical property structure: apartment, house, multifamily, condo, townhouse, commercial, land, other. Distinct from property_type (investment strategy).';
COMMENT ON COLUMN public.deals.property_type IS
  'Investment strategy: residential, airbnb, flip, multifamily, commercial.';
