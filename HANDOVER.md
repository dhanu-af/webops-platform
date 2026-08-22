# Handover — 2026-08-22 22:35

## Goal

**WEB OPS**: a standalone digital facility operations & compliance platform (checklists, 5S, photo evidence, 3-level verification, corrective actions, area release, audit trail, **equipment calibration tracking**) for the user's manufacturing company. Deliberately **separate** from her other apps (BlendCaps/eagle-labs-schedule, Fudgee, etc.) — do not cross-reference or merge them. Threads running across sessions:
1. The generic platform itself (schema, auth, RBAC, admin tools, full CRUD everywhere).
2. Digitizing her **real** controlled documents (Capsule Room's cleaning forms, 5S Daily Check, Bottling Line Clearance) so they replace paper — not demo filler.
3. Area-level access control, so section-floor staff only see their own area's work — **confirmed deployed to production this session** (see below).
4. **New this session**: Equipment Calibration Tracking module.

## State — as of this write-up

- Local repo: `~/webops-platform`. **`HEAD` = `be85db4`, already pushed to `origin/master`** — confirmed this session (contradicted an earlier handover's "not yet pushed" note; that note was stale). **New work this session (Equipment Calibration Tracking) is committed locally but NOT yet pushed** — ask the user before pushing, per this project's standing pattern.
- **Live production**: Vercel team `DKNS` (`dkns1`) → project `webops-platform` → **https://webops-platform-three.vercel.app**. Neon Postgres + Vercel Blob (token confirmed present). Auto-deploy-on-push (including `prisma migrate deploy` via `vercel-build`) confirmed working reliably all project.
- **Area-level access scoping — confirmed LIVE on production this session.** The user checked the real "New User" form on `webops-platform-three.vercel.app` and confirmed the "Assigned area (optional)" dropdown is there with the real area list and correct helper text. It's currently a no-op for everyone since no real user has an Assigned Area set yet — she needs to go into Users admin and assign areas to real Operators/Team Leaders/Supervisors for it to actually restrict anything.
- **NEW: Equipment Calibration Tracking module — built, verified locally, NOT YET DEPLOYED.** See "This session's build" below.

## This session's build — Equipment Calibration Tracking

The user asked "any other modules to finish this project?" after confirming the area-scoping feature was live; she picked this as the next module to add.

**Schema** (`prisma/migrations/20260822140000_equipment_calibration/`): new `EquipmentCalibration` model — `equipmentId` FK (cascade delete with Equipment), `calibratedDate`, `intervalDays`, `dueDate` (computed at write time as `calibratedDate + intervalDays`, not recomputed later), `performedBy` (plain string — calibration is almost always an external vendor/technician, not a WEB OPS `User`), `certificateNumber`/`certificateUrl`/`notes` (all optional), `createdById`/`createdAt`. **Status (CURRENT/DUE_SOON/OVERDUE/NEVER_CALIBRATED) is deliberately NOT a stored column** — it's derived from `dueDate` at read time (`lib/calibration.ts`'s `getCalibrationStatus()`), matching the exact convention `CorrectiveAction.status`'s OVERDUE already uses (computed via `isPast(dueDate)` in the UI, never persisted), so it can never drift from "today."

Hit the same known local-dev shadow-DB issue as the `user_home_area` migration before it (`P3006`/"type already exists") — used the documented workaround: hand-wrote the migration SQL matching existing style, `prisma migrate resolve --applied`, `prisma db execute --file`, `prisma generate`. Confirmed with `prisma migrate status` after.

**New permission**: `"calibration.manage"` in `lib/permissions.ts`, granted to `SUPER_ADMIN`, `ADMIN`, and `QA` (QA is the realistic real-world owner of calibration records, not just Admins). Viewing the calibration list/history needs no special permission (covered by the universal `"view"`), same as every other Records page.

**Storage**: `lib/storage.ts` gained `storeCalibrationCertificate()` / `isAllowedCertificateFile()` / `MAX_CERTIFICATE_BYTES` — a separate function from `storePhoto()` because certificates are PDFs (occasionally a scanned photo), not images-only. Same Vercel Blob / local-`public/uploads`-fallback / VERCEL-without-token-throws-instead-of-silent-EROFS contract as the existing photo storage.

**Files**:
- `lib/data/calibration.ts` — `listEquipmentCalibrationOverview(scope)` (one row per non-archived Equipment with its latest calibration + computed status), `listCalibrationHistory(equipmentId)`. Scoping uses a **plain `areaId` equality** against the user's scope, not the `scopeWhere()` hierarchy helper — Equipment (like CorrectiveAction/Finding/PhotoEvidence) only ever carries one specific `areaId`, no section/facility-wide variant, matching `lib/scope.ts`'s own documented precedent for this exact situation.
- `lib/actions/calibration.ts` — `recordCalibration(formData)`, one action taking structured fields + an optional file together (mirrors `attachPhoto`'s all-in-one FormData pattern), computes `dueDate`, stores the certificate if present, audit-logs a `CREATED` entry.
- `components/calibration/record-calibration-form.tsx` — inline expand/collapse form (no modal/dialog primitive exists anywhere in this app's UI kit, so this matches that constraint rather than introducing one).
- `app/(app)/calibration/page.tsx` — list of all equipment with status badges, overdue/due-soon count chips.
- `app/(app)/calibration/[equipmentId]/page.tsx` — full calibration history + the record-new-calibration form (gated on `calibration.manage`).
- `components/nav/nav-items.ts` — new "Equipment Calibration" entry under Records, `Gauge` icon.

**Verified end-to-end** against local dev (`npx prisma dev`, seeded demo data): logged in as the `admin@webops.demo` Super Admin demo account, recorded a real calibration on "High Shear Blender 1" (180-day interval from 22 Aug 2026 → due date correctly computed as 18 Feb 2027), confirmed the status badge flipped Never Calibrated → Current on both the list and detail pages, confirmed the audit trail logged it correctly attributed to the right user. Test record was left in local dev (harmless demo data, same category as the "Test Blending Supervisor"/"Test Blending Operator" accounts already there) rather than fighting a local dev-environment quirk to clean it up — see Gotchas.

`tsc --noEmit`, `eslint`, `vitest run` (all 106 pre-existing tests, unaffected), and `next build` all pass clean.
- **5S Daily Check**: all 5 production areas covered (Capsule Room, Blending Room, Bottling Line, Gummy Production, Pouch Line), each with a correctly area-scoped `DAILY · SUPERVISOR` schedule.
- **"Bottling Line Clearance"**: first real, non-5S checklist built from the user's actual paper form (a Google Form she linked) — 36 items, `LINE_CLEARANCE` category, `Operator → Supervisor → QA` workflow, live on `/line-clearance`.
- **Bottling Line, Gummy Production, and Pouch Line's Pre-Start / Post-Operation Cleaning checklists still don't exist** — need the user's real paper form content, same as Bottling Line Clearance did. Don't fabricate.
- Two harmless leftover clones sit on `/admin/checklists` from an earlier scripting mistake ("5S Daily Check - Blending Room (Copy)" and "(Copy) (Copy)", 0 schedules each) — safe to delete via the trash icon whenever convenient.
- **Photo evidence on 5S NUMERIC items**: working end-to-end, 5-photo cap, multi-select, includes real phone photos (JPEG and HEIC both confirmed working after a storage/content-type fix).

## Key decisions

### Area-level access scoping (today's main feature)

The user asked for this directly: "blending section users (operator, teamleader, supervisor) can only see their section tasks... other management users (QA, QC, Production Supervisor, Production Manager, Management) can see all tasks... and they need to option select section type." She used "section" to mean what the app calls an **Area** (Blending Room, Capsule Room, etc. are Areas within one shared "Production" Section) — a real terminology mismatch worth remembering if she brings this up again.

- **New `User.areaId`** (nullable, migration `20260822120000_user_home_area`) — distinct from the pre-existing `User.sectionId`, which was already there but never enforced anything (display/audit-log only). `areaId` is what actually restricts visibility now.
- **The rule** (`lib/scope.ts`'s `getUserScope()`): if role is `OPERATOR`/`TEAM_LEADER`/`SUPERVISOR` **and** `areaId` is set → scoped to that area. Every other role, and any of those three roles left **unassigned**, sees everything. This is a deliberate judgment call, not something the user explicitly confirmed: it reconciles her listing "Supervisor" in *both* the narrow group ("operator, teamleader, supervisor") and, implicitly, "Production Supervisor" in the broad group — a plant-wide Supervisor is just one who's never given a specific area. **Flag this interpretation to her if it ever seems wrong in practice** — the fix would be a real role-model change, not a tweak.
- **`scopeWhere(scope)`** (also `lib/scope.ts`) — the actual Prisma `where` fragment, an OR-match on exact area / section-wide (`areaId: null, sectionId: <theirs>`) / facility-wide (`areaId: null, sectionId: null, facilityId: <theirs>`). A scoped user sees their own area's tasks *plus* any broader schedule/inspection that already applies to everyone (e.g. a facility-wide 5S audit) — never just an exact-area match, which would incorrectly hide those.
- **Two models don't fit that hierarchy** (`Finding`, `CorrectiveAction`, `PhotoEvidence` — only ever carry a specific `areaId`, no section/facility-wide variant) — scoped there with a plain `areaId: scope.areaId` equality instead of `scopeWhere()`. Don't try to force the generic helper onto these; it won't type-check and wouldn't be semantically right anyway.
- **Applied to**: Today's Ops, Pre-Start, Line Clearance, Post-Op, 5S Audits (`lib/data/by-category.ts`, `lib/data/inspections.ts`'s `getTodaySchedules`), Dashboard KPIs + Facility Status Map (`lib/data/dashboard.ts`), Inspection History (`lib/data/inspections.ts`'s `listInspections` — **also got a real filter bar it never had before**: status/area/checklist-name search, area picker hidden for scoped users), Corrective Actions, Evidence Gallery, Calendar (`lib/data/calendar.ts`), Reports + Analytics + their PDF/CSV exports (`lib/data/reports.ts`, `lib/data/analytics.ts`).
- **Deliberately NOT applied to Audit Trail** (`/audit`) — it's a compliance log mixing in non-area events (logins, settings changes, user edits), not a task list. Left global on purpose; revisit only if asked.
- **Users admin (new/edit)** gained an "Assigned area" dropdown, separate from the pre-existing "Department / Section" one. Helper text explains the effect. **Changing a user's area only takes effect on their next login** — the area is baked into their JWT at sign-in, same staleness tradeoff the app already had for role changes.
- `reports.export` permission (PDF/CSV export buttons) is never granted to any area-scoped role (`OPERATOR`/`TEAM_LEADER`/`SUPERVISOR` all lack it in `lib/permissions.ts`) — confirmed before touching the export routes, so there was no risk of a scoped user exporting unscoped data even before the fix.
- **Verified end-to-end locally**: created a scoped `OPERATOR` (Blending Room) and a scoped `SUPERVISOR` (Blending Room, needed since `OPERATOR` lacks `reports.view` and can't reach Reports/Analytics) — confirmed both only ever see Blending Room + facility-wide records across every page listed above, confirmed the admin account (unscoped) is unaffected and its new filters work, all 106 existing tests still pass.

### Other decisions from this session

- **Real controlled documents are built via the live admin UI, never via `prisma/seed.ts` + reseed.** Decided not to reseed production — real data exists now. Standing pattern for any future real checklist content.
- **Real delete now exists for checklists**, distinct from Archive (`deleteChecklist()`, guarded by zero-inspections check).
- **Photo evidence is available on NUMERIC items now, not just PASS_FAIL/YES_NO/ACKNOWLEDGEMENT** — 5-photo cap, multi-select.
- **Two real bugs found and fixed in `lib/storage.ts`**: (1) `storePhoto()` used to silently fall back to a filesystem write when `BLOB_READ_WRITE_TOKEN` was missing — fine locally, fatal on Vercel's read-only filesystem — now throws a clear error instead. (2) The actual bug the user hit was HEIC photos reporting an empty/unexpected `file.type`; `isAllowedPhotoFile()` now falls back to the file extension.
- **Push confirmation pattern**: always ask before `git push`, even though local `git commit` doesn't need to ask.

## Files touched in the area-scoping session (major ones; full history in `git log --oneline`)

- **`prisma/schema.prisma`, `prisma/migrations/20260822120000_user_home_area/`** — `User.areaId`.
- **`lib/scope.ts`** (new) — `getUserScope()`, `scopeWhere()`.
- **`lib/auth.ts`, `types/next-auth.d.ts`** — session/JWT now carry `areaId`/`sectionId`/`facilityId`.
- **`lib/actions/users.ts`, `app/(app)/admin/users/{new,[id]/edit}/*`** — Assigned Area picker.
- **`lib/data/{by-category,inspections,dashboard,calendar,reports,analytics}.ts`** — scope-aware queries.
- **`app/(app)/{today,pre-start,line-clearance,post-op,five-s,dashboard,inspections,corrective-actions,evidence,calendar,reports,analytics}/page.tsx`**, **`app/api/reports/export/{route.ts,pdf/route.ts}`** — pass scope through, hide filter UI for scoped users.
- **`app/(app)/inspections/page.tsx`** — rewritten with a real filter bar (status, section/area, checklist-name search) that didn't exist before.
- **Bottling Line Clearance** (production DB content) — 36 items, built from the user's Google Form.

## Gotchas / constraints

- **Local Postgres (`npx prisma dev`) stops between sessions/long gaps** — check `netstat -ano | grep 51214`. Fix: `npx prisma dev` from the repo root.
- **Never run two Next.js server processes against the same local `prisma dev` Postgres at once** — connection pool contention looks like a real bug but isn't.
- **`npx prisma migrate dev` hit a broken shadow-database state today** ("type UserRole already exists", P3006/P3018) — a known local `prisma dev` quirk, not a real schema problem. Workaround that worked: hand-write the migration SQL (matching the style of existing migration files), `npx prisma migrate resolve --applied <name>` to mark it tracked, `npx prisma db execute --file <path>` to actually run it against local dev, then `npx prisma generate`. Verify with `npx prisma migrate status` after ("Database schema is up to date!").
- **Local dev never exercises the real Vercel Blob upload path** — no token provisioned locally. A Blob-specific bug can't be reproduced locally; reason from code + Vercel Runtime Logs, or ask the user to test on production.
- **A production build run locally (`next build && next start`) is fragile** — hit unrelated auth/DB flakiness before. Not a reliable technique for this app.
- **Vercel's Runtime Logs page is the fastest way to see the real, un-redacted server-side error** behind a generic "Minified React error #NNN" — the client message is always redacted in production.
- **Scripting the Checklist Builder's item editor in bulk**: click "Add Item" N times in one `javascript_exec` call, then check the new count in a *separate* call — reading it in the same call returns the stale pre-click count even though the clicks worked. Fill fields by array index across `querySelectorAll` results, verify before publishing, batch ~10–15 items per publish.
- **`document.querySelectorAll('input')[0]` on the Checklist Builder edit page is a hidden Next.js Server Action id field**, not the visible Name input (that's index 1). Verify by checking `type`/`value`, not position.
- **Scope Clone/Delete button queries to the specific row/link**, not a shared list container — a loose selector grabs the *first* matching button on the whole page.
- **The auto-mode classifier blocks browser-automation writes that modify *existing* live production state, but allows ones that *create new* state** — creating a schedule went through; pausing an existing one was denied, twice.
- **GitHub two-account switch required before every push**: `gh auth switch --hostname github.com --user dhanu-af`, push, then switch back to `khdanushka-spec`.
- **`WebFetch` on a public Google Form's `viewform` URL works but tends to summarize repeated sections on the first pass** — always follow up with an explicit "no summarizing, exact wording of every item" prompt, plus a targeted fetch for anything truncated with "...".
- **A standalone `tsx`/`node` script run via Bash reliably fails to connect to the local `prisma dev` Postgres proxy** (`ECONNREFUSED` through Prisma's `PrismaPg` adapter) even though the exact same port is reachable via a raw TCP test *and* via a raw `pg` `Client` connecting directly (both confirmed working from the same Bash session) — it's specifically the Prisma-Client-via-adapter-pg combination that fails standalone. The identical query works fine the instant it runs inside the actual running Next dev server (a page load, a Server Action) — confirmed this session recording/verifying a real calibration record entirely by driving the browser, never by running a script directly. Same root-cause *shape* as the already-documented "standalone script fails against `@neondatabase/serverless`" issue on other projects, just a different driver. **How to apply**: don't burn retries on a standalone verification/cleanup script here — drive the real dev server through the browser tool instead (as done this session), or accept leaving small harmless test data behind rather than fighting this for a trivial cleanup.
- **The local `prisma dev` proxy can get stuck in a bad state mid-session** (`P1017`/"Server has closed the connection", `DriverAdapterError: ConnectionClosed`) after enough migrate/generate/build churn against it — confirmed this session, and it wasn't specific to the new code (hit on the pre-existing Dashboard page too). Fix: find the actual process on the ports (`netstat -ano | grep 51214`, then `Get-CimInstance Win32_Process -Filter "Name='node.exe'"` to confirm it's the right one — **never a blanket `taskkill`**), `Stop-Process -Id <pid> -Force`, delete the stale lock **directory** at `%LOCALAPPDATA%\prisma-dev-nodejs\Data\durable-streams\default\server.lock.lock` (it's a directory, not a file — `proper-lockfile`'s mechanism), then `npx prisma dev` again. Also restart the Next dev server itself afterward — it holds its own now-stale connections to the old proxy instance.

## Next steps

1. **Ask the user whether to push the Equipment Calibration Tracking module (this session's new commit) to production** — confirmed working locally, but not yet on Vercel. Also needs `prisma migrate deploy` to run there (happens automatically via `vercel-build` on push).
2. **Get Bottling Line, Gummy Production, and Pouch Line's real Pre-Start and Post-Operation Cleaning paper forms** — she's shared a Google Form link once already; fetch it the same way if she does again.
3. **Confirm the HEIC/photo-format fix actually worked** — ask her to retry whatever format got rejected before.
4. Once calibration tracking is live, she'll need to record each real piece of equipment's actual last-calibrated date (not just wait for the next one) so the dashboard reflects reality from day one, rather than showing "Never Calibrated" for equipment that has actually been calibrated before this feature existed.
5. Everything else genuinely needs her input (see Open Questions) — no other clearly-scoped, no-decision-needed work is currently identified.

## Open questions — still genuinely need the user

- **Which real users get an Assigned Area, and which stay unassigned (full visibility)?** The scoping feature does nothing until she actually goes into Users admin and assigns areas to her Operators/Team Leaders/Supervisors. Worth walking her through this once, since it's the actual point of today's work.
- **Two likely-orphaned Vercel projects** — can't inspect or delete these from here (session's Vercel access is a different account/team); needs her to check the Vercel dashboard directly.
- **Forgot-password flow** — needs an email provider decision (e.g. Resend via Vercel Marketplace) and provisioning.
- **`VerificationWorkflow` has no versioning** — not an issue yet; flag if it becomes one.
- **Demo accounts** — confirmed no real exposure pre-launch; revisit before this goes in front of anyone outside the team.
