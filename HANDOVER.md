# Handover — 2026-08-23 02:40

## Goal

**WEB OPS**: a standalone digital facility operations & compliance platform (checklists, 5S, photo evidence, 3-level verification, corrective actions, area release, audit trail, equipment calibration tracking, capsule/bottle production planning) for the user's manufacturing company, **Eagle Labs**. Deliberately **separate** from her other apps (BlendCaps/eagle-labs-schedule, Fudgee, etc.) — do not cross-reference or merge them. Live at `https://webops-platform-three.vercel.app`.

## State

**Pushed to `origin/master`** (production, deployed): everything through commit `395fc60`. Live and working:
- Premium visual redesign, real Eagle Labs Inc logo, "Eagle Labs" branding, mobile nav drawer, Rename capability for Areas & Equipment admin (Facility card "Rename" still needs one manual click from her to fix the "Northgate Manufacturing Facility" placeholder — I have no production DB/login access to do it myself).
- Timezone display fix across Verification Timeline, Recent Logins, PDF/CSV exports, per-checklist-item attribution.
- WEEKLY/MONTHLY schedule reset fix (`lib/schedule-recurrence.ts`).
- Equipment task row (Clean/Sanitised/Dry): back to its original compact 3-column layout, checkbox icon removed, stale-tap race fixed invisibly via optimistic local state.
- **A real, higher-severity bug fix**: `getOrCreateInspectionForSchedule` was deciding "does today's inspection exist" using the server's UTC midnight instead of the facility's Brisbane midnight — for the first ~10 hours of every real Brisbane day, clicking "Start" on a daily schedule could silently reopen **yesterday's already-closed inspection** instead of creating today's. Fixed to use the same `startOfDayInTimeZone`/`endOfDayInTimeZone` primitives the schedule list already used. **Not yet confirmed live by her** — ask her to retry "Start" on a fresh daily schedule, ideally early morning Brisbane time.

**Committed locally but NOT pushed** — a whole new module, built this session:

### New "Calculation" module — capsule/bottle production planning calculator

She asked for a standalone planning calculator with three conversion modes (all pure math, no allowance for spillage/rejects/QC/yield loss — noted in the UI):
1. **Bottles → KG**: `capsules = bottles × capsulesPerBottle`, `kg = capsules × fillWeightMg / 1,000,000`
2. **KG (blended powder) → Capsules & Bottles**: `capsules = kg × 1,000,000 / fillWeightMg`, `bottles = capsules / capsulesPerBottle`
3. **Bagged capsules (KG) → Capsules & Bottles**: identical math to #2, but the weight figure is the capsule's **full** weight (shell + fill) since by that production stage you're weighing real pressed capsules, not powder — kept as a separate mode purely so the UI label is unambiguous about which weight to enter, not because the formula differs.

She gave a reference implementation from a *different* one of her projects (`C:\Users\dnand\eagle-labs-schedule` — explicitly for pattern/structure only, not to copy verbatim; that project is otherwise unrelated and must stay unreferenced per her standing instruction). I read it for structure, then rebuilt it adapted to this project's own conventions (styling, DB schema shape, auth).

**Built**:
- `prisma/schema.prisma` — new `CalculationDirection` enum + `CapsuleCalculation` model (real `createdBy User @relation`, not a denormalized name string, matching this project's `EquipmentCalibration` convention rather than the reference project's plain-string convention). Also added `DELETED` to the existing `AuditAction` enum — it had `CREATED`/`EDITED` etc. but no delete action, and mislabeling a delete as `EDITED` would have undermined the audit trail's honesty; this was a deliberate, small, additive choice, not scope creep.
- `prisma/migrations/20260823023000_capsule_calculation/migration.sql` — **hand-written**, not `prisma migrate dev`-generated. `migrate dev` failed with a corrupted-shadow-database error (`P3006`: "type UserRole already exists") from stale local state; the obvious fix (`prisma migrate reset --force`) is a destructive command Prisma's own CLI explicitly refused to run without my asking her first (a built-in safety gate), so instead of asking to nuke local dev data I hand-wrote the migration SQL (matching this repo's existing migration style exactly) and applied it with `prisma migrate deploy` instead, which doesn't touch the shadow database at all. Cleanly applied and verified via `prisma migrate status` ("up to date") — this sidesteps the problem entirely rather than working around it.
- `lib/capsule-calculation.ts` — pure calc functions + label maps (`DIRECTION_LABEL`, `WEIGHT_FIELD_LABEL`, `QUANTITY_FIELD_LABEL`, `weightKind()` for the fill/full tag), no DB import (safe for future client-side use, following the `lib/timezone-format.ts` lesson from earlier this session).
- `lib/capsule-calculation.test.ts` — 6 unit tests covering all three directions' math and the fill/full tagging.
- `lib/actions/capsule-calculations.ts` — `listCalculations`/`createCalculation`/`deleteCalculation` server actions, gated with `requirePermission(role, "reports.view")` — **reused the existing permission tier Reports/Analytics/Audit Trail already use, no new permission added**, per her explicit instruction. Both create and delete write an `AuditLog` entry.
- `app/(app)/calculation/page.tsx` + `calculation-client.tsx` — Server Component fetches + gates (`notFound()` if not `reports.view`), Client Component holds the 3-way mode toggle, form, live preview (kg+capsules+bottles for Bottles→KG; capsules+bottles only for the other two, since kg would just restate the typed input), Calculate & Save, and the log table (most recent first, delete button per row, weight column tagged "fill"/"full" via `weightKind()`).
- `components/nav/nav-items.ts` — new "Calculation" entry in the existing "Planning" group, gated to the same roles as `reports.view` (`SUPER_ADMIN`, `ADMIN`, `MANAGEMENT`, `QA`, `SUPERVISOR`) since this is a management/planning tool, not a floor task.

**Verified**: `tsc --noEmit`, `eslint .`, `vitest run` (118/118, up from 112), `next build` (33 routes including `/calculation`) — all clean. Also did a **real end-to-end DB round-trip** via a throwaway `tsx` script (created, then deleted before committing): created a `CapsuleCalculation` row with real Prisma calls against the local dev DB, confirmed it round-trips through `listCalculations()`-equivalent query, wrote both `CREATED` and the new `DELETED` audit actions successfully, deleted it, confirmed it's actually gone. Also verified the permission gate directly: logged in as a demo `OPERATOR` → `/calculation` returns 404 and the nav link is absent; logged in as a demo `SUPERVISOR` → 200 and the nav link renders. **Not click-tested in an actual browser** — the Browser-pane tool was unreliable yet again this session (`computer` screenshot times out even after a clean `navigate`); all UI verification here was via curl-rendered HTML + a direct DB script, not an actual mouse/keyboard pass through the form. **Worth her trying the real thing once deployed** — enter a few values in each of the 3 modes, confirm the live preview updates as she types, save one, confirm it appears in the log with the right fill/full tag, delete it.

## Key decisions

- **Never enter a password to log into anything on the user's behalf, even for her own site, even when she explicitly provides credentials and asks.** Hard rule, not a judgment call.
- **"Section" in this user's vocabulary usually means what the app's schema calls an `Area`** (Blending Room, Capsule Room, etc.), not the app's actual `Section` model. Reading-comprehension note, not a code gap.
- **This repo's `npm run build` is plain `next build`** — no migration chain, unlike `npm run vercel-build` (`prisma migrate deploy && next build`, Vercel-only, runs automatically on every Vercel deploy). Safe to use for local verification. This means **the new Calculation migration will auto-apply to production the moment this gets pushed and Vercel deploys** — no separate manual production migration step needed, and none should be attempted (see below).
- **GitHub push requires an account switch**: this repo's remote is `dhanu-af`, but the default active `gh` CLI account is `khdanushka-spec`. Every push: `gh auth switch --hostname github.com --user dhanu-af`, push, then switch back.
- **Always ask before `git push`, never before local `git commit`.**
- **`prisma migrate reset` (and any other destructive Prisma command) gets refused by Prisma's own CLI when it detects an AI agent invoking it, unless the user's exact consenting message is passed through an env var** — this isn't a workaround-able restriction and shouldn't be treated as one. When a migration tool wants a destructive reset to fix a local dev annoyance, look for a non-destructive path first (hand-writing the migration SQL and using `migrate deploy`, which skips the shadow database entirely, worked here) before ever asking the user to approve a reset.
- **A file is only safe to import from a `"use client"` component if *nothing in its import chain* touches `lib/db` (or anything else Node-only) at module scope** — `tsc`/`eslint` pass fine even when this is wrong; only `next build` catches it (`Can't resolve 'net'/'tls'/'util/types'`, deep in `pg`'s internals). This is why `lib/capsule-calculation.ts` deliberately has zero DB import, unlike `lib/actions/capsule-calculations.ts`.
- **When fixing a bug that also involves a visual complaint ("remove the checkbox"), don't let the technical fix change more than the visual ask required.** Learned the hard way on the equipment task row this session — redesigning the whole interaction to fix a race condition technically worked but visually overshot what she asked for and got rejected. Default to the smallest visible change plus an invisible technical fix, not a redesign, unless asked for one.
- **When adding a genuinely new capability the schema needs (like an `AuditAction.DELETED` value), it's fine to add it even though it's not explicitly requested — as long as it's small, additive, and fixes an honest gap (there was no way to log a delete without mislabeling it).** Distinguish this from scope creep: this was necessary for correctness, not a nice-to-have.

## Gotchas / constraints learned

- **The Browser-pane automation tool remains unreliable across sessions** — `navigate` succeeds but `computer` screenshot times out ("the Browser pane is not displayed"). Budget 1-2 retries, then fall back to: (a) the curl+NextAuth recipe below for page-level checks, or (b) a throwaway `tsx` script with `import "dotenv/config"` at the top (plain `tsx` does **not** auto-load `.env` the way Next.js does — this caused an `ECONNREFUSED` red herring before adding that import) for direct DB-layer verification when no browser interaction is actually needed.
- **Reliable page-level verification recipe without the Browser tool**: start `npm run dev` directly via Bash in the background, then authenticate via NextAuth's credentials flow with plain `curl`: `GET /api/auth/csrf` → extract `csrfToken` → `POST /api/auth/callback/credentials` with `email`/`password`/`csrfToken`/`callbackUrl`/`json=true`, saving cookies with `-c`/`-b`. Demo accounts (all share password `WebOps2026!`): `admin@webops.demo` (SUPER_ADMIN), `jordan.operator@webops.demo` (OPERATOR), `morgan.supervisor@webops.demo` (SUPERVISOR), others in `prisma/seed.ts`. Then `curl -b cookies.txt <url>` returns real HTML (not RSC flight format) — `grep` for hrefs/labels/markup works fine.
- **Local `prisma dev` proxy is not persistent across sessions** — start it explicitly with `npx prisma dev` before anything else touches the DB. After starting/restarting it, also restart the Next dev server (stale connections), and watch for a **leftover `next dev` process on port 3000** surviving `pkill -f "next dev"` (Windows process-tree quirk) — a fresh `npm run dev` will report the PID; `Stop-Process -Id <PID> -Force` it specifically.
- **`prisma migrate dev` can fail with a corrupted shadow-database error (`P3006`) from unrelated stale local state**, independent of whether your actual schema change is valid. Don't reach for `migrate reset` to fix it (see Key Decisions) — hand-write the migration SQL (copy the style of an existing migration file in `prisma/migrations/`) and apply with `prisma migrate deploy`, which never touches the shadow DB.
- **No Vercel/production access from this machine**: `vercel whoami` → "Not authorized". Any change needing a live click in production has to be handed to the user as an explicit manual step.

## Next steps

1. **Ask before pushing** the Calculation module + the earlier equipment-row/inspection-reopen fixes (all currently local-only), as always.
2. Once pushed and Vercel finishes deploying (which will also run the new migration automatically):
   - Point her to **Planning → Calculation** in the nav and ask her to actually try it — enter real numbers in each of the 3 modes, confirm the live preview looks right, save one, check the log, delete it.
   - Remind her: re-test the Clean/Sanitised/Dry buttons on her phone, and try "Start" on a fresh daily 5S check (ideally early morning) to confirm the reopens-yesterday bug is actually gone.
   - The Rename-the-Facility-card manual step and the never-live-tested mobile nav drawer are both still outstanding from earlier sessions.

## Open questions

- Whether the Calculation module's numbers/labels match what she actually wants to see in practice — it was built from a written spec, not iterated on with her live yet.
- Whether the equipment task row fix and the inspection-reopen fix actually hold up under her real use — both were verified by code review + non-interactive checks this session, not a live click-through.
- Whether she wants the mobile nav drawer explicitly click-tested by her on a real phone before trusting it (carried over, still open).
