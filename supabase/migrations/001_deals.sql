-- ─────────────────────────────────────────────────────────────────────────────
-- immoyield: deals table
-- Run this in your Supabase SQL editor or via the Supabase CLI:
--   supabase db push
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.deals (
  -- Identity
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,

  -- Listing meta
  title         text,
  type          text check (type in ('apartment','house','commercial','land','other')),
  listing_type  text check (listing_type in ('sale','rent')),
  status        text not null default 'draft'
                  check (status in ('draft','active','archived')),

  -- Financials (BRL)
  price         numeric(15,2),       -- sale price OR monthly rent
  condo_fee     numeric(10,2),       -- condomínio mensal
  iptu          numeric(10,2),       -- IPTU anual
  annual_rent   numeric(15,2),       -- filled by user for yield calc (if sale deal)

  -- Computed yield (auto-calculated, stored for fast queries)
  -- gross_yield = annual_rent / price * 100
  gross_yield   numeric(6,2) generated always as (
    case
      when price is not null and price > 0 and annual_rent is not null and listing_type = 'sale'
      then round((annual_rent / price) * 100, 2)
      else null
    end
  ) stored,

  -- Property specs
  area          numeric(10,2),       -- usable area m²
  total_area    numeric(10,2),
  bedrooms      smallint,
  bathrooms     smallint,
  suites        smallint,
  parking_spots smallint,

  -- Location
  street        text,
  neighborhood  text,
  city          text,
  state         char(2),

  -- Media & agent
  photos        text[],              -- array of image URLs
  agent_name    text,

  -- Source
  source_url    text,
  source_site   text check (source_site in ('zapimoveis','vivareal','quintoandar',null)),
  listing_id    text,                -- ID from the source site

  -- User notes
  notes         text,

  -- Timestamps
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists deals_user_id_idx on public.deals(user_id);
create index if not exists deals_status_idx  on public.deals(status);
create index if not exists deals_city_idx    on public.deals(city);
create index if not exists deals_source_url_idx on public.deals(source_url);

-- Unique constraint: prevent importing the same listing twice per user
create unique index if not exists deals_user_source_unique
  on public.deals(user_id, source_url)
  where source_url is not null;

-- ── auto-updated updated_at ───────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists deals_set_updated_at on public.deals;
create trigger deals_set_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.deals enable row level security;

-- Users can only see and modify their own deals
create policy "Users can view their own deals"
  on public.deals for select
  using (auth.uid() = user_id);

create policy "Users can insert their own deals"
  on public.deals for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own deals"
  on public.deals for update
  using (auth.uid() = user_id);

create policy "Users can delete their own deals"
  on public.deals for delete
  using (auth.uid() = user_id);
