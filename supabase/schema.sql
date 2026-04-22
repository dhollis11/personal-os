-- Personal OS — database schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → Run).
-- It creates three tables, enables Row Level Security, and adds policies so each
-- user can only read/write their own rows.

-- ─── TASKS ────────────────────────────────────────────────────────────────
-- Multiple lists per user (Work / Home / Disc Golf / etc.)
-- tasks belong to a list. "done" is just a boolean; "due" is nullable so you
-- can have tasks with no deadline.
create table if not exists public.task_lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  color       text not null default 'green',   -- 'green' | 'blue' | 'amber'
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  list_id     uuid not null references public.task_lists(id) on delete cascade,
  title       text not null,
  due         date,                              -- nullable
  priority    text not null default 'M' check (priority in ('L','M','H')),
  done        boolean not null default false,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists tasks_user_list_idx on public.tasks(user_id, list_id);

-- ─── OCCASIONS ────────────────────────────────────────────────────────────
-- Birthdays, anniversaries, etc. "month_day" is stored as MM-DD text so the
-- same row fires every year without storing a specific year.
create table if not exists public.occasions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  who        text not null,
  kind       text not null default 'birthday' check (kind in ('birthday','anniversary','other')),
  month_day  text not null check (month_day ~ '^\d{2}-\d{2}$'),   -- e.g. '04-29'
  created_at timestamptz not null default now()
);

create index if not exists occasions_user_idx on public.occasions(user_id);

-- ─── SETTINGS ─────────────────────────────────────────────────────────────
-- Per-user JSON blob for preferences (locations, FX pair, etc.)
-- One row per user, upserted on change.
create table if not exists public.settings (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────
alter table public.task_lists enable row level security;
alter table public.tasks      enable row level security;
alter table public.occasions  enable row level security;
alter table public.settings   enable row level security;

-- The (select auth.uid()) pattern is the current performance-optimized form:
-- Postgres evaluates auth.uid() once per query instead of once per row.

-- task_lists
drop policy if exists "task_lists: select own" on public.task_lists;
create policy "task_lists: select own" on public.task_lists
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "task_lists: insert own" on public.task_lists;
create policy "task_lists: insert own" on public.task_lists
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "task_lists: update own" on public.task_lists;
create policy "task_lists: update own" on public.task_lists
  for update to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "task_lists: delete own" on public.task_lists;
create policy "task_lists: delete own" on public.task_lists
  for delete to authenticated using ((select auth.uid()) = user_id);

-- tasks
drop policy if exists "tasks: select own" on public.tasks;
create policy "tasks: select own" on public.tasks
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "tasks: insert own" on public.tasks;
create policy "tasks: insert own" on public.tasks
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "tasks: update own" on public.tasks;
create policy "tasks: update own" on public.tasks
  for update to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "tasks: delete own" on public.tasks;
create policy "tasks: delete own" on public.tasks
  for delete to authenticated using ((select auth.uid()) = user_id);

-- occasions
drop policy if exists "occasions: select own" on public.occasions;
create policy "occasions: select own" on public.occasions
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "occasions: insert own" on public.occasions;
create policy "occasions: insert own" on public.occasions
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "occasions: update own" on public.occasions;
create policy "occasions: update own" on public.occasions
  for update to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "occasions: delete own" on public.occasions;
create policy "occasions: delete own" on public.occasions
  for delete to authenticated using ((select auth.uid()) = user_id);

-- settings
drop policy if exists "settings: select own" on public.settings;
create policy "settings: select own" on public.settings
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "settings: upsert own" on public.settings;
create policy "settings: upsert own" on public.settings
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "settings: update own" on public.settings;
create policy "settings: update own" on public.settings
  for update to authenticated using ((select auth.uid()) = user_id);

-- ─── SEED: first-run defaults ──────────────────────────────────────────────
-- When a new user signs up, create their default task lists so the app looks
-- populated instead of empty.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.task_lists (user_id, name, color, sort_order) values
    (new.id, 'Work',     'green', 0),
    (new.id, 'Home',     'blue',  1),
    (new.id, 'Personal', 'amber', 2);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
