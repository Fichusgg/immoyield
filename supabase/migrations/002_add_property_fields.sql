-- ─────────────────────────────────────────────────────────────────────────────
-- immoyield: add scraped property fields to deals
-- Run: supabase db push  (or paste into Supabase SQL editor)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.deals
  add column if not exists zip_code       text,           -- CEP / postal code
  add column if not exists description    text,           -- listing description text
  add column if not exists market_value   numeric(15,2),  -- site's estimated market value (Análise de preço)
  add column if not exists price_per_sqm  numeric(10,2);  -- listed price ÷ area m²

-- Index for market_value so we can query under/over-market deals
create index if not exists deals_market_value_idx on public.deals(market_value)
  where market_value is not null;
