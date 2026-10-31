# Aile Mobile — Module: PWA + Online Deployment

**Status:** PLANNED — NOT IMPLEMENTED
**Date:** October 26, 2026

## Scope

Make the AI Task Manager's tasks and AI assistant accessible from mobile through a mobile-first Progressive Web App (PWA) deployed online, built so it can later expand into the broader Aile platform. Initial access is private and single-user, gated by authentication. Shared tasks/preferences between Windows desktop and mobile is a planned goal. The existing Tauri + Rust + SQLite desktop app and its local data are preserved unchanged.

This document is a plan only. No application code, dependencies, deployment, or provider accounts are created by it.

### In scope (initial)
- Mobile-first, installable PWA front end (responsive, add-to-home-screen).
- Authentication before any task data is reachable (single user).
- Hosted backend and hosted database.
- Server-side Gemini proxy so the API key never reaches the browser.
- Basic offline viewing of already-loaded data.
- In-app reminders (reusing the desktop reminder rules where practical).

### Out of scope (initial — see Future work)
- Push notifications (web/mobile) — later phase.
- Multi-user / sharing beyond the single owner.
- Native iOS/Android app store builds.
- Full offline write/edit with background sync (initial offline is read/view only).

## Confirmed decisions vs. decisions needing validation

**Confirmed (agreed):**
- Mobile-first PWA, online-deployed, expandable into Aile.
- Private single-user, authentication required.
- Shared tasks/preferences (desktop ↔ mobile) planned.
- Preserve the existing Tauri + Rust + SQLite desktop app and its data.
- Hosted backend + hosted database; Gemini secrets server-side only.
- Offline viewing + in-app reminders first; push notifications later.
- Prefer free-tier services, verifying current limits first.
- Six-phase incremental delivery.

**Needs validation (NOT yet chosen — do not assume):**
- Frontend/backend/database hosting providers and their **current** free-tier limits. *(Phase 1 recommends a Postgres+auth BaaS + static PWA host; provider still to be confirmed — see Phase 1 section.)*
- Authentication provider/mechanism. *(Phase 1 recommends managed auth bundled with the BaaS; specific provider unconfirmed.)*
- Sync model and conflict-resolution rules. *(Phase 1 recommends hosted-DB-as-source-of-truth + last-write-wins; needs an `updated_at` timestamp that does not yet exist.)*
- Desktop app's role in sync. *(Phase 1 recommends: one-time JSON seed first, then an optional additive sync client later — unchanged desktop app until Phase 4.)*
- PWA offline storage approach and cache scope.
- Push-notification delivery mechanism (later).

> **Phase 1 architecture decision recorded** at the end of this document. The recommendation is justified by inspection of the existing code; provider figures still require external verification and all items above remain open until confirmed.

## Architecture (proposed)

- **Frontend:** React + TypeScript PWA (service worker + web app manifest), mobile-first layout. Reuses task concepts and, where practical, pure logic from the desktop app (e.g. scheduling/reminder rules) without importing Tauri-specific code.
- **Backend:** hosted service exposing an authenticated API for tasks and preferences, and a Gemini proxy endpoint. The browser never holds the Gemini key; all AI calls go through the backend.
- **Database:** hosted database holding tasks/preferences for the authenticated user. The desktop app keeps its local SQLite store; how the two reconcile is an open sync decision (Phase 4).
- **AI provider:** Google Gemini, called only server-side.
- **Desktop app:** unchanged. Any participation in sync must be additive and must not endanger existing local data.

Provider-agnostic by design: hosting, auth, and database are chosen later (Section above) so the architecture is not coupled to an unverified free tier.

## Phases (incremental)

1. **Architecture** — shared data model, API contract, client/server boundary, offline/caching approach.
2. **Backend / Auth / Database** — hosted backend, authentication, hosted database, server-side Gemini proxy.
3. **Mobile UI** — installable mobile-first PWA shell; task viewing/management screens.
4. **Synchronization** — shared tasks/preferences between desktop and mobile; conflict handling; define desktop's role.
5. **Deployment / Testing** — online deployment; cross-device acceptance testing.
6. **Hardening** — security review, rate limiting, secret handling, offline/edge-case robustness.

## Acceptance criteria

Per-phase; a phase is complete only when its criteria are met and recorded.

- **Architecture:** data model, API contract, and offline/cache scope documented and reviewed; desktop-preservation constraint explicitly honored.
- **Backend/Auth/DB:** unauthenticated requests to task data are rejected; an authenticated single user can create/read/update/delete tasks against the hosted DB; Gemini responses are returned via the server proxy with no key present in any client response or bundle.
- **Mobile UI:** PWA is installable on a phone (manifest + service worker), renders mobile-first with no horizontal overflow, and performs task CRUD against the backend.
- **Synchronization:** a task/preference change on one surface becomes visible on the other per the agreed sync rule; the defined conflict rule is applied deterministically; the desktop app's existing local data is not lost or corrupted.
- **Deployment/Testing:** the PWA is reachable at its deployed URL behind auth; cross-device acceptance tests pass; basic offline viewing shows previously loaded data with no crash when offline.
- **Hardening:** security requirements below are verified; no secret appears in client bundles/logs; rate limiting and error handling confirmed.

## Security requirements

- Gemini API key and all provider secrets remain **server-side only**; never in the PWA bundle, client logs, or version control.
- Authentication required before any task data is reachable; no unauthenticated data path.
- Transport encrypted (HTTPS) end to end.
- Backend validates and authorizes every request against the authenticated user; no trust in client-supplied identity.
- Least-privilege credentials for backend↔database and backend↔Gemini.
- Secret scan of the deployed frontend bundle shows zero credential-like matches (mirrors the desktop app's release check).
- Preserve the desktop app's existing secret handling (Windows Credential Manager) untouched.

## Dependencies

- Existing AI Task Manager desktop app (`../ai-task-manager`) as the conceptual/data-model source.
- A hosted frontend, a hosted backend, and a hosted database — **providers not yet selected** (free-tier limits to be verified first).
- An authentication mechanism — **not yet selected**.
- Google Gemini API access (reused from the desktop app; key held server-side).
- No new dependency is installed by this planning document.

## Risks

- **Free-tier limits** (requests, rows, bandwidth, cold starts, sleep) may be insufficient or may change — must be verified against current terms before committing; avoid lock-in.
- **Sync complexity / conflicts** between an offline-capable desktop store and a hosted DB could cause data divergence — needs an explicit, tested conflict rule.
- **Desktop data safety** — any sync bridge risks the existing local SQLite data if done carelessly; sync must be additive and reversible.
- **Secret exposure** — a server-side key accidentally bundled client-side would leak; enforced by the bundle secret scan.
- **Offline scope creep** — "basic offline viewing" can be mistaken for full offline editing; keep initial offline read-only.
- **Auth scope** — single-user now must not architecturally block later multi-user.
- **Gemini availability** — the external model-availability limitation noted for the desktop app (Module 10) also applies here.

## Verification (planned — none performed yet)

Nothing is implemented, so no verification has been run. Planned verification per phase:
- Build/type checks pass for the PWA (`tsc --noEmit`, production build).
- Auth enforced: unauthenticated API calls rejected (tested).
- Gemini proxy: key absent from all client responses and from the built bundle (secret scan, 0 matches).
- PWA installability (manifest + service worker) confirmed on a device/emulator.
- Cross-device sync verified with a real change round-trip; conflict rule exercised.
- Desktop app still launches and its local data is intact after any sync integration.
- Offline viewing confirmed with the network disabled.

## Limitations (initial)

- Single-user only; no sharing/collaboration.
- Offline is view-only for already-loaded data; no offline writes/background sync initially.
- No push notifications initially (in-app reminders only).
- Not a native app-store build; PWA install only.
- Hosting/auth/DB providers unselected, so performance and quota characteristics are unknown until chosen and tested.

## Future work

- Push notifications (web/mobile) reusing the shared reminder rules.
- Full offline write with background synchronization.
- Multi-user accounts and task sharing (the broader Aile platform).
- Native iOS/Android packaging if warranted.
- Richer Aile platform features beyond task management.

---

## Phase 1 — Architecture & Technical Validation (findings & decision)

**Date:** October 26, 2026
**Status:** Phase 1 decision recorded (planning). Module remains **PLANNED — NOT IMPLEMENTED**.

This section records the Phase 1 read-only evaluation of the existing desktop app and a recommended architecture. Provider selections are **recommendations with limits to verify**, not commitments. Code was inspected read-only; nothing was modified.

### What was inspected (desktop app, read-only)
- `src/types/index.ts` — the data model: `Task` (10 flat columns), `Preferences` (3 keys), and an existing versioned `TaskBackup` envelope.
- `src/services/index.ts` — CRUD layer: SQL via `@tauri-apps/plugin-sql` (`getDatabase()`), plus `parseTaskBackup` (pure, whole-file validation) and an atomic `import_tasks` Rust command.
- `src-tauri/src/lib.rs` — SQLite migrations defining the exact schema (`tasks` v1, `settings` v2) and registered commands.
- `src/ai/index.ts` — Gemini access is already **proxied through Rust** (`commands::chat`); the key lives in the OS keyring and the frontend only ever sees a boolean status + reply string.

### 1. Frontend reuse for a mobile PWA — feasible, with a seam
- **Reusable as-is:** the TypeScript domain types (`Task`, `Preferences`, `Priority`, `TaskStatus`) and the pure logic modules (`scheduling.ts` rules, `analytics.ts` calculations, `parseTaskBackup` validation) — none import Tauri and all are portable to a browser/server.
- **Not reusable as-is:** the data-access layer. `services/index.ts` binds to `@tauri-apps/plugin-sql` and a Tauri `invoke`, and UI components assume desktop layout. The PWA needs its **own** data layer that calls an HTTP API instead of local SQLite.
- **Decision (confirmed):** share the pure model/logic via copy or a small shared package; build a new PWA-specific data layer and mobile-first UI. Do **not** try to run the Tauri SQL plugin in the browser.

### 2. Tauri/Rust/SQLite boundary — clean and informative
- The desktop app already demonstrates the exact pattern Aile's backend needs: **a trusted server process holding the provider key and proxying Gemini**, returning only safe text to the client. The hosted backend replicates this boundary over HTTP.
- The SQLite schema is small and flat, so it maps directly to a hosted Postgres/SQLite table with the same columns. The `import_tasks` atomic-transaction approach is a good model for a server bulk-insert endpoint.
- **Desktop app stays unchanged in Phase 1–3.** It only gains an (additive, optional) sync client later, in Phase 4.

### 3. Hosted backend / auth / database — recommendation (limits to verify)
- **Recommended simplest maintainable stack for a private single user that can expand later:** a **Backend-as-a-Service that bundles Postgres + auth + an edge/function runtime**, fronted by a static PWA host. This minimizes custom backend code (auth, row security, and DB come together) while leaving room to grow into multi-user.
- **Leading free-tier candidates (figures below REQUIRE verification against each provider's official pricing page at adoption time — do not treat as final):**
  - **Database + Auth (BaaS):** *Supabase* free tier — reported ≈500 MB Postgres per project, built-in auth, generous API request allowance, **but free projects reportedly pause after ~7 days of inactivity with a ~10–30s cold start.** Sources: [Supabase pricing](https://supabase.com/pricing), [project pausing docs](https://supabase.com/docs/guides/platform/free-project-pausing). The pause behavior is the single most important risk for an intermittently-used personal app and must be confirmed.
  - **PWA host + serverless functions (Gemini proxy):** *Vercel* Hobby — reported $0, ≈100 GB bandwidth/month, serverless functions, **non-commercial use only**. Sources: [Vercel Hobby plan](https://vercel.com/docs/accounts/plans/hobby), [limits overview](https://vercel.com/docs/limits/overview).
  - Content was rephrased for compliance with licensing restrictions; all figures are third-party/provider snapshots that must be re-checked before selection.
- **Why this over a hand-rolled server + separate DB + separate auth:** fewer moving parts, less security surface to get wrong (managed auth + row-level security), and a faster path to a working private deployment. A custom Node/Rust API on a separate host remains a fallback if a BaaS free tier proves unsuitable (e.g. the inactivity pause is unacceptable).
- **Still UNRESOLVED (requires external verification / decision):** final provider choice; whether Supabase's inactivity pause is tolerable or a disqualifier; whether to self-host the Gemini proxy as an edge function vs. a BaaS function; exact current free-tier numbers.

### 4. Desktop↔mobile synchronization & migration — recommended strategy
- **Seed migration (one-time, low risk):** reuse the existing **tasks-only JSON export** as the initial import into the hosted DB. `parseTaskBackup` already validates whole-file and **discards incoming ids** (new ids generated on insert), so a one-way desktop→cloud seed is safe and already-specified logic. This is the recommended first migration step and needs no change to the desktop app.
- **Ongoing sync (Phase 4, after mobile UI exists):** treat the **hosted DB as the source of truth** once online. Add an **optional, additive** sync client to the desktop app that pushes/pulls against the API. Keep it reversible and guarded so the local SQLite store is never destructively overwritten.
- **Conflict rule (recommended default, to validate):** last-write-wins per task using an updated-at timestamp. **Gap:** the current schema has `created_at` and `completed_at` but **no general `updated_at`** column — a future additive migration (desktop side) or a server-side timestamp would be needed for reliable conflict resolution. Marked UNRESOLVED.
- **Confirmed constraint:** no destructive change to the desktop app or its data; sync is additive and opt-in.

### 5. Free-tier suitability & deployment requirements
- **Suitability:** for one user with a small task table, both candidate free tiers are comfortably within reported storage/bandwidth allowances. The realistic blocker is **cold-start/pause behavior** (Supabase inactivity pause), not capacity — acceptable for a personal tool, to be confirmed.
- **Deployment requirements (confirmed):** HTTPS end-to-end; Gemini key and DB credentials set as **server-side environment secrets only** (never in the PWA bundle); a secret scan of the built frontend showing zero matches (mirrors the desktop release check); auth enforced before any data path.

### Recommended architecture (summary)
```
[ Mobile PWA ]  ──HTTPS──>  [ Hosted API / functions ]  ──>  [ Hosted Postgres ]
  React+TS, SW,                auth + row security,            tasks, preferences
  mobile-first UI,             Gemini proxy (key server-side)
  reuse pure logic
          └── one-time seed: desktop tasks-only JSON export ──> hosted DB
          └── Phase 4: optional additive sync client added to desktop app
```
Rationale: reuses the desktop app's proven "trusted-server-proxies-Gemini" boundary and its portable domain logic; isolates the only non-portable piece (local SQLite access) behind a new HTTP data layer; keeps the desktop app untouched until an opt-in sync client is justified; and starts on managed free tiers to minimize custom security code.

### Components to reuse vs. build
| Reuse (portable, no change) | Build new (Aile Mobile) |
|---|---|
| `Task`/`Preferences`/`Priority`/`TaskStatus` types | PWA data layer (HTTP client, not Tauri SQL) |
| `scheduling.ts` rules, `analytics.ts` calcs | Mobile-first UI + PWA shell (manifest, service worker) |
| `parseTaskBackup` validation + backup envelope | Hosted API: auth, task/preference endpoints, Gemini proxy |
| Gemini server-proxy *pattern* (reimplemented server-side) | Hosted DB schema (mirrors existing columns) |
| One-time tasks-only JSON seed | Phase 4 optional desktop sync client (`updated_at` migration) |

### Remaining decisions (UNRESOLVED — carried forward)
- Final hosting/auth/DB provider; acceptability of the free-tier inactivity pause/cold start (**verify official current limits first**).
- Gemini proxy placement (BaaS function vs. dedicated edge/serverless function).
- Conflict-resolution rule and the missing `updated_at` timestamp (additive migration, desktop or server).
- Desktop sync client shape (push/pull cadence, reversibility guards).
- PWA offline storage approach and cache scope.

### Implementation order (confirmed)
1. Finalize providers after verifying current free-tier limits (esp. inactivity pause). 2. Stand up hosted DB + auth + Gemini proxy (Phase 2). 3. Build mobile-first PWA against the API (Phase 3). 4. One-time JSON seed, then optional additive desktop sync client with a conflict rule (Phase 4). 5. Deploy + cross-device testing (Phase 5). 6. Hardening (Phase 6).

---

## Phase 1b — Provider Comparison & Verified Recommendation

**Date:** October 26, 2026
**Status:** Recommendation recorded (planning). Module remains **PLANNED — NOT IMPLEMENTED**. No account, deployment, or code.

Research-only. Figures were checked against official provider documentation on the date above; **free tiers and quotas change and are not permanent — re-verify on the official pages before creating accounts or deploying.**

### Candidates compared
A managed Postgres+auth+functions BaaS (**Supabase**) vs. a managed NoSQL+auth+functions BaaS (**Google Firebase**). Both bundle auth, a database, and a server-side function runtime for a Gemini proxy, which is what Aile needs for a private single-user PWA.

### Supabase — verified (official docs)
- **Free plan quotas (per organization unless noted)** — from the official billing page ([billing-on-supabase](https://supabase.com/docs/guides/platform/billing-on-supabase)): Database size **500 MB per project**; Egress **5 GB**; Monthly Active Users **50,000**; Storage **1 GB**; Edge Function Invocations **500,000**; Realtime peak connections **200**; **two free projects** (paused projects don't count toward the limit).
- **Inactivity pause** — from the official pausing doc ([free-project-pausing](https://supabase.com/docs/guides/platform/free-project-pausing)): Free-plan projects pause after **~7 days** of insufficient database activity. A **warning email** is sent ~1 week before; **a few database requests per day** are typically enough to prevent it. A paused project can be **restored for up to 1 year** (data/config preserved). **Only the paid Pro plan disables pausing.**
- **Auth:** managed authentication is included on the Free plan (up to the 50,000 MAU quota). SSO MAU is **not** available on Free.
- **PostgreSQL:** yes — a dedicated Postgres instance per project (the desktop app's flat schema maps directly).
- **Gemini proxy:** supported via **Edge Functions** (500,000 free invocations); the key is held as a server-side function secret.
- **HTTPS + secrets:** managed HTTPS endpoints; environment/function secrets supported server-side.
- **Expected cost:** **$0** on Free for one user within these quotas; next tier is **Pro (~$25/month per organization)** per the pricing page — **verify current figure before relying on it.**

### Firebase — verified constraint + mixed-confidence quotas
- **Decisive constraint (official):** **Cloud Functions require the pay-as-you-go Blaze plan** — the no-cost **Spark** plan does **not** include Cloud Functions. Sources: Google's [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans) and [Cloud Functions quotas](https://firebase.google.com/docs/functions/quotas). Because Aile's Gemini proxy must run server-side, Firebase effectively **requires Blaze**, which **requires a billing account / card**, even though Blaze keeps generous free allowances. Blaze also incurs small Artifact Registry storage charges beyond the first 500 MB for deployed functions ([functions FAQ](https://firebase.google.com/docs/functions/faq-and-troubleshooting)).
- **Database/Auth:** Firestore (NoSQL) + managed Firebase Authentication; auth and Firestore are available on Spark.
- **Spark free quotas (secondary sources — NOT verified on an official page this pass; the official Firestore quota page is JS-rendered and did not return text):** reportedly ~50,000 Firestore reads/day, ~20,000 writes/day, ~1 GiB stored, ~50,000 auth MAU. **Treat as unverified until confirmed on [firebase.google.com/docs/firestore/quotas](https://firebase.google.com/docs/firestore/quotas).**
- **No automatic inactivity pause** like Supabase; on Spark a product simply stops serving when a quota is exhausted until reset (per secondary sources).
- **Relational fit:** the desktop app's data is **relational/SQL**; Firestore is document-NoSQL, so the schema and the reusable SQL-shaped logic would need remodeling.

### Recommendation: **Supabase + a static PWA host**
Recommended stack: **Supabase** (Postgres + Auth + Edge Function Gemini proxy) with the PWA served as static assets (any static host with HTTPS; the function/proxy can also live in Supabase Edge Functions to keep one provider).

**Why Supabase over Firebase for this case:**
1. **No card required to run the full stack.** Supabase runs auth + Postgres + the Gemini Edge Function proxy entirely on the **Free** plan. Firebase needs **Blaze (billing enabled)** the moment a server-side function is introduced — a materially higher commitment for a private hobby tool.
2. **Relational match.** The existing `Task`/`settings` schema is SQL; Supabase Postgres maps 1:1, preserving the reusable SQL-shaped logic. Firestore would force a NoSQL remodel.
3. **One-provider simplicity** (auth + DB + proxy together) keeps the security surface small for a single maintainer.

**Trade-offs / the cost of this choice (explicit):**
- **Inactivity pause is the real downside.** A personal app opened a few times a week risks the 7-day pause and a cold-start delay on the next visit. Mitigations to validate: a tiny scheduled keep-alive hitting the DB daily, accepting the occasional resume, or upgrading to Pro only if it becomes annoying. This is the single trade-off most likely to affect daily use.
- **Free tier is not permanent** — quotas/pricing can change; the plan must tolerate a future move to Pro (~$25/mo per org, to re-verify) or another provider.
- Firebase would avoid the pause and offer a very generous Blaze free allowance, but at the price of enabling billing and remodeling to NoSQL — not worth it here.

**Unverified / unresolved (carried forward):**
- Exact current Supabase Pro price and any Free-tier quota changes — **re-verify before deploying.**
- Firestore Spark daily quotas — unverified this pass.
- Whether the inactivity pause is acceptable or a disqualifier for the user's usage pattern — **user decision.**
- Final static-host choice for the PWA bundle and whether the Gemini proxy lives in Supabase Edge Functions vs. a separate function host.

### Minimum schema additions for safe future desktop synchronization
Phase 1 flagged that the current schema (`tasks`: `id, title, description, priority, status, category, deadline, estimated_duration, created_at, completed_at`; `settings`: `key, value`) **cannot support reliable sync or deletions across devices.** The minimum additions (to be applied later as **additive** migrations — desktop SQLite and the hosted DB in parallel; NOT applied now):

1. **`updated_at` (timestamp, UTC ISO).** Required for last-write-wins conflict resolution. Every create/update sets it. Without it, concurrent desktop/mobile edits cannot be ordered. *(Confirmed necessary; not yet present.)*
2. **Soft-delete marker — `deleted_at` (nullable timestamp) or `is_deleted` (boolean) + `updated_at`.** A hard `DELETE` cannot propagate: if mobile deletes a row, a desktop that still has it would simply re-sync it back. A tombstone lets deletions sync deterministically. *(Confirmed necessary for deletion handling.)*
3. **A stable cross-device identity — a `uuid`/`guid` column** distinct from the local autoincrement `id`. Desktop and hosted DBs assign their own integer `id`s, so a shared UUID is needed to match the same task across stores. *(Confirmed necessary; the existing JSON seed already discards ids, which is fine for a one-time seed but insufficient for ongoing sync.)*
4. **(Optional, later) a per-row `dirty`/sync-state or `last_synced_at`** to track what still needs pushing while offline. Only needed once offline *writes* are added (out of initial scope).

Tombstone retention and when tombstones can be purged are **unresolved** and should be decided with the conflict rule in Phase 4. These additions are **not** made in this phase — they are recorded so Phase 4 can implement them without surprises, and so the desktop app's eventual additive migration is planned rather than reactive.

---

## Phase 2 — Backend / Auth / Database (implementation PLAN)

**Date:** October 26, 2026
**Status:** PLAN ONLY — NOT IMPLEMENTED. No Supabase project, no deployment, no code, no secrets. Decision confirmed: **Supabase Free**, accepting occasional inactivity pauses (Option A), staying within free-tier limits where practical.

This section specifies what Phase 2 will build. Nothing here is executed yet. SQL/policy snippets are **illustrative schema definitions for review**, not applied migrations.

### 2.1 Database schema (confirmed design)

Two tables mirroring the desktop model, plus **ownership** and **cross-device sync** fields from the Phase 1b finding. All ids/timestamps chosen so the existing desktop data maps cleanly and future sync is deterministic.

**`tasks`**
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` default `gen_random_uuid()` | cross-device stable identity (replaces reliance on the desktop autoincrement `id`) |
| `user_id` | `uuid` not null | FK → `auth.users.id`; ownership for RLS |
| `title` | `text` not null | |
| `description` | `text` null | |
| `priority` | `text` not null | check in (`low`,`medium`,`high`) — mirrors desktop enum |
| `status` | `text` not null | check in (`todo`,`in_progress`,`done`) |
| `category` | `text` null | |
| `deadline` | `date` null | desktop stores `YYYY-MM-DD` |
| `estimated_duration` | `integer` null | reserved, matches desktop |
| `created_at` | `timestamptz` not null default `now()` | |
| `completed_at` | `timestamptz` null | set when status→done |
| `updated_at` | `timestamptz` not null default `now()` | **sync: last-write-wins ordering** (trigger-maintained) |
| `deleted_at` | `timestamptz` null | **sync: soft-delete tombstone** so deletions propagate |

**`preferences`** (replaces the desktop key/value `settings` for the three real keys)
| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` primary key | FK → `auth.users.id`; one row per user |
| `default_priority` | `text` not null default `'medium'` | |
| `default_status` | `text` not null default `'todo'` | |
| `accent_color` | `text` not null default `'indigo'` | one of the 5 desktop accents |
| `updated_at` | `timestamptz` not null default `now()` | sync ordering |

Supporting objects (planned): an `updated_at` **trigger** on both tables (set `updated_at = now()` on UPDATE); indexes on `tasks(user_id)` and `tasks(user_id, deleted_at)`.

> **Phase 4 synchronization caveat (recorded — do NOT change the schema or trigger now).** The implemented trigger (`0001_init.sql`) overwrites `updated_at` with the server's `now()` on **every** UPDATE. This is correct and desirable for Phase 2 (a single device making local edits — the timestamp is server-authoritative and cannot be forged by the client). But it has a consequence for Phase 4 last-write-wins sync: when a sync push applies a change that **originated on another device**, this trigger will stamp `updated_at` with the server time at push time, discarding the origin device's edit time. A naive last-write-wins comparison on `updated_at` would then compare push times, not true edit times, and could resolve conflicts incorrectly. Phase 4 must account for this — e.g. a separate origin-timestamp column (`client_updated_at`) used for conflict ordering, or a conditional trigger that preserves a supplied timestamp during sync writes. No change is made now; this is a Phase-4 design input only.

**Confirmed:** UUID PK, `user_id` ownership, `updated_at`, `deleted_at` tombstone (Decision 4). **Unresolved:** whether the API returns tombstoned rows (for sync) or hides them (for UI) — likely a query flag; tombstone purge policy (deferred to Phase 4 per Decision 4); last-write-wins timestamp semantics given the server-time `updated_at` trigger (see the Phase 4 caveat above).

### 2.2 Authentication & RLS (confirmed design)

- **Auth model:** Supabase Auth, **email+password, single user**. Sign-ups **disabled** after the owner's one account is created (Supabase Dashboard → Auth → disable new sign-ups), so the "private single-user" rule is enforced at the platform level. Email-confirmation on. No social providers initially.
- **RLS: enabled on both tables**, deny-by-default, with owner-only policies keyed on `auth.uid()`:
  ```sql
  -- illustrative, not applied
  alter table tasks enable row level security;
  create policy "own tasks - select" on tasks for select using (auth.uid() = user_id);
  create policy "own tasks - insert" on tasks for insert with check (auth.uid() = user_id);
  create policy "own tasks - update" on tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  create policy "own tasks - delete" on tasks for delete using (auth.uid() = user_id);
  -- same four policies for preferences
  ```
- **Why this is multi-user-safe later:** policies already scope by `user_id`, so enabling sign-ups in future yields correct per-user isolation with no policy rewrite. **Confirmed.**
- **Confirmed:** RLS on, owner-only via `auth.uid()`, sign-ups disabled (Decision 1). Soft-deletes use **`UPDATE deleted_at`** (Decision 4), so the `update` policy covers deletion; a hard `DELETE` policy is not required initially.

### 2.3 Server-side Gemini proxy — Supabase Edge Function (confirmed design)

- A single Edge Function (working name **`ai-chat`**) that: verifies the caller's Supabase JWT (reject if unauthenticated), reads the **Gemini key from a function secret** (env), calls the Gemini `generateContent` endpoint server-side, and returns only safe text to the client.
- **The Gemini key is NEVER sent to the browser** and never appears in the PWA bundle — it exists only as a Supabase function secret. This mirrors the desktop app's existing Rust proxy (`commands::chat`), which already keeps the key server-side.
- Reuse the desktop request/response shape and the pure **`src/ai/index.ts`** parsing/validation logic (portable, no Tauri) when porting structured task-actions later; Phase 2 covers plain chat proxying first.
- **Confirmed:** JWT-verified Edge Function, key as server secret, safe-text-only responses, **plain chat first with structured task-actions deferred** (Decision 2). **Unresolved:** Gemini model/endpoint string to reuse from the desktop app at implementation time.

### 2.4 Environment variables & setup steps (no secrets stored here)

Placeholders only — **real values are set in the Supabase Dashboard / deployment environment, never written into these docs or the repo.**

*Edge Function secrets (server-side only):*
- `GEMINI_API_KEY` — the Gemini key (the owner's existing key; set via `supabase secrets set`, not committed).
- `GEMINI_MODEL` — model id reused from the desktop app.

*PWA frontend env (public, safe to ship — these are not secrets):*
- `VITE_SUPABASE_URL` — project URL.
- `VITE_SUPABASE_ANON_KEY` — the anon public key (RLS is what protects data, not secrecy of this key).

*Setup steps (performed later by the user, in order):*
1. Create a Supabase project (Free). 2. Apply the schema + RLS + triggers (SQL editor / migration). 3. Create the single owner account, then disable sign-ups. 4. `supabase secrets set GEMINI_API_KEY=… GEMINI_MODEL=…`. 5. Deploy the `ai-chat` Edge Function. 6. Put `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in the PWA env.

*No keep-alive / scheduled ping in the initial build (Decision 3, Option A) — occasional 7-day pauses are accepted.*

**Confirmed:** the key is a server secret; anon key is public-by-design; **no keep-alive for now** (Decision 3). **Unresolved:** none for this subsection.

### 2.5 Importing existing desktop data (no desktop changes)

- **Mechanism:** reuse the desktop app's existing **tasks-only JSON export** (`exportTasksEnvelope`, `TaskBackup`, schema v2). The user exports from the desktop Settings → Data, then imports the file into Aile. **No desktop code or DB change.**
- **Server-side import:** a one-time authenticated import path (an Edge Function or a guarded SQL insert) that validates with the **same rules as `parseTaskBackup`** (whole-file validation; reject malformed/foreign files), assigns a **new `uuid`** and the owner's `user_id` per row, and sets `created_at`/`completed_at` from the file (or now), `updated_at = now()`, `deleted_at = null`. Imported desktop integer ids are **discarded** (already the desktop behavior).
- **Confirmed:** one-time, one-way desktop→cloud seed via existing export; validated; ids discarded; desktop untouched. **Unresolved:** duplicate handling on re-import (skip/replace/new-row) — reuse the desktop M3 duplicate rule once that is defined.

### 2.6 Planned files / components + verification criteria

Planned to be created in the **Aile Mobile project** (a NEW project, not the desktop app). None exist yet:

| Planned artifact | Purpose |
|---|---|
| `supabase/migrations/0001_init.sql` | tasks + preferences tables, checks, indexes, `updated_at` triggers |
| `supabase/migrations/0002_rls.sql` | enable RLS + owner-only policies on both tables |
| `supabase/functions/ai-chat/index.ts` | JWT-verified Gemini proxy; key from secret |
| `supabase/functions/import-tasks/index.ts` | one-time validated desktop-JSON import (or a documented SQL path) |
| `.env.example` (PWA) | documents `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` placeholders (no real values) |
| `docs` update | record applied schema/policies once implemented |

**Verification criteria (to run when Phase 2 is actually implemented — none run now):**
- Schema applies cleanly; `updated_at` trigger bumps on UPDATE; indexes present.
- RLS proven: an unauthenticated request and a different user's token both return **zero rows / are rejected**; the owner sees only their rows.
- Edge Function: unauthenticated call rejected; authenticated call returns Gemini text; **built PWA bundle secret scan = 0 matches** for the Gemini key (mirrors desktop release check).
- Import: a real desktop export file imports as new rows with new UUIDs under the owner; a malformed/foreign file is rejected with zero writes.
- Free-tier sanity: single-user usage stays within the verified Free quotas; keep-alive (if adopted) prevents the 7-day pause.

### Phase 2 — Confirmed decisions (locked 2026-10-26)
These four are **confirmed by the owner** and supersede the matching open questions above. Still planning-only; nothing implemented.
1. **Authentication — CONFIRMED.** Supabase Auth **email + password**, **single owner** initially, **public sign-ups disabled**, **RLS enforced** (owner-only via `auth.uid() = user_id`, deny-by-default on both tables).
2. **AI chat — CONFIRMED.** Ship **plain Gemini chat** first through the authenticated server-side Edge Function (`ai-chat`); **structured task-actions are deferred** to a later phase.
3. **Supabase Free / pause — CONFIRMED (Option A).** Accept occasional 7-day inactivity pauses. **No keep-alive or scheduled ping for now** (setup step 7 is dropped for the initial build; may revisit if the pause proves disruptive).
4. **Soft-delete — CONFIRMED.** Deletions use **`deleted_at` tombstones** (`UPDATE deleted_at`, not hard `DELETE`). **Permanent cleanup/purge and final sync behavior are deferred to Phase 4.**

### Phase 2 open questions (remaining UNRESOLVED after the decisions above)
- API visibility of tombstoned rows (query flag to hide `deleted_at IS NOT NULL` from the UI while still syncing them) — detail for implementation/Phase 4.
- Tombstone purge policy — deferred to Phase 4 (per decision 4).
- Re-import duplicate rule (align with desktop v0.2 M3) — for the one-time import path.

*(Resolved by the confirmed decisions: soft-delete mechanism, structured-actions timing, and keep-alive approach.)*
