# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

NEU-Pass is a capstone project: a mobile visitor management system for a university gate. It has two independent apps in this repo that **do not share a backend**:

- **Root app** (`app/`, `src/`) — Expo SDK 54 / React Native / Expo Router app used by visitors and guards. Persists data locally via `expo-sqlite`.
- **`admin-web/`** — Next.js 14 (App Router) admin dashboard. Currently a UI-only prototype backed by hardcoded sample data (`admin-web/src/lib/sample-data.ts`) and `localStorage` (`admin-web/src/lib/guard-account-store.ts`). It does **not** read from the mobile app's SQLite database. Don't assume changes in one app are visible in the other.

This is explicitly a prototype/Capstone 1 build — several services have comments noting real implementations (backend auth, real password hashing, real face verification) are deferred to a later phase. Preserve that framing rather than "fixing" prototype shortcuts unless asked.

## Commands

Root app (run from repo root):
- `npm run start` — start Expo dev server
- `npm run android` / `npm run ios` / `npm run web` — start for a specific platform
- No test runner or lint script is configured in the root `package.json`.

Admin web (run from `admin-web/`):
- `npm run dev` — Next.js dev server
- `npm run build` — production build
- `npm run lint` — Next.js ESLint
- No test runner configured.

The two apps have separate `package.json`/`node_modules` (`admin-web` is its own npm project nested in the repo) — install and run commands from within `admin-web/` for that app.

## Architecture (root app)

**Routing**: Expo Router, file-based under `app/`. Route groups `app/(visitor)/` and `app/(guard)/` gate their screens on role via each group's `_layout.tsx`, which redirects to `/` if `useAuth().role` doesn't match. Auth state (`src/context/AuthContext.tsx`) is in-memory `useState` only — it resets on reload/app restart; there is no persisted session (a TODO comment marks this as future work).

**Data layer** — layered as `screens → services → repositories → src/database/db.ts`:
- `src/database/schema.ts` defines two tables: `visitor_registrations` and `user_accounts`.
- `src/database/db.ts` opens the SQLite DB (`neu-pass.db`) and runs a simple additive migration on every `initDb()` call: it checks `PRAGMA table_info` and `ALTER TABLE ADD COLUMN` for any column in `REQUIRED_COLUMNS` missing from `visitor_registrations`. When adding a new column to that table, add it to `REQUIRED_COLUMNS` (with a default) rather than only editing `CREATE_VISITOR_REGISTRATIONS_TABLE`, or existing installs won't get the column.
- `src/repositories/VisitorRepository.ts` and `AccountRepository.ts` do direct SQL against the tables and map rows to the domain types in `src/types/`.
- `src/services/PrototypeRegistrationStore.ts` is the facade screens actually call for visitor registration/approval/checkout flows (thin wrappers over `VisitorRepository`).
- Every repository function calls `initDb()` itself (idempotent — guarded by an `initialized` flag), so callers don't need to initialize the DB separately.

**Visitor lifecycle state machine** (driven by `VisitorRepository.ts`): `registrationStatus` (`Pending → Active → Completed`, or `Rejected`) and `checkoutStatus` (`None → Checkout Requested → Completed`) are tracked independently. Approving a visitor (`approveVisitor`) stamps `timeIn`, generates a sequential `visitorPassNumber` (`VP-###`, derived from a COUNT query, not a stored counter), and computes `expirationTime`: 4:00 PM same day for `Enrollment` / `Tuition Fee Payment` / `Other Payments`, otherwise 6:00 PM. `qrStatus` (`Active`/`Inactive`/`Used/Invalid`) is separate from `registrationStatus`/`checkoutStatus` and is set explicitly at each transition — check all three fields when reasoning about a visitor's current state, not just one.

**Other services** (`src/services/`):
- `PasswordService.ts` — SHA-256 digest via `expo-crypto`, explicitly marked prototype-only (no salt).
- `QRService.ts` — QR payload is JSON with a static prototype token (`NEU-PASS-PROTOTYPE`); `validateQRStatus` just compares `expirationTime` to now.
- `FaceVerificationService.ts` — no real face matching; `prototypeMode()` always returns `ReadyForGuardReview` so guards manually confirm identity.
- `ExpirationService.ts` — pure functions for expiration/near-expiration display logic (15-minute warning threshold), used by UI, independent of `QRService`'s own expiry check.

**Registration draft flow**: multi-step visitor registration (`id-capture` → `ocr-review` → `privacy-consent` → `facial-verification` → submit) accumulates into a single in-memory draft via `RegistrationDraftContext` before being persisted as one row through `PrototypeRegistrationStore.addRegistration`.

## Architecture (admin-web)

Next.js App Router with a route group `app/(protected)/` (dashboard, visitors, users, audit-logs, reports) wrapped by `app/(protected)/layout.tsx`. All data shown is sample/mock data (`src/lib/sample-data.ts`) or guard accounts persisted to `localStorage` under key `neu-pass-admin-guard-accounts` (`src/lib/guard-account-store.ts`, seeded with a demo `guard01`/`guard123` account on first load, hashed client-side with Web Crypto SHA-256). Treat this app as a UI prototype, not a real admin backend, when making changes.

## Cross-cutting notes

- Default/demo credentials exist in both apps for convenience during development: guard `guard01` / `guard123` (auto-seeded in `AccountRepository.ensureDefaultGuardAccount` and mirrored in admin-web's `guard-account-store.ts`). These are intentional prototype seams, not secrets.
- `.next/` build output under `admin-web/` is present in the working tree from prior local builds — it's build output, not source.
