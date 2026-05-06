-- Migration 007: in-app feedback table.
--
-- A logged-in user (or an anonymous visitor — we still capture the row but
-- without user_id) can submit free-text feedback from the floating widget.
-- The owner reads everything via the service-role key; users only see
-- (and only need to see) their own submissions.

create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  email       text,
  message     text not null check (char_length(message) between 1 and 5000),
  url         text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists feedback_user_id_idx on public.feedback(user_id);
create index if not exists feedback_created_at_idx on public.feedback(created_at desc);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.feedback enable row level security;

-- Anyone (signed-in or anonymous) may insert. The server route enforces rate
-- limiting; RLS only governs row visibility.
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'feedback'
      and policyname = 'Anyone may submit feedback'
  ) then
    execute 'create policy "Anyone may submit feedback"
      on public.feedback for insert
      to anon, authenticated
      with check (true)';
  end if;
end $$;

-- A signed-in user may read their own rows (so the owner can later add a
-- "view my submissions" surface without changing RLS).
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'feedback'
      and policyname = 'Users read their own feedback'
  ) then
    execute 'create policy "Users read their own feedback"
      on public.feedback for select
      to authenticated
      using (auth.uid() = user_id)';
  end if;
end $$;

-- No update / delete policies → end users cannot mutate or delete past
-- submissions. The owner still has full access via service_role.
