# Go-live hardening — independent GMP / data-integrity review (2026-10-24) — read this first

An independent read-only review of the code (ALCOA+, SQF Ed.10) found 25 issues; everything below is fixed, tested (unit + local production-build browser runs) and deployed unless listed under "Not done".

Fixed
- **Password hashes were sent to the browser** on the record page (whole `User` row via `respondedBy/operator/...: true`). All user relations now use `SAFE_USER` (`lib/safe-user.ts`); `lib/safe-user.test.ts` fails the build if anyone writes a whole-user include again.
- **Deactivated / demoted users kept working** in module actions and downloads: ~14 action guards and 8 API routes trusted the JWT. They now go through `requireLiveUser` / `liveSession` (`lib/session-user.ts`: live role, active flag, areas, temporary-password check).
- **Inspections:** numeric verdict is computed only on the server (a client `PASS` can no longer hide an out-of-range number); every answer change is audited with old/new value (also before submission); answers taken over by another user keep the earlier author as a *participant* who cannot verify; Supervisor-step approver cannot also give the QA approval; corrective action records its creator (`CorrectiveAction.createdById`, migration `20261024170000`), creator/responsible person cannot sign it off, a closed CA cannot be signed twice; finding changes/deletions audited; submit, verify and CA sign-off now write status + signature + audit row in ONE transaction (`logAudit(params, tx)`), verification claims the step atomically (`updateMany where status`), duplicate Start of a scheduled check is serialised with an advisory lock.
- **E-signature:** wrong passwords now count towards the 8-attempt lockout; signing is refused while locked.
- **Admin:** only a Super Admin can create/edit/reset a Super Admin; admin-set passwords are always temporary (admin must never know the password a person signs with).
- **QC samples:** approve/reject need password re-entry (UI panel), approver must not be the tester, blank or FAIL results block approval, edits locked after approve/reject/retention, field-level audit, replaced lab results kept in the audit, no force-delete once a sample went to the lab.
- **Manufacturing reconciliation:** every "done/checked/released by" name + time is the signed-in user and server clock (`lib/mfg-signoff.ts`, first sign-off stands); "checked by" needs Supervisor/QA and a different person; QA release/withdraw only for QA (`area.release`); stages lock when the batch is COMPLETED; stage saves audit old/new values; batch delete refused once completed and keeps a full snapshot in the audit.
- **Drying room:** QC Approved/QC Hold stages and a trolley's QC result are QA/Supervisor only (UI hides them from operators too); trolley field changes audited; deletes keep a snapshot.
- **Formulations:** edits/deletes keep the full previous content in the audit (this is the version history); the worksheet PDF takes "entered by"/date from the session, not the link.
- **Checklist builder:** a numeric item with no limit typed no longer gets an invented 0–5 range (it used to fail every freezer/oven reading); min>max rejected; template publish/clone/archive/delete/schedule changes audited.
- **Database protections** (migration `20261024180000_record_protection_more`, also checked by the monthly restore drill = 9 triggers): signatures can never be updated; answers on QA_APPROVED/CLOSED records can never be updated; a COMPLETED manufacturing batch and a QC sample that went to the lab can never be deleted. Same `webops.allow_record_delete` test switch as before.
- **Dates/time zones:** drying-room, formulation and manufacturing PDFs and the QC daily export use the facility time zone; date inputs default to the device's local day (not UTC); upload checks need BOTH an allowed extension and an allowed MIME type.
- **Operations:** `GET /api/health` (+`?deep=1` for the database) and `.github/workflows/uptime-check.yml` (every 15 min; GitHub emails on failure). Daily backup + restore drill run against the Sydney database.

Not done (known, deliberate — decide before/after go-live)
- Optimistic locking for two people saving the same mfg table at once (last write wins, both are audited).
- QA approval of a *published checklist version* (publishing is Admin-only and audited, not signed by QA).
- Formulation versions are the audit-trail snapshots, not first-class versions with e-signature approval.
- The mfg form still shows name/date boxes; whatever is typed is replaced by the signed-in user/server time on save.
- Photos/COAs are public Blob URLs without a content hash; access to them is not audited.
- The Neon Free plan scales to zero; the first request after a quiet period is slower. Paid plan recommended for production.

Local testing note: the local database is PGlite (one connection at a time). Write test fixtures with the app stopped, then start the app (`scratchpad/audit/run-modules.sh` does this).

---

# Full audit — mobile / iPad / speed / bugs (2026-10-24) — read this first

What changed (all in `master`, deploys run `prisma migrate deploy`: 3 additive migrations — performance indexes, login lockout, login-ID/must-change already shipped earlier):
- **Security:** Next.js 16.4.3 (fixes the image-optimisation SSRF + cache-poisoning advisory), Prisma 7.10.1, zod 4.6.7, @vercel/blob 2.8.2; `npm audit --omit=dev` = 0. `package.json` `allowScripts` is pinned to the new Prisma versions (update it whenever Prisma is bumped, or Vercel installs skip Prisma's postinstall). **Sign-in lockout:** 8 wrong passwords = locked 15 min (`User.failedLogins/lockedUntil`, `lib/login-throttle.ts`); an admin password reset unlocks. Unknown/locked IDs still run a dummy bcrypt compare.
- **Server-action errors now reach the screen in production.** Production hides the text of any error thrown from a server action. Every action the browser forms call (`lib/actions/*`) is wrapped with `guard()` and returns `{ok,data}|{ok:false,error}`; client components import the unwrapped versions from `lib/actions-client/*` (`unwrapAction` rethrows `new Error(message)`, so existing `try/catch` code keeps working). New actions that forms call must follow the same pattern: write `async function x__impl`, export a `guard()` wrapper, add it to `lib/actions-client/<module>.ts`. Throw `UserFacingError` for anything a person should read.
- **Who can work on what:** `lib/scope.ts canWorkOnRecord` (operators assigned to an area share its records; no area = own/unclaimed only; facility-level checklists open to all) now also gates *starting* (ad hoc / scheduled) and *no production*, not just editing.
- **Mobile/iPad:** drawer menu until 1024px (iPad portrait gets full-width content, landscape keeps the rail); 44px touch targets on touch screens (`pointer-coarse:` + globals.css rules; opt out with `data-compact`); 16px form fields on touch screens (no iOS zoom); tables become stacked cards on phones (`<Table>` + `<TableLabels/>`, opt out with `stack={false}`); phone calendar is a day-by-day agenda; filter forms stack; viewport-fit/safe-area; PWA manifest + icons (`app/manifest.ts`, `public/icons`).
- **Speed:** on-device photo shrink (`lib/image-prepare.ts`, 7 MB camera photo -> ~0.6 MB + 32 KB thumbnail; also fixes uploads over Vercel's 4.5 MB body limit); thumbnails used in lists/gallery; settings + timezone cached 5 min (`lib/cached-config.ts`, refreshed instantly via `updateTag` when changed in Settings); lazy-loaded charts; parallel top-bar queries; DB indexes on the hot lookups; `loading.tsx` skeletons, `error.tsx`/`global-error.tsx`; 24h cache on logos/icons. A DB hiccup is no longer shown as "404 not found" (`lib/db-errors.ts`).
- **How it was checked:** headless Chrome (puppeteer-core) on iPhone / iPad portrait / iPad landscape sizes over 38 pages: 0 horizontal overflow, 0 console errors, 0 undersized inputs, plus a full operator -> supervisor flow on the production build (15 checks). The scripts are not in the repo; recreate with puppeteer-core if needed.

Known limits / recommendations
- **Moved to Sydney (2026-10-24):** Neon is now `webops-sydney` (ap-southeast-2, Vercel Marketplace resource, connected without an env prefix) and Vercel functions are pinned to `syd1` by `vercel.json`. The database was copied with a one-off `pg_dump`/`pg_restore` of the `public` schema (row counts matched on all 52 tables, 34 migrations applied); median query round trip from Australia dropped from ~254 ms to ~17 ms. The old US resource `neon-byzantium-saddle` is **disconnected but still exists as a rollback copy** — delete it in the Neon/Vercel dashboard after a few days of clean running. The daily backup / monthly restore-drill workflows use the GitHub secret `BACKUP_DATABASE_URL`, now the Sydney direct URL. Photos (Vercel Blob) were not moved. Neon Free scales to zero, so the first request after idle can still be slow; a paid plan removes that. To roll back: reconnect the old resource to the project in Vercel, remove `vercel.json`, redeploy (data written since the move would not be in the old copy).
- A user on a temporary password is blocked by the app layout and `requireActiveUser`, but older actions that call `auth()` directly (settings, facility, builders) and the PDF route do not check `mustChangePassword`. Low risk (it is the user's own account); fix by moving them to `requireUserWithPermission`.
- Local dev DB (`prisma dev`/PGlite) accepts one connection at a time and drops when the dev server restarts; restart it (kill the process on 51214, delete `durable-streams/default/server.lock*`, `npx prisma dev`).

---

# URS / SQF Edition 10 compliance work (2026-10-23) — read this first

URS-01…20 are implemented (local commits, NOT pushed). Full table: `docs/validation/URS-traceability.md`. Backup/restore: `docs/backup-restore.md`. Retention: `docs/retention-policy.md`.

Behaviour changes to know about
- Only roles with `inspection.submit/create` may enter records; Supervisors/QA verify only, and nobody verifies a record they entered answers on.
- Verification/CA sign-off needs password re-entry (e-signature); failed attempts audited as `SIGNATURE_FAILED`.
- Session is a 15-minute idle timeout; passwords follow `lib/password-policy.ts`.
- Records/responses/signatures/CAs cannot be DELETEd and AuditLog cannot be UPDATEd/DELETEd (DB triggers). Only `prisma/seed.ts` bypasses via `webops.allow_record_delete`.
- Any FAIL (including non-required items) opens a finding that must have a corrective action signed off before the line is released.
- Sign-in is by **User ID** (`User.loginId`, lower case); email is optional (an entry containing @ still matches the email so old logins work). Migration `20261024100000_user_login_id` backfills loginId from employeeId, else the email name; admins can edit it in Admin -> Users -> Edit.
- Admin-created/reset passwords can be **temporary** (`User.mustChangePassword`): the user is sent to `/change-password` before anything else; `requireActiveUser` also refuses until changed.
- Dependencies are pinned exact (`.npmrc save-exact=true`); security headers (HSTS etc.) in `next.config.ts`.

To do by a person after pushing
1. `git push`; Vercel runs `prisma migrate deploy` (4 hand-written URS migrations, additive).
2. On prod: `npm run seed:allergen-changeover`, QA confirms the placeholder ranges, then add a schedule.
3. Add GitHub secret `BACKUP_DATABASE_URL`, run the backup workflow once, do a restore drill.
4. Review 5S supervisor-assigned schedules (may be affected by the entry-role rule).

---

# Handover — 2026-08-27 16:50

## Goal

Continuing general feature development on WEB OPS across several requests in one long session: finish and ship **Production Staging Operations** (started in a prior session), then build a **stage-to-stage auto-fill chain** for Manufacturing Reconciliation, then substantially extend the **Calculation** tool (production-planning kg↔pieces↔containers calculator) with gummy/pouch support, inline editing, and folder organization.

## State

**Everything in this session is committed AND pushed to `origin/master`** — confirmed via `git rev-parse HEAD` == `git rev-parse origin/master` (`ab320da`). Working tree is clean (`git status --short` empty). This repo auto-deploys on push via `prisma migrate deploy && next build` (see `vercel-build` in `package.json`), so production should already have all of this live.

Commits this session, oldest to newest:
- `58ae6ea` — Mfg Reconciliation stage auto-fill chain (Blending → Encapsulation → Bottling → X-Ray → Packaging → FG Warehouse)
- `b0db430` — Round Batch Calculations figures to whole numbers (was showing decimals like "639,784.95" for capsule counts)
- `e3b09d6` — Add gummy pouch/bottle output directions to the Calculation tool
- `266c228` — Switch gummy/pouch weight fields from mg to grams; add "by pouch weight" simplified direction
- `35b8156` — Add the reverse of that: target pouch count → kg needed
- `186da4d` — Add Edit (not just Delete) to the Calculation Log
- `ab320da` — Add folders to the Calculation Log (create/delete/move/filter)

All of the above were browser-verified end to end in this session (created test rows, confirmed math, cleaned up test data afterward) and pass the full check suite (`tsc`, `eslint`, `vitest` — 206/206 — and a from-scratch `npm run build`).

**A code-review audit was run on the Drying Room + Mfg-Reconciliation-auto-fill work and found 8 findings — none of them have been fixed.** This is the main unfinished thread — see "Open questions" below, full detail in the conversation's `ReportFindings` call from earlier this session (not persisted elsewhere, so re-derive by re-reading the affected files listed there if this doc is all you have).

## Key decisions

**Mfg Reconciliation auto-fill** (`58ae6ea`):
- Each stage's carry-over field is seeded via `currentSavedValue ?? priorStageValue`, with the prior stage's value passed down as a prop from `mfg-batch-detail-client.tsx` (which already has the full batch loaded) — not fetched independently per stage component.
- A small "auto-filled from X" note appears next to the field label (`components/mfg/field.tsx`'s new `note` prop) when `data?.field == null && priorValue != null`.
- **Known unfixed bug** (from the later audit): `??` can't distinguish "never entered" from "deliberately cleared to null" — a user who explicitly blanks a field and saves will see it silently repopulate from the prior stage on next load. Not fixed yet.

**Calculation tool gummy/pouch/folders work** (`e3b09d6` → `ab320da`):
- New directions all reuse the *existing* generic `kg → pieces → containers` formula in `lib/capsule-calculation.ts` — no new math branches except where genuinely different (the reverse "target count → kg" direction reuses `BOTTLES_TO_KG`'s branch by extending its `if` condition).
- **Unit-aware weight fields**: gummy/pouch directions display grams in the UI (`4`, `360`) while `CapsuleCalculation.avgWeightMg` still always stores milligrams — conversion happens right at the UI boundary via `toAvgWeightMg`/`fromAvgWeightMg` in `lib/capsule-calculation.ts`. Never let the raw mg value leak into a form field for these directions.
- **"By weight" pouch directions** (`KG_TO_POUCHES_BY_WEIGHT`, `POUCHES_TO_KG_BY_WEIGHT`) have no real piece-count concept — implemented by fixing `capsulesPerBottle` at `1` (hidden from the UI via `showsPerContainerField()`) so the shared formula's second division/multiplication becomes a no-op, rather than writing a separate formula path.
- **Edit** reuses the same create form (`calculation-client.tsx`'s `startEdit()`/`resetForm()`), swapping the button to "Save Changes" and routing to a new `updateCalculation` server action instead of `createCalculation`. Logged as an `EDITED` audit action with old/new value diff.
- **Folders**: deliberately implemented as a **"move to folder" `<select>` dropdown per row**, not drag-and-drop — same end-user capability, far more reliable to build/test, consistent with this app's existing UI patterns. Deleting a folder uses `ON DELETE SET NULL` on `CapsuleCalculation.folderId` at the DB level, so calculations survive un-categorized rather than being deleted — verified this in the browser (deleted a folder, confirmed the row's dropdown fell back to "No folder").
- Folder filtering is a pure client-side filter over the already-loaded log (`listCalculations()` still just does one `findMany` take 100) — no extra round trip per folder switch.

## Files touched

**Mfg Reconciliation:**
- `app/(app)/mfg-reconciliation/[id]/mfg-batch-detail-client.tsx` — passes `priorStage*` props to each stage section
- `app/(app)/mfg-reconciliation/[id]/{bottling,encapsulation,fg-warehouse,packaging,xray}-section.tsx` — auto-fill seeding + "auto-filled from X" note per field
- `components/mfg/field.tsx` — new `note` prop
- `lib/mfg-reconciliation.ts` — `formatCount` now rounds to whole numbers

**Calculation tool:**
- `lib/capsule-calculation.ts` — all direction metadata (labels, defaults, unit conversion, formula) for 8 directions total now: `BOTTLES_TO_KG`, `KG_TO_OUTPUT`, `BAGGED_KG_TO_OUTPUT`, `CAPSULES_TO_SHELLS`, `KG_TO_GUMMY_POUCHES`, `KG_TO_GUMMY_BOTTLES`, `KG_TO_POUCHES_BY_WEIGHT`, `POUCHES_TO_KG_BY_WEIGHT`
- `app/(app)/calculation/calculation-client.tsx` — direction picker, create/edit form, folder bar, per-row move-to-folder dropdown
- `app/(app)/calculation/page.tsx` — now also fetches `listCalculationFolders()`
- `lib/actions/capsule-calculations.ts` — added `updateCalculation`, `listCalculationFolders`, `createCalculationFolder`, `deleteCalculationFolder`, `moveCalculationToFolder`
- `prisma/schema.prisma` — `CalculationDirection` enum grew from 4 to 8 values; new `CalculationFolder` model; `CapsuleCalculation.folderId` (nullable FK, `ON DELETE SET NULL`)
- Migrations: `20260826210000_gummy_pouch_calculations`, `20260826213000_pouches_by_weight`, `20260826220000_pouches_to_kg_by_weight`, `20260827150000_calculation_folders` — all hand-written (this app's convention, not `prisma migrate dev`, due to a recurring shadow-DB P3006 issue)

## Gotchas / constraints learned

- **The local `prisma dev` proxy died completely (not just flaky) multiple times this session** — `netstat -ano | grep 51214` showed nothing listening at all, not a connection-refused-on-a-live-port situation. Fix: `taskkill //F //PID <pid>`, delete the stale `server.lock.lock` **directory** under `%LOCALAPPDATA%\prisma-dev-nodejs\Data\durable-streams\default\`, then `nohup npx prisma dev > /tmp/prisma-dev.log 2>&1 &` and wait ~10s (it sometimes does a "Fetching latest updates" step first that takes a few extra seconds). This happened often enough that it's worth just restarting proactively if anything looks like an auth failure or a blank/broken page.
- **Testing native `window.confirm`/`window.prompt`/`<select>` changes via the Browser pane tool requires `javascript_tool`, not `computer`** — a plain coordinate click doesn't advance past a native confirm/prompt dialog (auto-dismisses as Cancel), and setting `select.value` directly doesn't trigger React's controlled state. Working pattern used throughout this session:
  ```js
  window.confirm = () => true; // or window.prompt = () => 'some value';
  const proto = Object.getPrototypeOf(el);
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, newValue);
  el.dispatchEvent(new Event('input', { bubbles: true })); // or 'change' for <select>
  ```
- A coordinate-based `computer` click can silently miss a button if a field it's near got conditionally hidden/shown just before the click (happened once when the per-container field disappeared for a "by weight" direction, shifting the Save button up) — if a save/action seems to silently no-op, re-read the page and retry via `javascript_tool`'s direct `.click()` before assuming a real bug.
- A recurring Turbopack dev-mode hydration error ("Hydration failed because the server rendered text...") shows up on essentially every page in this app, including ones untouched this session — traced to the live "HH:MM:SS pm · Facility time" clock in the header ticking a different second between server and client render. It's pre-existing dev-only noise, not a regression; don't chase it.

## Next steps

1. **Decide whether to fix the 8 code-review findings from earlier this session.** They were reported but never actioned. Highest-severity ones worth prioritizing:
   - `app/(app)/drying-room/bay-detail-modal.tsx`'s `TrolleyRow.save()` has no error handling (silent failure on save error) — every sibling handler in that file has try/catch + error state, this one doesn't.
   - `lib/pdf/drying-room-report-document.tsx`'s "Generated" timestamp uses `toLocaleString()` with no timezone conversion — will print UTC time in production (Vercel runs UTC), not facility-local time, unlike every other PDF in the app.
   - The mfg-reconciliation auto-fill `??` null-conflation bug described above.
   - (5 more, lower severity — duplicated auto-fill wiring across 5 files, a `numberOfTrolleys` display-count edge case, a couple of efficiency/reuse nits, a permissions-test coverage gap.)
2. Nothing else is outstanding — everything requested this session is built, tested, and live.

## Open questions

- Should the 8 audit findings be fixed now, or is the user satisfied shipping as-is and revisiting later? Don't fix speculatively — ask first, per the pattern this session (findings were reported, then the user moved on to other feature requests without addressing them).
- Carried over from the prior handover, still unanswered: does the user want a proper `Employee`-style department field for Drying Room, or WhatsApp send wiring? Don't build either speculatively.
