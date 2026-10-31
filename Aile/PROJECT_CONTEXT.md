### AILE — MASTER PROJECT CONTEXT & DEVELOPMENT ROADMAP

#### 1. Project Overview
**Aile** is the broader platform that grows out of the existing **AI Task Manager** Windows desktop application. The first Aile initiative is **Aile Mobile**: a mobile-first Progressive Web App (PWA) that makes the user's tasks and AI assistant accessible from a phone, deployed online, and designed so it can later expand into a full multi-surface Aile platform.

This repository documents **planning only**. No Aile application code exists yet. The current AI Task Manager desktop app (Tauri + Rust + SQLite, v0.2 track) remains the source of truth and must be preserved unchanged.

**Current status: PLANNING. First module — Aile Mobile (PWA + online deployment) — is PLANNED — NOT IMPLEMENTED. Phase 1 complete (architecture + verified Supabase-over-Firebase recommendation). Decision confirmed: use Supabase Free, accepting occasional inactivity pauses (Option A). Phase 2 (backend/auth/database) is PLANNED in detail with its four key decisions LOCKED (email+password single-owner + RLS; plain Gemini chat first, structured actions deferred; Supabase Free with pauses accepted and no keep-alive; `deleted_at` tombstones) — all specified but NOT implemented (no project, no deploy, no code). Free-tier figures verified 2026-10-26 but not permanent — re-verify before deploying.** See `docs/modules/mobile-deployment.md`.

#### 2. Relationship to AI Task Manager
* The desktop app lives at `../ai-task-manager` and is complete through v1.0 (Modules 1–10) with a v0.2 track in progress. Its full context is in `../ai-task-manager/PROJECT_CONTEXT.md`.
* Aile Mobile is the realization of the desktop app's planned "Future phase — Cross-device sync / mobile architecture" (planning only in v0.2).
* The desktop app's delivery-layer separation (e.g. `scheduling.ts` for rules vs `notifications.ts` for delivery) is intended to make shared logic reusable without rewriting core rules.

#### 3. Confirmed Decisions
These are agreed and fixed for the Aile Mobile plan:
1. **Mobile-first PWA**, deployed online, expandable into the broader Aile platform.
2. **Private single-user access initially**, with authentication required before any task data is reachable.
3. **Shared tasks and preferences** between Windows desktop and mobile are a planned goal.
4. **Preserve the existing Tauri + Rust + SQLite desktop app and its local data** — no destructive change to it.
5. **Hosted backend + hosted database**; the **Gemini API key stays server-side** and is never shipped to the browser/PWA bundle.
6. **Basic offline viewing and in-app reminders first**; push notifications are deferred to a later phase.
7. **Prefer free-tier services initially**, with current limits verified before any provider is chosen.
8. **Incremental delivery** across six phases (see Section 4).

#### 4. Phase Roadmap (planning)
1. **Architecture** — define the shared data model, API contract, and client/server boundaries.
2. **Backend / Auth / Database** — hosted backend, authentication, hosted database; Gemini proxied server-side.
3. **Mobile UI** — mobile-first PWA shell (installable, responsive) reusing task concepts from the desktop app.
4. **Synchronization** — shared tasks/preferences between desktop and mobile; conflict handling.
5. **Deployment / Testing** — online deployment, cross-device acceptance testing.
6. **Hardening** — security review, rate limiting, secret handling, offline/edge-case robustness.

#### 5. Phase 1 Architecture Decision (recorded)
Established by read-only inspection of the desktop app (see `docs/modules/mobile-deployment.md` → "Phase 1" for full rationale):
* **Recommended stack (verified Phase 1b):** a static mobile-first PWA over HTTPS to **Supabase** — managed **Postgres + Auth + Edge Functions** — with the **Gemini key held server-side** in an Edge Function, mirroring the desktop app's Rust-proxy boundary. Chosen over **Firebase** because Firebase's Cloud Functions require the billed **Blaze** plan (a card), whereas Supabase runs the whole stack on its Free plan, and because the desktop data is relational (Postgres maps 1:1; Firestore would force a NoSQL remodel). **Key trade-off:** Supabase Free projects **pause after ~7 days of inactivity** (cold start on next use) — only Pro (~$25/mo/org, re-verify) disables this.
* **Reuse:** portable domain types and pure logic (`scheduling.ts`, `analytics.ts`, `parseTaskBackup`). **Build new:** PWA data layer (HTTP, not Tauri SQL), mobile UI, hosted API, hosted schema.
* **Migration/sync:** one-time **tasks-only JSON seed** (existing export, ids discarded) into the hosted DB; later an **optional, additive** desktop sync client with hosted-DB-as-source-of-truth. Desktop app stays unchanged until Phase 4.

#### 5b. Phase 2 Decisions (LOCKED 2026-10-26)
Confirmed by the owner; full detail in `docs/modules/mobile-deployment.md` → "Phase 2 — Confirmed decisions". Planning-only — nothing implemented.
1. **Auth:** Supabase Auth **email + password**, **single owner**, **public sign-ups disabled**, **RLS enforced** (owner-only via `auth.uid() = user_id`).
2. **AI chat:** **plain Gemini chat first** via the authenticated server-side `ai-chat` Edge Function; **structured task-actions deferred.**
3. **Supabase Free (Option A):** accept occasional 7-day inactivity pauses; **no keep-alive / scheduled ping** for now.
4. **Soft-delete:** **`deleted_at` tombstones**; permanent cleanup/purge and final sync behavior **deferred to Phase 4**.

*Pre-migration review outcomes (recorded):* (a) the migrations enable `FORCE ROW LEVEL SECURITY`, so application-data inserts must use the **authenticated import path** (Edge Function `service_role` or owner JWT), **not** a privileged SQL-editor seed — applying DDL is unaffected. (b) The `updated_at` trigger stamps **server time on every UPDATE**; correct for Phase 2, but Phase 4 last-write-wins must use an origin timestamp for cross-device edits. Both detailed in `docs/modules/mobile-deployment.md` and `supabase/README.md`.

#### 6. Open Technical Decisions (require validation — not yet chosen)
Documented as unresolved on purpose; no provider or library is committed:
* Gemini proxy placement is resolved (Supabase Edge Function, Decision 2). Remaining: the exact Gemini model/endpoint string to reuse from the desktop app at implementation time.
* Provider is chosen (Supabase Free, confirmed); re-verify current official free-tier limits before deploying, as figures are not permanent.
* **Minimum schema additions for safe sync (Phase 1b finding, NOT yet applied — additive migrations planned for Phase 4):** (1) `updated_at` for last-write-wins ordering; (2) a **soft-delete tombstone** (`deleted_at`/`is_deleted`) so deletions propagate instead of re-syncing back; (3) a **stable cross-device UUID** separate from the local autoincrement `id`; (4) optional later per-row sync-state for offline writes. Tombstone retention/purge is unresolved — decide with the conflict rule.
* Desktop sync-client shape (push/pull cadence, reversibility guards) — single-user now must not block later multi-user.
* PWA offline storage approach and cache scope for "basic offline viewing".
* Push-notification delivery mechanism (later phase).

#### 7. Next Steps
1. Review and confirm the Phase 1 architecture decision (Section 5) and the detailed plan in `docs/modules/mobile-deployment.md`.
2. Resolve the Section 6 open decisions — **verify each provider's current official free-tier limits first** (especially any inactivity pause) — before Phase 2 implementation is authorized.
3. Keep this context and the module doc updated as decisions are confirmed.

#### 8. Supabase Security Audit (2026-10-31)

Read-only audit of the live `Aile-mobile` database and the implemented app. **No code, SQL, Supabase settings, permissions, or environment files were changed.** This does not claim Aile is fully secure, and cross-user isolation has **not** been proven at runtime (see limitations).

**Verified checks (passed):**
* Live `public.tasks` and `public.preferences` columns/types match the expected schema.
* RLS is **enabled and forced** on both tables.
* **Eight owner-scoped RLS policies** use `auth.uid() = user_id`; UPDATE policies apply both `USING` and `WITH CHECK`.
* Effective table privileges for `anon` and PostgreSQL `PUBLIC` are **false** for SELECT/INSERT/UPDATE/DELETE/TRUNCATE on both tables; `anon` reads returned permission-denied.
* `anon`, `authenticated`, `service_role` have `USAGE` but **not** `CREATE` on the public schema.
* `anon`/`authenticated` are not superusers and lack BYPASSRLS/elevated attributes. `service_role` has BYPASSRLS (expected for Supabase) — **its secret must never reach browser code.**
* Expected primary keys, ownership FKs, validation constraints, timestamp triggers, and `set_updated_at()` confirmed. `set_updated_at()` is owned by `postgres`, is **not** SECURITY DEFINER, and sets `NEW.updated_at := now()`.
* App services derive ownership from the authenticated session; task deletion is a soft-delete timestamp.
* Production build passed; prior bundle scan found no service-role credentials and no dev-harness code.
* User verified task operations, preferences persistence/default behavior, responsive UI, and accent colors.

**Confirmed finding — deferred by choice (not fixed):**
* The `authenticated` role has effective **TRUNCATE** privileges on `public.tasks` and `public.preferences`. PostgreSQL TRUNCATE is **not** restricted by RLS, so this is an unnecessary least-privilege risk for ordinary frontend operations. No change made — the user chose to finish the read-only audit first and defer fixes.
* **Proposed future scoped fix (DO NOT execute as part of this doc update):**
  ```sql
  REVOKE TRUNCATE ON TABLE public.tasks FROM authenticated;
  REVOKE TRUNCATE ON TABLE public.preferences FROM authenticated;
  ```
  After applying, verify effective TRUNCATE is **false**; if it remains effective, investigate other grant paths. Do **not** alter schema-wide default privileges as part of this narrow remediation.
* Note: `authenticated` also has DELETE, TRIGGER, and REFERENCES privileges. Review these before altering, because the **dev-only service harness uses a scoped hard DELETE** for temporary preferences cleanup.

**Remaining limitations / untested assumptions:**
* **Cross-user isolation NOT runtime-tested** (no second test account). Policy definitions alone do not prove runtime isolation.
* Live schema was inspected in detail, but **no comprehensive automated comparison** against the full migration history was performed.
* Session-expiry UX not specifically tested.
* Broad schema default privileges were observed; they apply to future objects and do not independently explain the existing table grants.
* `AccessTest` counts soft-deleted task tombstones; `listTasks()` filters `deleted_at IS NULL` — understood, no change requested.
* The dev service harness is excluded from the production bundle; **do not remove it now.**
