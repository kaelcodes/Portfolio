# Aile Mobile — Supabase (Phase 2 database foundation)

Local database foundation only. **Nothing here is applied remotely by these files.** No credentials or secrets are stored in this folder.

## Migrations

| File | Purpose |
|---|---|
| `migrations/0001_init.sql` | `tasks` and `preferences` tables: UUID identity, `user_id` ownership, constraints, indexes, and an `updated_at` trigger. |
| `migrations/0002_rls.sql` | Enables Row Level Security and owner-only (`auth.uid() = user_id`) policies on both tables. |

Apply `0001` before `0002`.

## How to apply (performed by the owner, later — not done by these files)

Against the existing Supabase project (currently the Ireland region for dev/test; region migration deferred until planned test runs pass):

- **Supabase SQL Editor:** paste `0001_init.sql`, run; then `0002_rls.sql`, run.
- **Supabase CLI** (if installed and linked): `supabase db push`.

## Design references (do not duplicate here)

- `../docs/modules/mobile-deployment.md` → Phase 2 (sections 2.1 schema, 2.2 auth/RLS).
- Verified desktop types: `../../ai-task-manager/src/types/index.ts` (`Task`, `Preferences`).

## Applying DDL vs. inserting application data

These are two different operations — do not conflate them:

- **Applying the DDL migrations** (the `CREATE TABLE` / `CREATE POLICY` statements in `0001` and `0002`) via the SQL Editor or `supabase db push` works normally; DDL runs with owner privileges and is unaffected by RLS.
- **Inserting application data (tasks/preferences) must go through the intended authenticated import path, NOT a privileged SQL-editor seed.** `0002` enables `FORCE ROW LEVEL SECURITY`, which subjects even the table-owner role to the owner-only policies. Every policy requires `auth.uid() = user_id`, and `auth.uid()` is null in a SQL-editor / migration context (no end-user JWT) — so an owner-role bulk `INSERT` of rows will be **rejected (zero rows written)**. Do not assume privileged SQL-editor seeding will work.
- The planned one-time **desktop import** therefore runs through the authenticated owner path (an Edge Function using the `service_role` key, which bypasses RLS, or an insert carrying the owner's user JWT so `user_id = auth.uid()`), exactly as described in the Phase 2 plan — never as a raw SQL-editor insert.

## Notes

- `preferences` is one row per user (enforced by `user_id` as the primary key).
- Deletions are **soft** (`UPDATE deleted_at`) per the locked Phase 2 decision; the `updated_at` trigger maintains last-write-wins ordering. Tombstone purge / final sync behavior is deferred to Phase 4.
- The single-owner constraint (public sign-ups disabled) is a Supabase **Auth dashboard** setting, not SQL — see the Phase 2 plan.
