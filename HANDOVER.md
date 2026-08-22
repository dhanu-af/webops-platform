# Handover — 2026-08-23 03:10

## Goal

**WEB OPS**: a standalone digital facility operations & compliance platform (checklists, 5S, photo evidence, 3-level verification, corrective actions, area release, audit trail, equipment calibration tracking, capsule/bottle production planning) for the user's manufacturing company, **Eagle Labs**. Deliberately **separate** from her other apps (BlendCaps/eagle-labs-schedule, Fudgee, etc.) — do not cross-reference or merge them. Live at `https://webops-platform-three.vercel.app`.

## State

**Pushed to `origin/master`** (production, deployed): everything through commit `4a0cfb4`. Live and working:
- Premium visual redesign, real Eagle Labs Inc logo, "Eagle Labs" branding, mobile nav drawer, Rename capability for Areas & Equipment admin (Facility card "Rename" still needs one manual click from her to fix the "Northgate Manufacturing Facility" placeholder — I have no production DB/login access to do it myself).
- Timezone display fix across Verification Timeline, Recent Logins, PDF/CSV exports, per-checklist-item attribution.
- WEEKLY/MONTHLY schedule reset fix (`lib/schedule-recurrence.ts`).
- Equipment task row (Clean/Sanitised/Dry): back to its original compact 3-column layout, checkbox icon removed, stale-tap race fixed invisibly via optimistic local state.
- **A real, higher-severity bug fix**: `getOrCreateInspectionForSchedule` was deciding "does today's inspection exist" using the server's UTC midnight instead of the facility's Brisbane midnight — for the first ~10 hours of every real Brisbane day, clicking "Start" on a daily schedule could silently reopen **yesterday's already-closed inspection** instead of creating today's. Fixed to use the same `startOfDayInTimeZone`/`endOfDayInTimeZone` primitives the schedule list already used. **Not yet confirmed live by her** — ask her to retry "Start" on a fresh daily schedule, ideally early morning Brisbane time.
- **Calculation module, v1** — 3-mode capsule/bottle planning calculator (Bottles→KG, KG→Output, Bagged Capsules→Output), pre-filled with default capsules-per-bottle (31) / fill weight (372mg) values.

**Committed locally but NOT pushed** — two more Calculation-module iterations, built later the same session in response to her live feedback on v1:

### Calculation v2: 4th mode — "Capsules → Empty shells needed"

The reverse of KG→Output: given a capsule count, computes empty shell weight (kg) and boxes of empty shells to buy (bulk purchasing unit). Two things make this mode different from the other three, both handled:
- **Ceiling, not floor, on the container count** — `boxesNeeded = Math.ceil(capsules / capsulesPerBox)`, since you can't buy a partial box (the other three modes leave a fractional bottle count as-is, matching the app's existing "theoretical figures" framing).
- **The "capsules" figure is the given input, not a computed output** — so the UI skips showing a capsules tile in the live preview/mode-1-style breakdown (only shell-weight-kg and boxes are shown), unlike the other three modes where capsules is always one of the results.

**Built** (all in `lib/capsule-calculation.ts` + `app/(app)/calculation/calculation-client.tsx`):
- `CalculationDirection` enum gained `CAPSULES_TO_SHELLS` (new migration, additive-only, see Gotchas).
- New label maps: `PER_CONTAINER_LABEL` ("Capsules per Bottle" vs "Capsules per Box" — the schema's `capsulesPerBottle` column is reused to mean "per box" for this mode, same "meaning depends on direction" pattern the weight field already used) and `CONTAINER_RESULT_LABEL` ("Bottles" vs "Boxes").
- `weightKind()` now returns `"fill" | "full" | "shell"`.
- New `showsCapsulesResult()` and `kgResultLabel()` helpers drive which preview tiles render per direction (replacing the old `direction === "BOTTLES_TO_KG"` hardcoded checks) — the preview grid is now `tileCount === 3 ? 3-col : 2-col` computed from these, not hardcoded per-direction.
- Log table: header renamed "Bottles" → "Bottles / Boxes"; each row's Bottles/Boxes cell now has a small inline caption ("bottles"/"boxes") so a CAPSULES_TO_SHELLS row's number is unambiguous even though it shares a column with bottle counts.
- 5 new unit tests in `lib/capsule-calculation.test.ts` covering the ceiling-rounding behavior specifically (verified 10,001 capsules / 500 per box → 21 boxes, not 20 or 20.002).

### Calculation v3: Product Name + Batch Number fields

She interrupted mid-build (pointing at a screenshot of the "Label"/"Capsules per Bottle" fields) asking to add these. Added as two more optional text fields:
- `productName` and `batchNumber` columns on `CapsuleCalculation` (both nullable, additive migration).
- Form now has 6 fields in a `grid-cols-2 sm:grid-cols-3` layout (was 4 in `sm:grid-cols-4`): Product Name, Batch Number, Label, then the existing Capsules-per-X/Weight/Quantity row.
- Log table's first column (renamed "Label" → "Product / Batch") now shows product name as the primary line, with batch number + label combined on a muted secondary line (`Batch #X · label text`, or "—" if both are empty) — chose to fold these into the existing column rather than add 2 more raw table columns, since the table already needs horizontal scroll at `min-w-[900px]`.

**Both v2 and v3 verified together**: `tsc --noEmit`, `eslint .`, `vitest run` (123/123, up from 118), `next build` (still 32 routes, `/calculation` present) — all clean. Did a second real DB round-trip via a throwaway `tsx` script: created a `CAPSULES_TO_SHELLS` row with `productName`/`batchNumber` set, confirmed the ceiling math (10,001 → 21 boxes, not 20), deleted it. Also re-verified via curl that the new mode's label and the two new field labels actually render in the HTML. **Still not click-tested in an actual browser** — Browser-pane tool unreliable yet again this session, same as v1. **Worth her trying all 4 modes plus the new fields live once deployed.**

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
- **Local `prisma dev` proxy is not persistent across sessions** — start it explicitly with `npx prisma dev` before anything else touches the DB. After starting/restarting it, also restart the Next dev server (stale connections), and watch for a **leftover `next dev` process on port 3000** surviving `pkill -f "next dev"` (Windows process-tree quirk) — a fresh `npm run dev` will report the PID; `Stop-Process -Id <PID> -Force` it specifically. **New failure mode seen this session**: the proxy can end up in a state where `Get-NetTCPConnection`/`Test-NetConnection` show the port genuinely listening, yet Prisma still gets `P1001: Can't reach database server` — not an IPv4/IPv6 localhost issue (tried `127.0.0.1` explicitly, same failure). Fix: find the actual owning PID via `Get-NetTCPConnection -LocalPort 51213,51214,51215,51216`, `Stop-Process -Id <that PID> -Force`, confirm the port is free, then `npx prisma dev` again. If that then reports "Lock file is already being held", delete the lock (`Remove-Item "$env:LOCALAPPDATA\prisma-dev-nodejs\Data\durable-streams\default\server.lock.lock" -Recurse -Force`) and retry once more — this combination (dead-but-listening port + stale lock) needed both fixes together this time, not just one.
- **`prisma migrate dev` can fail with a corrupted shadow-database error (`P3006`) from unrelated stale local state**, independent of whether your actual schema change is valid. Don't reach for `migrate reset` to fix it (see Key Decisions) — hand-write the migration SQL (copy the style of an existing migration file in `prisma/migrations/`) and apply with `prisma migrate deploy`, which never touches the shadow DB.
- **No Vercel/production access from this machine**: `vercel whoami` → "Not authorized". Any change needing a live click in production has to be handed to the user as an explicit manual step.

## Next steps

1. **Ask before pushing** the Calculation v2+v3 work (2 new migrations, all currently local-only), as always.
2. Once pushed and Vercel finishes deploying (which will also run both new migrations automatically):
   - Point her to **Planning → Calculation** and ask her to try the 4th mode ("Capsules → Empty shells needed") plus the new Product Name/Batch Number fields — this is the first real click-through of the whole module, v1 through v3 have only been verified non-interactively so far.
   - Remind her: re-test the Clean/Sanitised/Dry buttons on her phone, and try "Start" on a fresh daily 5S check (ideally early morning) to confirm the reopens-yesterday bug is actually gone.
   - The Rename-the-Facility-card manual step and the never-live-tested mobile nav drawer are both still outstanding from earlier sessions.

## Open questions

- Whether the Calculation module (all 4 modes, plus product/batch) matches what she actually wants in practice — built from written specs across 3 iterations, never yet click-tested by an actual person (me or her).
- Whether the equipment task row fix and the inspection-reopen fix actually hold up under her real use — both were verified by code review + non-interactive checks this session, not a live click-through.
- Whether she wants the mobile nav drawer explicitly click-tested by her on a real phone before trusting it (carried over, still open).
