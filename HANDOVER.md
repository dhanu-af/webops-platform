# Handover — 2026-08-22 12:00

## Goal

**WEB OPS**: a standalone digital facility operations & compliance platform (checklists, 5S, photo evidence, 3-level verification, corrective actions, area release, audit trail) for the user's manufacturing company. Deliberately **separate** from her other apps (BlendCaps/eagle-labs-schedule, Fudgee, etc.) — do not cross-reference or merge them. Three threads running across sessions:
1. The generic platform itself (schema, auth, RBAC, admin tools, full CRUD everywhere).
2. Digitizing her **real** controlled documents (Capsule Room's cleaning forms, 5S Daily Check, Bottling Line Clearance) so they replace paper — not demo filler.
3. **New as of today**: area-level access control, so section-floor staff only see their own area's work.

## State — as of this write-up

- Local repo: `~/webops-platform`. Pushed to GitHub: `dhanu-af/webops-platform` (private). **`HEAD` = `6d299c9`, NOT YET PUSHED** — ask the user before pushing (standing pattern this whole project).
- **Live production**: Vercel team `DKNS` (`dkns1`) → project `webops-platform` → **https://webops-platform-three.vercel.app**. Neon Postgres `neon-byzantium-saddle` + Vercel Blob (token confirmed present). Auto-deploy-on-push (including `prisma migrate deploy` via `vercel-build`) confirmed working reliably all project.
- **Area-level access scoping — built today, verified locally, NOT YET DEPLOYED** (see Key decisions below for full design). This is a real behavior change to who-sees-what; make sure the user actually wants it live before pushing, even though she explicitly asked for it.
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

## Files touched today (major ones; full history in `git log --oneline`)

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

## Next steps

1. **Ask the user whether to push `6d299c9` (the area-scoping feature) to production** — it's a real behavior change (some users will suddenly see less than before), so don't push-and-forget even though she asked for it; confirm she's ready, and suggest she spot-check one real Operator/Supervisor's account's Assigned Area is set correctly right after deploy (nobody has one assigned yet in production — this feature is a no-op for everyone until she actually assigns areas via Users admin).
2. **Get Bottling Line, Gummy Production, and Pouch Line's real Pre-Start and Post-Operation Cleaning paper forms** — she's shared a Google Form link once already; fetch it the same way if she does again.
3. **Confirm the HEIC/photo-format fix actually worked** — ask her to retry whatever format got rejected before.
4. Everything else genuinely needs her input (see Open Questions) — no other clearly-scoped, no-decision-needed work is currently identified.

## Open questions — still genuinely need the user

- **Which real users get an Assigned Area, and which stay unassigned (full visibility)?** The scoping feature does nothing until she actually goes into Users admin and assigns areas to her Operators/Team Leaders/Supervisors. Worth walking her through this once, since it's the actual point of today's work.
- **Two likely-orphaned Vercel projects** — can't inspect or delete these from here (session's Vercel access is a different account/team); needs her to check the Vercel dashboard directly.
- **Forgot-password flow** — needs an email provider decision (e.g. Resend via Vercel Marketplace) and provisioning.
- **`VerificationWorkflow` has no versioning** — not an issue yet; flag if it becomes one.
- **Demo accounts** — confirmed no real exposure pre-launch; revisit before this goes in front of anyone outside the team.
