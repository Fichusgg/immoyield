-- Seed CDI and FII benchmark rows
-- Schema: id (uuid), metric (text not-null), value (numeric), source (text), updated_at (timestamptz)

insert into public.market_benchmarks (metric, value, source)
values ('cdi', 13.65, 'BACEN SGS 4389')
on conflict do nothing;

insert into public.market_benchmarks (metric, value, source)
values ('fii_ifix', 8.0, 'Manual reference')
on conflict do nothing;

-- RLS: public read
alter table public.market_benchmarks enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'market_benchmarks'
    and policyname = 'Benchmarks são públicos para leitura'
  ) then
    execute 'create policy "Benchmarks são públicos para leitura"
      on public.market_benchmarks for select using (true)';
  end if;
end $$;
