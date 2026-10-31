-- Aile Mobile — Phase 2 migration 0002: Row Level Security (owner-only)
--
-- Design source: Aile/docs/modules/mobile-deployment.md (Phase 2, section 2.2)
-- Decision 1 (locked): private single-user first, RLS enforced, owner-only
-- access keyed on auth.uid() = user_id, deny-by-default on both tables.
-- Decision 4 (locked): deletions are SOFT (UPDATE deleted_at), so the UPDATE
-- policy is the one that governs normal deletion. A scoped DELETE policy is
-- still defined so any future hard delete / purge cannot cross users.
--
-- With RLS enabled and no policy for an action, that action is denied for
-- non-owner roles by default. Policies below grant owner-only access.
-- LOCAL ONLY — not applied remotely by this change. No secrets in this file.

-- ─────────────────────────────────────────────────────────────────────────────
-- tasks
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.tasks enable row level security;
-- Defense in depth: also enforce RLS for the table owner role.
alter table public.tasks force row level security;

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own"
  on public.tasks for select
  using (auth.uid() = user_id);

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own"
  on public.tasks for insert
  with check (auth.uid() = user_id);

-- Governs both edits and soft-deletes (UPDATE deleted_at). The WITH CHECK
-- clause prevents re-assigning a row to another user_id.
drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Hard delete scoped to the owner (not used for normal deletion under Decision 4;
-- kept minimal for future purge so it can never affect another user's rows).
drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own"
  on public.tasks for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- preferences
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.preferences enable row level security;
alter table public.preferences force row level security;

drop policy if exists "preferences_select_own" on public.preferences;
create policy "preferences_select_own"
  on public.preferences for select
  using (auth.uid() = user_id);

drop policy if exists "preferences_insert_own" on public.preferences;
create policy "preferences_insert_own"
  on public.preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "preferences_update_own" on public.preferences;
create policy "preferences_update_own"
  on public.preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "preferences_delete_own" on public.preferences;
create policy "preferences_delete_own"
  on public.preferences for delete
  using (auth.uid() = user_id);
