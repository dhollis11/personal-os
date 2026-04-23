-- Personal OS — Phase 3 migration (SAFE / IDEMPOTENT version)
--
-- This version is defensive: it checks what's already there before trying
-- to add things. Safe to run even if you've already run part of phase 3.
--
-- Run the whole file at once. Supabase SQL Editor → New query → paste → Run.
 
-- ─────────────────────────────────────────────────────────────
-- 1. task_lists table — user-owned custom lists
--    Safe if it already exists.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.task_lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  color       text not null default 'green',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
 
create index if not exists task_lists_user_id_idx on public.task_lists (user_id);
 
alter table public.task_lists enable row level security;
 
drop policy if exists "task_lists_select_own" on public.task_lists;
drop policy if exists "task_lists_insert_own" on public.task_lists;
drop policy if exists "task_lists_update_own" on public.task_lists;
drop policy if exists "task_lists_delete_own" on public.task_lists;
 
create policy "task_lists_select_own" on public.task_lists
  for select using (auth.uid() = user_id);
create policy "task_lists_insert_own" on public.task_lists
  for insert with check (auth.uid() = user_id);
create policy "task_lists_update_own" on public.task_lists
  for update using (auth.uid() = user_id);
create policy "task_lists_delete_own" on public.task_lists
  for delete using (auth.uid() = user_id);
 
-- ─────────────────────────────────────────────────────────────
-- 2. tasks table — add whatever columns are missing
--    Each ADD COLUMN IF NOT EXISTS is independently safe.
-- ─────────────────────────────────────────────────────────────
 
-- The display-friendly "due" string (e.g. "Today", "Apr 28"). Kept nullable.
alter table public.tasks
  add column if not exists due text;
 
-- The structured due date. Nullable. This is the one that was missing from
-- your database and caused the earlier error.
alter table public.tasks
  add column if not exists due_at date;
 
-- list_name — the original version stored this as a plain string alongside
-- list_id. We keep both for backwards compatibility.
alter table public.tasks
  add column if not exists list_name text not null default 'Inbox';
 
-- If list_id exists as NOT NULL (from the older schema), relax it so
-- tasks can live without a list_id. We need to drop the not-null constraint
-- IF it's actually there, and this is the safe way to do it in Postgres.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'list_id'
      and is_nullable = 'NO'
  ) then
    alter table public.tasks alter column list_id drop not null;
  end if;
end $$;
 
-- If list_id doesn't exist yet, add it as nullable fk to task_lists.
alter table public.tasks
  add column if not exists list_id uuid references public.task_lists(id) on delete set null;
 
-- Remaining new columns
alter table public.tasks
  add column if not exists sort_order integer not null default 0;
 
alter table public.tasks
  add column if not exists notes text;
 
alter table public.tasks
  add column if not exists recurrence jsonb;
 
alter table public.tasks
  add column if not exists parent_id uuid references public.tasks(id) on delete set null;
 
alter table public.tasks
  add column if not exists updated_at timestamptz not null default now();
 
-- Keep updated_at fresh on edits
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end
$$;
 
drop trigger if exists tasks_touch on public.tasks;
create trigger tasks_touch before update on public.tasks
  for each row execute procedure public.touch_updated_at();
 
-- Indexes — `create index if not exists` is safe to re-run
create index if not exists tasks_list_id_idx   on public.tasks (list_id);
create index if not exists tasks_parent_id_idx on public.tasks (parent_id);
create index if not exists tasks_user_due_idx  on public.tasks (user_id, due_at);
 
-- Make sure RLS + policies are in place on tasks (a no-op if already set)
alter table public.tasks enable row level security;
 
drop policy if exists "tasks_select_own" on public.tasks;
drop policy if exists "tasks_insert_own" on public.tasks;
drop policy if exists "tasks_update_own" on public.tasks;
drop policy if exists "tasks_delete_own" on public.tasks;
 
create policy "tasks_select_own" on public.tasks
  for select using (auth.uid() = user_id);
create policy "tasks_insert_own" on public.tasks
  for insert with check (auth.uid() = user_id);
create policy "tasks_update_own" on public.tasks
  for update using (auth.uid() = user_id);
create policy "tasks_delete_own" on public.tasks
  for delete using (auth.uid() = user_id);
 
-- ─────────────────────────────────────────────────────────────
-- 3. CLEAR SEED DATA — start fresh as requested
--    Only affects the currently logged-in user. RLS protects others.
-- ─────────────────────────────────────────────────────────────
delete from public.tasks     where user_id = auth.uid();
delete from public.occasions where user_id = auth.uid();
 
-- ─────────────────────────────────────────────────────────────
-- 4. SEED A STARTER LIST so the UI has somewhere to put things
-- ─────────────────────────────────────────────────────────────
insert into public.task_lists (user_id, name, color, sort_order)
select auth.uid(), 'Inbox', 'green', 0
where auth.uid() is not null
  and not exists (
    select 1 from public.task_lists
    where user_id = auth.uid() and name = 'Inbox'
  );
