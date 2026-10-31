-- Aile Mobile — Phase 2 migration 0001: initial schema
-- Tables: tasks, preferences
--
-- Design source: Aile/docs/modules/mobile-deployment.md (Phase 2, section 2.1)
-- mirrored against the verified desktop types (ai-task-manager/src/types/index.ts):
--   Task: id, title, description, priority('low'|'medium'|'high'),
--         status('todo'|'in_progress'|'done'), category, deadline(YYYY-MM-DD),
--         estimated_duration, created_at, completed_at
--   Preferences: defaultPriority, defaultStatus, accentColor
--         (accent one of: indigo | emerald | amber | rose | sky)
--
-- Cross-device sync fields (Aile, not in the desktop app):
--   id       -> uuid stable identity (desktop uses an autoincrement integer id)
--   user_id  -> ownership (FK to auth.users), used by RLS in 0002_rls.sql
--   updated_at -> last-write-wins ordering (trigger-maintained)
--   deleted_at -> soft-delete tombstone (deletions propagate instead of re-syncing)
--
-- This migration is LOCAL ONLY. It is not applied remotely by this change.
-- No credentials or secrets appear in this file.

-- gen_random_uuid() is provided by pgcrypto. Supabase enables it by default;
-- this is defensive and idempotent.
create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- Shared trigger: keep updated_at current on every UPDATE.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- tasks
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id                 uuid        primary key default gen_random_uuid(),
  user_id            uuid        not null references auth.users (id) on delete cascade,
  title              text        not null,
  description        text,
  priority           text        not null default 'medium'
                       check (priority in ('low', 'medium', 'high')),
  status             text        not null default 'todo'
                       check (status in ('todo', 'in_progress', 'done')),
  category           text,
  deadline           date,
  estimated_duration integer
                       check (estimated_duration is null or estimated_duration >= 0),
  created_at         timestamptz not null default now(),
  completed_at       timestamptz,
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz,
  -- A non-empty title mirrors the desktop validation (title is required).
  constraint tasks_title_not_blank check (length(btrim(title)) > 0)
);

-- Ownership lookups and the common "my live tasks" query (deleted_at is null).
create index if not exists tasks_user_id_idx         on public.tasks (user_id);
create index if not exists tasks_user_live_idx        on public.tasks (user_id, deleted_at);
create index if not exists tasks_user_updated_at_idx  on public.tasks (user_id, updated_at);

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row
  execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- preferences  (one row per user; replaces the desktop key/value `settings`
-- table with typed columns for the three real preference keys)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.preferences (
  user_id          uuid        primary key references auth.users (id) on delete cascade,
  default_priority text        not null default 'medium'
                     check (default_priority in ('low', 'medium', 'high')),
  default_status   text        not null default 'todo'
                     check (default_status in ('todo', 'in_progress', 'done')),
  accent_color     text        not null default 'indigo'
                     check (accent_color in ('indigo', 'emerald', 'amber', 'rose', 'sky')),
  updated_at       timestamptz not null default now()
);

-- one-row-per-user is enforced structurally by user_id being the primary key.

drop trigger if exists preferences_set_updated_at on public.preferences;
create trigger preferences_set_updated_at
  before update on public.preferences
  for each row
  execute function public.set_updated_at();
