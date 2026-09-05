# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

NEU-Pass is a capstone project: a mobile visitor management system for a university gate. It has two apps in this repo:

- **Root app** (`app/`, `src/`) — Expo SDK 54 / React Native / Expo Router app used by visitors and guards.
- **`admin-web/`** — Next.js 14 (App Router) admin dashboard.

Both apps share a single **Supabase** project (`https://bhqxgfjpqavbaeuwqxgw.supabase.co`) as their backend — Postgres tables + Row Level Security, Supabase Auth for all three account types (visitor, guard, admin), and Storage for ID/face photos. A visitor registering on the mobile app is immediately visible to a guard approving it and to admin-web's dashboard — there is no separate/local data store per app anymore. See "Shared Supabase backend" below for the schema/RLS/RPC shape.

This is explicitly a prototype/Capstone 1 build. Real backend auth, real password hashing, and real persistence are **done** (migrated to Supabase — see below), but **face matching and OCR are still manual/prototype**: `FaceVerificationService.ts`'s `prototypeMode()` always returns "Ready for Guard Review" (a guard visually compares the captured ID/face photos, now viewable via signed URLs, and decides), and `ocr-review.tsx` has no real OCR. Preserve that framing for face-matching/OCR specifically rather than "fixing" it unless asked — it's planned follow-up work, not an oversight.

## Commands

Root app (run from repo root):
- `npm run start` — start Expo dev server
- `npm run android` / `npm run ios` / `npm run web` — start for a specific platform
- No test runner or lint script is configured in the root `package.json`.
- Requires a local `.env.local` (gitignored) with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

Admin web (run from `admin-web/`):
- `npm run dev` — Next.js dev server
- `npm run build` — production build
- `npm run lint` — Next.js ESLint
- No test runner configured.
- Requires a local `admin-web/.env.local` (gitignored) with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (server-only — never prefix it `NEXT_PUBLIC_`, never commit it).

The two apps have separate `package.json`/`node_modules` (`admin-web` is its own npm project nested in the repo) — install and run commands from within `admin-web/` for that app. They're independent frontends against the same backend, not a monorepo with shared code.

**Bootstrapping demo accounts**: `scripts/seed-accounts.mjs` (repo root) creates the `guard01`/`admin01` Supabase Auth accounts. Requires `SUPABASE_SERVICE_ROLE_KEY` in the root `.env.local`; run with `node --env-file=.env.local scripts/seed-accounts.mjs`. Not run automatically on app boot — this is a one-time/idempotent setup step, not the old SQLite behavior of auto-seeding a guard account on first read.

## Shared Supabase backend

Three tables in the `public` schema, all with RLS enabled:

- **`profiles`** — one row per `auth.users` id. `account_type` (`visitor|guard|admin`), `username` (guards/admin only), `email`, `account_status` (`Active|Blocked`). A trigger (`handle_new_auth_user`) auto-inserts a row (always hardcoded `account_type='visitor'`, never trusting client-supplied signup metadata) whenever a new `auth.users` row appears; guard/admin accounts get this same default row then are `UPDATE`d to the right `account_type`/`username` by trusted `service_role` code (admin-web's Server Actions, or `scripts/seed-accounts.mjs`).
- **`visitor_registrations`** — the same three-independent-fields state machine described below, as real Postgres enum/timestamptz columns instead of SQLite's loose `TEXT`. `id_image_path`/`face_image_path` are Storage object paths, not local file URIs.
- **`audit_logs`** — populated automatically: a trigger on `visitor_registrations` logs every `registration_status`/`checkout_status` transition, so it can't be skipped by a client bug. No table has a client-facing `insert` policy for audit rows — only trusted server-side code (triggers, RPCs) writes here.

**Auth**: visitors use real email/password (self-serve `supabase.auth.signUp`/`signInWithPassword`). Guards and admin — who log in with an admin-assigned username, not an email — map to a synthetic internal email (`{username}@guard.neu-pass.internal` / `{username}@admin.neu-pass.internal`, see `src/lib/guardAuth.ts` and `admin-web/src/lib/syntheticAuth.ts`) so they're still real Supabase Auth users with `auth.uid()`-based RLS. `profiles.account_status` is checked explicitly after sign-in on both mobile login screens (blocking is an app-level concept Supabase Auth itself doesn't know about) — don't remove that check, it's the only thing that makes admin-web's guard "Block" button actually work.

**State transitions are Postgres RPCs**, not raw client `UPDATE`s: `approve_visitor`, `reject_visitor`, `request_checkout`, `complete_checkout` (all `SECURITY DEFINER`, each checking caller role/ownership internally). Neither guards nor visitors have an `update` RLS policy on `visitor_registrations` — this is deliberate, so a client can't write arbitrary column values. `visitor_pass_number` comes from a real Postgres sequence (`visitor_pass_seq`), replacing the old SQLite "`COUNT(*)` inside the same `UPDATE`" race-avoidance hack.

**Storage**: two private buckets, `visitor-ids` and `visitor-faces`, path convention `{auth.uid()}/{filename}`. Visitors can read/write only their own folder; guards can read across both buckets (they need to review any visitor's photos); nothing is ever a public URL — guards view images via short-lived (5 min) signed URLs (`getVisitorImageSignedUrl` in `src/lib/imageUpload.ts`).

**RLS helper**: `auth_account_type()` (a `SECURITY DEFINER` SQL function reading the caller's own `profiles.account_type`) is used throughout policies instead of repeating the same subquery.

Schema/RLS/RPCs were provisioned directly against the Supabase project via `apply_migration` calls (Supabase MCP tooling) — there are no local `.sql` migration files in this repo to look at; use the Supabase MCP tools (`list_tables`, `list_migrations`, `get_advisors`) or the dashboard to inspect current state.

## Architecture (root app)

**Routing**: Expo Router, file-based under `app/`. Route groups `app/(visitor)/` and `app/(guard)/` gate their screens on role via each group's `_layout.tsx`, which redirects to `/` if `useAuth().role` doesn't match (and shows a loading spinner while the session/role is still resolving, rather than redirecting prematurely).

**Auth state**: `src/context/AuthContext.tsx` wraps a real Supabase session — `supabase.auth.onAuthStateChange` plus a `profiles.account_type` lookup — with `role`, `email`, and `loading` exposed via `useAuth()`. Session persists across reload/app restart via `@react-native-async-storage/async-storage` (wired in `src/lib/supabaseClient.ts`); there's no `signIn()` setter anymore — signing in happens by calling `supabase.auth.signInWithPassword`/`signUp` directly (see `visitor-login.tsx`, `visitor-sign-up.tsx`, `guard-login.tsx`) and the context reacts to the resulting session change.

**Data layer** — layered as `screens → services → repositories → Supabase`:
- `src/lib/supabaseClient.ts` creates the `supabase-js` client (AsyncStorage-backed auth persistence).
- `src/repositories/VisitorRepository.ts` calls `supabase.from(...)`/`supabase.rpc(...)` and maps Postgres rows (`snake_case`) to the app's `VisitorRegistration` type (`camelCase`) — see `src/types/VisitorRegistration.ts`. `approveVisitor`/`rejectVisitor`/`requestCheckout`/`completeCheckout` are thin wrappers over the `approve_visitor`/`reject_visitor`/`request_checkout`/`complete_checkout` RPCs described above.
- `src/services/PrototypeRegistrationStore.ts` is the facade screens actually call for visitor registration/approval/checkout flows (thin wrappers over `VisitorRepository`) — unchanged in shape from before the Supabase migration, which was the point of keeping `VisitorRepository`'s exported function signatures stable across the rewrite.
- There is no local database anymore — `src/database/`, `AccountRepository.ts`, and `PasswordService.ts` were removed once Supabase Auth and `VisitorRepository`'s Supabase rewrite made them fully unreferenced.

**Visitor lifecycle state machine** (driven by `VisitorRepository.ts` calling the RPCs in "Shared Supabase backend" above): `registrationStatus` (`Pending → Active → Completed`, or `Rejected`) and `checkoutStatus` (`None → Checkout Requested → Completed`) are tracked independently. Approving a visitor stamps `timeIn`, generates a sequential `visitorPassNumber` (`VP-###`, from the `visitor_pass_seq` Postgres sequence), and computes `expirationTime`: 4:00 PM same day for `Enrollment` / `Tuition Fee Payment` / `Other Payments`, otherwise 6:00 PM (evaluated in `Asia/Manila` time inside the `approve_visitor` RPC). `qrStatus` (`Active`/`Inactive`/`Used/Invalid`) is separate from `registrationStatus`/`checkoutStatus` and is set explicitly at each transition — check all three fields when reasoning about a visitor's current state, not just one.

**Other services** (`src/services/`, `src/lib/`):
- `QRService.ts` — QR payload is JSON with a static prototype token (`NEU-PASS-PROTOTYPE`); `validateQRStatus` just compares `expirationTime` to now.
- `FaceVerificationService.ts` — no real face matching; `prototypeMode()` always returns `ReadyForGuardReview` so guards manually confirm identity — now a functional review step, since `(guard)/pending.tsx` and `(guard)/checkout.tsx` display the captured ID/face photos via signed URLs (they didn't before the Storage migration).
- `ExpirationService.ts` — pure functions for expiration/near-expiration display logic (15-minute warning threshold), used by UI, independent of `QRService`'s own expiry check.
- `src/lib/imageUpload.ts` — `uploadVisitorImage()` uploads a captured photo to the visitor's own Storage folder (or passes through the `prototype://...` sample sentinel unchanged, since the "Use Prototype Sample" affordance has no real file); `getVisitorImageSignedUrl()` resolves a signed URL for guard viewing.
- `src/lib/guardAuth.ts` — `guardUsernameToEmail()`, the guard synthetic-email mapping.

**Registration draft flow**: multi-step visitor registration (`id-capture` → `ocr-review` → `privacy-consent` → `facial-verification` → submit) accumulates into a single in-memory draft via `RegistrationDraftContext` (still holding local `file://` URIs for on-screen preview throughout the flow). Only at final submit (`facial-verification.tsx`) are both captured images uploaded to Storage via `uploadVisitorImage()`, and the resulting Storage paths — not the local URIs — get persisted through `PrototypeRegistrationStore.addRegistration`.

## Architecture (admin-web)

Next.js App Router with a route group `app/(protected)/` (dashboard, visitors, users, audit-logs, reports). `app/(protected)/layout.tsx` is an async Server Component doing a real server-side check — `createClient()` from `src/lib/supabase/server.ts` (cookie-based, via `@supabase/ssr`), `supabase.auth.getUser()`, then a `profiles.account_type === 'admin'` check — and `redirect()`s to `/login` if either fails. `middleware.ts` refreshes the Supabase session cookie on every request (required so Server Components see an up-to-date session, since a Server Component alone can't write cookies).

- `src/lib/supabase/client.ts` — browser client (anon key), used by client components (`visitors`, `audit-logs`, `users` pages, `AdminShell`'s sign-out).
- `src/lib/supabase/server.ts` — request-scoped server client (anon key + the caller's own session cookies), used by Server Components and inside Server Actions to check *who's calling* before doing anything privileged.
- `src/lib/supabase/admin.ts` — `service_role` client, guarded by the `server-only` package so it can never be imported into client code. Only used inside `"use server"` Server Actions, and only after that action has independently verified the caller is a signed-in admin via `server.ts`'s client — Server Actions are callable directly over the network regardless of which page renders their trigger, so that check can't be skipped just because a page is behind `(protected)`. The one deliberate exception is `src/actions/passwordReset.ts`'s `requestAdminPasswordReset`, which must work while signed out (it's the forgot-password flow) — it stays safe by never revealing whether the lookup or send succeeded, escaping ILIKE metacharacters in the username before querying, and cooling down repeated requests per account, rather than by checking caller identity.
- `src/actions/accounts.ts` — `listGuardAccounts`/`createGuardAccount`/`setGuardAccountStatus`/`listAdminAccounts`/`createAdminAccount`/`resetAccountPassword`/`getOwnAccount`/`updateOwnRecoveryEmail` Server Actions. Guard/admin creation calls `admin.auth.admin.createUser()` then updates the trigger-created default `profiles` row to the right `account_type` (avoids an insert-conflict with the `handle_new_auth_user` trigger).
- `src/lib/reportStats.ts` — `computeReportStats()`, shared aggregation logic (total/active/pending/completed counts, purpose counts, daily/monthly logs, expired-QR count) driven by real `visitor_registrations` rows, used by both `dashboard` and `reports` pages.
- `src/lib/syntheticAuth.ts` — `adminUsernameToEmail()`/`guardUsernameToEmail()` (keep the domain constants here in sync with the root app's `src/lib/guardAuth.ts`).

`dashboard`/`reports` are async Server Components (data fetched server-side per request). `visitors`/`audit-logs`/`users` are client components fetching via the browser client on mount. There is no more `sample-data.ts` or `guard-account-store.ts` (localStorage) — both were deleted once every page was reading/writing real Supabase data.

## Cross-cutting notes

- Demo/seed accounts: guard `guard01`/`guard123` and admin `admin01`/`admin123` are real Supabase Auth accounts (synthetic emails per "Shared Supabase backend" above), created via `scripts/seed-accounts.mjs` — not auto-seeded on app boot like the old SQLite `ensureDefaultGuardAccount()` was. These are intentional prototype seams, not secrets. Visitors have no pre-seeded demo account — self-register via the Sign Up screen.
- `.next/` build output under `admin-web/` is present in the working tree from prior local builds — it's build output, not source. It isn't gitignored (a pre-existing repo quirk), so `git status` will show it churn after any local `npm run build`/`npm run dev`; don't include it when staging a commit.
- Two Supabase Auth Dashboard settings worth checking if something behaves unexpectedly during testing, since neither is controllable via SQL/MCP tooling: **"Confirm email"** (Authentication → Providers → Email) — if enabled, a freshly self-registered visitor can't sign in until they click an email confirmation link, which breaks the immediate-sign-up-then-login UX this prototype expects; and **"Leaked Password Protection"** (Authentication → Policies → Password) — currently disabled per the last `get_advisors` security sweep, worth enabling.
