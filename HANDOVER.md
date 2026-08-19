# WEB OPS — Handover

**Digital Facility Operations & Compliance Platform.** New standalone project — deliberately not merged with the user's other apps (BlendCaps, Fudgee, etc.). Local repo at `~/webops-platform`, not yet pushed to GitHub or deployed. No production database provisioned yet.

## Stack (matches the user's other Next.js/Prisma projects)

- Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind v4
- Prisma 7 + `@prisma/adapter-pg` (portable — works against local dev Postgres now, and Neon in production via a plain connection string; not using `@prisma/adapter-neon`'s serverless driver)
- NextAuth v5 (beta) with a Credentials provider + bcrypt, JWT sessions
- `@vercel/blob` for photo storage in production; falls back to writing under `public/uploads` in local dev when `BLOB_READ_WRITE_TOKEN` is unset (see `lib/storage.ts`)
- lucide-react icons, recharts (not yet used), qrcode (installed, not yet wired up), date-fns, react-hook-form (installed, not yet used)
- Dev server registered in the **global** `~/.claude/launch.json` as `webops-platform`, port 3017 (there is no per-project `.claude/launch.json` — this machine uses one shared file across all the user's projects)

## Local database

Uses `npx prisma dev` (Prisma's local Postgres, no Docker) rather than a real Neon instance — there is no live database for this project yet. Connection strings are in `.env` (`DATABASE_URL` / `SHADOW_DATABASE_URL`, ports 51214/51215).

**Known environment gotcha this session hit twice:** the `prisma dev` background process does not reliably survive between separate Bash tool calls unless started with the Bash tool's own `run_in_background: true` (nohup+disown was not enough — it silently died). If `prisma migrate`/`db push`/the app itself suddenly can't reach `localhost:51214`, first check whether the process is still alive and restart with `run_in_background: true` if not, before assuming a code problem.

**When ready for production:** provision a real Neon database (the user's usual pattern is via the Vercel Marketplace Neon integration once the project is deployed), point `DATABASE_URL`/`DIRECT_URL` at it, and run `prisma migrate deploy`. No migration changes needed — `adapter-pg` works against Neon's standard connection string as-is.

Demo data: `npx tsx prisma/seed.ts` wipes and reseeds. All demo accounts use password `WebOps2026!`:
- `admin@webops.demo` — SUPER_ADMIN
- `priya.admin@webops.demo` — ADMIN
- `jordan.operator@webops.demo`, `riley.operator@webops.demo` — OPERATOR
- `casey.teamlead@webops.demo` — TEAM_LEADER
- `morgan.supervisor@webops.demo` — SUPERVISOR
- `avery.qa@webops.demo` — QA
- `taylor.management@webops.demo` — MANAGEMENT
- `sam.viewer@webops.demo` — VIEWER

## What's built and verified working end-to-end (browser-tested, not just compiled)

- **Full data model** (`prisma/schema.prisma`): Facility → Section → Area → Equipment hierarchy (QR-token-ready), versioned Checklists/ChecklistItems, ChecklistSchedule (recurrence fields), configurable VerificationWorkflow/VerificationStep (per-checklist sign-off chains, not hard-coded), Inspection/InspectionResponse, PhotoEvidence, Finding, CorrectiveAction, VerificationRecord, AreaRelease, Notification, AuditLog.
- **Auth + RBAC**: NextAuth credentials login, 8 roles, server-side permission checks in `lib/permissions.ts` (never trust the client). Nav items are role-filtered.
- **Operator flow** (`/today`, `/pre-start`, `/post-op`, `/five-s` → `/inspections/[id]`): fill a checklist with large PASS/FAIL/N/A touch targets, numeric/text items, debounced auto-save (see gotcha below), FAIL auto-creates a Finding with severity + reason, photo evidence required before submit when the item is flagged `requiresPhotoOnFail`/`criticalFailure`, submit routes to the checklist's configured workflow.
- **Three-level verification** (`lib/actions/inspections.ts: verifyInspection`): Supervisor Approve/Return/Reject → QA Approve/Return/Reject, `canVerifyOwnWork` blocks self-verification, Return/Reject require a reason, final QA approval closes the inspection and flips `AreaRelease` to `QA_RELEASED` for workflows with `requiresAreaRelease`. Verification timeline renders operator → supervisor → QA with timestamps.
- **Dashboard** (`/dashboard`): live KPIs (compliance %, today's checks, overdue, awaiting supervisor/QA, open findings, 5S score) and a Facility Status Map showing every area's release status, last inspection, open findings.
- **Inspection History, Corrective Actions (with close/verify), Evidence Gallery, Checklists list, Areas & Equipment (read tree), Users list, Verification Workflows list** — all read real data.
- Manually verified in the browser this session: full Pre-Start submission with a failed critical item → photo attached → submit → Supervisor approve → QA approve → CLOSED + AREA RELEASED banner. Dashboard and Evidence Gallery reflect it immediately after.

## Real bugs found and fixed this session (worth knowing about)

1. **`PhotoEvidence.finding` was `onDelete: Cascade`.** The app has a convenience rule that deletes a just-created Finding if a response gets corrected away from FAIL before submission. Combined with the cascade, that could silently destroy an already-uploaded evidence photo. Fixed to `onDelete: SetNull` (migration `20260819090000_photo_evidence_setnull_on_finding_delete`) — a photo now only loses its `findingId` link, never gets deleted — plus the delete-finding logic now also refuses to fire if the finding has any photos (`lib/actions/inspections.ts`, `saveResponse`).
2. **Text/comment fields used to commit on `blur`.** Unreliable (confirmed in this sandbox's Browser tool, and a real risk on mobile virtual keyboards / fast navigation per spec §33 "never lose completed data"). Replaced with a debounced auto-save on every change (`useDebouncedCommit` in `components/inspection/checklist-item-card.tsx`).
3. That debounce hook's first implementation used a "skip the first effect run" ref flag to avoid re-saving the initial value on mount — but React's dev-only Strict Mode double-invokes effects, which consumes the flag on a throwaway pass and lets the real pass fire anyway, silently re-committing (and for the Finding's severity/reason fields, **blanking**) data on every page load. Fixed by comparing against the last-committed value instead of a boolean flag.
4. The numeric input's placeholder hardcoded `0` as the lower bound (`0 – ${maxValue}`) instead of the item's real `minValue`. Fixed in `checklist-item-card.tsx`.

## Since the initial build

Added Temperature (°C, 15–30) and Relative Humidity (%, 0–100) checks to the **Post-Operation Cleaning** checklist's Environment group (`prisma/seed.ts`), matching the ones Pre-Start already had — real GMP facilities monitor environment at both ends of a production cycle. Also generalized `makeChecklist`'s numeric range so items can specify their own `minValue`/`maxValue` instead of every NUMERIC item defaulting to the 5S 0–5 scale.

### Real Capsule Room checklists (2026-08-19)

Digitized the user's actual controlled documents verbatim — **not demo filler**: `C-FORM-002B1/B2/B3` (Eagle Labs Australia — Daily/Weekly/Monthly Cleaning Checklist, Capsule Room), supplied as `.docx` files. All three are in `prisma/seed.ts`, category `POST_OPERATION_CLEANING`, scoped to the `Capsule Room` area, workflow `twoStep` (Operator → Supervisor — **no QA step**, matching the real form's note that QA only does risk-based spot checks, not a per-form sign-off).

- **Section A (per-equipment Clean/Sanitised/Dry)** → each equipment row becomes 3 `ACKNOWLEDGEMENT` items ("Equipment — Clean" / "Sanitised" / "Dry"), sharing the equipment's cleaning-requirement text as `helpText`. This required adding a new item type to the UI: **`ACKNOWLEDGEMENT` now renders as a single "Mark as done" toggle** in `checklist-item-card.tsx` (stored as `choiceValue: "DONE"` vs `""`, not `passFail` — there's no fail state for a cleaning task, just done/not-done), and `submitInspection` now validates required `ACKNOWLEDGEMENT` items by `choiceValue === "DONE"` instead of just "a response row exists."
- **Section B (Area & GMP Inspection)** → real `PASS_FAIL` items. `gmpCheckItem()` in `seed.ts` auto-flags an item `criticalFailure` + `requiresPhotoOnFail` if its text matches a GMP-critical keyword list (glass/light fittings/RH & temperature/line clearance/room ready/scale verification/ATP swab/approved chemicals/calibration labels) — reasonable defaults, adjustable per-finding via the severity picker.
- **Section C (Verification & Sign-off)** → not modelled as items at all; it's exactly "Cleaned by (Operator)" + "Checked by (Supervisor)", i.e. the platform's own verification workflow.
- Doc metadata (Doc Number, cadence, cleaning agents, verification method, revision) is preserved in each `Checklist.description`.
- **Not yet done**: no `Equipment` DB rows were created for the named equipment (EQ 100/101/102/301/303 etc.) — item prompts just embed the equipment name/EQ-No as text. Worth doing later if/when QR-code-per-equipment ships, so each piece of equipment gets its own history.
- **Explicitly scoped to Capsule Room only**, per the user's instruction — Blending Room, Bottling, etc. still only have the original synthetic demo checklists. The same docx → seed.ts pattern (equipment table → `ACKNOWLEDGEMENT` triplets, GMP table → `PASS_FAIL` with `gmpCheckItem()`) is ready to repeat for the next room's real documents when supplied.

## Checklist Builder (2026-08-19)

Real admin UI now exists at `/admin/checklists` — no more editing `prisma/seed.ts` by hand to add a checklist. Server actions in `lib/actions/checklist-builder.ts`, gated by `can(role, "checklist.manage")` (SUPER_ADMIN/ADMIN only).

- **Create**: `/admin/checklists/new` — name, category, workflow, description → creates the `Checklist` + an empty `ChecklistVersion` "1.0", then redirects to the editor.
- **Edit** (`/admin/checklists/[id]`): a client-side item list editor (add/reorder/remove, per-item type/required/photo-on-fail/critical-failure/min-max/choices) that only writes to the database on explicit **"Publish New Version"** — never edits an existing `ChecklistVersion`'s items in place. Every publish bumps the version number (`1.0` → `1.1` → …) and flips `isCurrent`, so historical inspections keep referencing the exact version they were performed against (spec §35). Version history is listed read-only below the editor.
- **Schedules**: same page, a compact add-schedule form (frequency, area, due time, assigned role, photo-required) plus pause/resume on existing ones. A checklist with zero schedules simply won't appear anywhere operators look (Today's Ops etc.) — the UI says so.
- Verified end-to-end in the browser: created a test checklist, added 2 items, published (v1.0→v1.1), added a schedule for Bottling Area, confirmed it appeared on `/today` and opened/rendered correctly with the real item definitions. Cleaned up the test checklist afterward.
- **Not done yet**: no delete for checklists/items (archive via the Active toggle exists, hard delete doesn't), no drag-and-drop reordering (up/down buttons only), Verification Workflow *creation* UI still doesn't exist (`/admin/workflows` is still read-only — you can only assign one of the workflows already seeded: `Operator → Supervisor → QA` or `Operator → Supervisor`).

## Not built yet (in spec-priority order — see the original 54-section brief)

- **Scheduling automation**: `ChecklistSchedule` → `Inspection` instantiation is currently **lazy** (created on-demand when someone opens it from Today's Ops/Pre-Start/etc.), not a real cron. A Vercel Cron hitting an API route to pre-generate the day's instances (and mark `OVERDUE` ones) is the documented next step for true unattended recurrence.
- **Verification Workflow builder UI** — workflows (the Operator→Supervisor→QA chains) still only exist via the seed script; `/admin/workflows` is a read-only list. Checklists can now be built without touching code, but a brand-new sign-off chain still needs one.
- **Areas & Equipment admin CRUD** — `/admin/areas` is a read-only tree; add/edit/archive forms not built.
- **Calendar, Reports, Analytics, System Settings** — placeholder "coming soon" pages only.
- **QR code generation/scanning** (`qrcode` package installed, `Area.qrToken`/`Equipment.qrToken` already exist in the schema, no `/scan/[token]` route yet).
- **Notifications UI** — `Notification` rows are created (see `lib/notifications.ts`) but there's no bell/inbox to read them yet.
- **Offline support** (§33) — not started.
- **PDF/CSV report export** — not started.

## Conventions to keep following

- Server Actions in `lib/actions/*.ts`, data-fetch helpers in `lib/data/*.ts`, always check permissions server-side (`lib/permissions.ts`), always write to `AuditLog` (`lib/audit.ts`) for anything that changes an inspection's state.
- Status → label/color mapping is centralized in `lib/status.ts` — extend it there, don't hardcode badge colors in components.
- Design tokens live in `app/globals.css` as CSS variables (light + dark via `prefers-color-scheme`) — a premium neutral palette with a single restrained blue accent, per the "Apple-level simplicity + enterprise QMS" brief. Reuse `components/ui/*` primitives (Card, Badge, Button) rather than one-off styling.
