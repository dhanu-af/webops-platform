# Handover — 2026-08-23 01:32

## Goal

**WEB OPS**: a standalone digital facility operations & compliance platform (checklists, 5S, photo evidence, 3-level verification, corrective actions, area release, audit trail, equipment calibration tracking) for the user's manufacturing company, **Eagle Labs**. Deliberately **separate** from her other apps (BlendCaps/eagle-labs-schedule, Fudgee, etc.) — do not cross-reference or merge them. Live at `https://webops-platform-three.vercel.app`.

## State

**Pushed to `origin/master`** (production, deployed): everything through commit `6f1e5ac`. Live and working:
- Premium visual redesign (dark navy sidebar, indigo tokens, KPI cards, Facility Status Map, header search/notifications, table primitives)
- Real Eagle Labs Inc logo (`public/eagle-labs-logo.jpg`) in sidebar + login page
- Branding fully says "Eagle Labs" (not "WEB OPS", not "Eagle Labs Australia")
- Schedule area/section names are clickable → filtered Inspection History (`?areaId=`/`?sectionId=`)

**Committed locally but NOT pushed** (`477a29a`, `3f77c13` — 2 commits ahead of origin, unchanged since last handover):
1. **Rename capability** for Areas & Equipment admin (Facility/Section/Area/Equipment all have a "Rename" button). Built so she can rename the placeholder "Northgate Manufacturing Facility" to "Eagle Labs" herself — **I cannot do this myself** (no Vercel/production DB access, and logging into the live site with real credentials is off-limits regardless — hard rule). **Once deployed, tell her to open Areas & Equipment admin and click "Rename" on the Facility card once.**
2. **Mobile navigation drawer** (`components/nav/mobile-menu-button.tsx`, `components/nav/mobile-nav-context.tsx`, refactored `components/nav/sidebar.tsx`). Verified structurally via curl only — **never click-tested in a real/emulated browser** (Browser-pane tool was unreliable all last session). Worth an actual phone/DevTools check before fully trusting it.

**This session: finished, verified, and ready to commit** — the two real bugs the user found while using the live app, plus the deferred third piece of the same bug class:

1. **Timezone display bug** ("but time wrong" — Verification Timeline showing times ~10 hours off). Root cause: server-rendered timestamps used raw `date-fns format()`, which reads the *server's* UTC clock, not the facility's `Australia/Brisbane` time. Fixed in 4 places by routing through `lib/timezone.ts`'s `formatDateTimeInTimeZone()`/`formatDateTimeIsoInTimeZone()`:
   - `components/inspection/verification-timeline.tsx` + `app/(app)/inspections/[id]/page.tsx`
   - `app/(app)/admin/users/page.tsx` ("Recent Logins")
   - `lib/pdf/report-document.tsx` + `app/api/reports/export/pdf/route.ts` (PDF report)
   - `app/api/reports/export/route.ts` + `lib/timezone.ts` (new `formatDateTimeIsoInTimeZone`) (CSV export)
   - **This session, completed the deferred piece**: the client-side half of the same bug class — `lib/format-attribution.ts` (the per-checklist-item "who answered this, when" line, used by `components/inspection/checklist-item-card.tsx` and `components/inspection/equipment-task-row.tsx`, both Client Components). Previously used the *viewer's own browser* timezone (coincidentally correct for on-site Brisbane staff, wrong for anyone checking in remotely). Now takes an explicit `timeZone` prop threaded down from `app/(app)/inspections/[id]/page.tsx` (which already computes it) through both components, and formats via a new `formatCompactDateTimeInTimeZone()`.
     - **Build-breaking gotcha hit and fixed**: `lib/format-attribution.ts` is imported by two `"use client"` components. Having it import from `lib/timezone.ts` pulled that module's top-level `import { db } from "@/lib/db"` into the client bundle, and `next build` failed trying to bundle the Node-only `pg` driver (`Can't resolve 'net'/'tls'/'util/types'`) for the browser. **Fix**: pure Intl-based formatting functions that need to be safely importable from Client Components must not live in the same file as anything importing `lib/db` — moved `formatCompactDateTimeInTimeZone` into a new db-free module, **`lib/timezone-format.ts`**. Keep this pattern in mind for any *future* client-side formatting needs — check whether the target module (or anything it imports) touches `lib/db` before importing it from a `"use client"` file.

2. **Weekly/monthly schedule reset bug** ("yesterday 5S aduit still showing as a new START" — a completed WEEKLY/MONTHLY schedule reappeared as not-started the next day). Root cause: `getSchedulesByCategory()` and `getTodaySchedules()` fetched every active schedule regardless of whether it was actually due *today*, so WEEKLY/MONTHLY schedules (correct only on their actual due day) showed as "not started" on every other day too. The Calendar page already had the correct recurrence-day logic, just private to that file. **Fixed** by extracting it into a new shared `lib/schedule-recurrence.ts` (`scheduleAppliesOnDay()`) and filtering both functions' results through it. One intentional behavior difference from the original private version: frequencies with no fixed calendar pattern (`PER_SHIFT`, `AD_HOC`, `QUARTERLY`, `BEFORE_PRODUCTION`, etc.) now return `true` (always applies) instead of `false` — correct for the two newly-wired-up consumers (that branch was dead code in `calendar.ts`, which never queries those frequencies).
   - **Verified this session** with a new unit test file, `lib/schedule-recurrence.test.ts` (6 cases: DAILY always-applies, WEEKLY only-on-recurrence-day — the exact reported bug — WEEKLY empty-recurrenceDays fallback, MONTHLY day-of-month, no-fixed-pattern frequencies always-apply, and start/end date bounds). Chose a unit test over live dev-DB verification because the local seed data has no easily-reachable real WEEKLY example, and the local `prisma dev` proxy has been repeatedly unstable this machine session-to-session (see Gotchas) — a fast, deterministic test gives more confidence than another flaky manual pass.

**All of the above (both bug fixes, the client-side timezone piece, and the new test) has been run through the full verification suite and is clean**: `npx tsc --noEmit` (0 errors), `npx eslint .` (0 errors), `npx vitest run` (112/112 passed, up from 106), `npm run build` (succeeds, all 33 routes compile). **Not yet committed** — see Next Steps.

## Key decisions

- **Never enter a password to log into anything on the user's behalf, even for her own site, even when she explicitly provides credentials and asks.** Hard rule, not a judgment call.
- **"Section" in this user's vocabulary usually means what the app's schema calls an `Area`** (Blending Room, Capsule Room, etc.), not the app's actual `Section` model (Production/Warehouse/Facility). Reading-comprehension note for future requests, not a code gap.
- **This repo's `npm run build` is plain `next build`** — no migration chain, unlike `npm run vercel-build` (`prisma migrate deploy && next build`, Vercel-only). Safe to use for local verification.
- **GitHub push requires an account switch**: this repo's remote is `dhanu-af`, but the default active `gh` CLI account is `khdanushka-spec`. Every push: `gh auth switch --hostname github.com --user dhanu-af`, push, then switch back. Don't skip the switch-back.
- **Always ask before `git push`, never before local `git commit`.**
- **New this session**: a file is only safe to import from a `"use client"` component if *nothing in its import chain* touches `lib/db` (or anything else Node-only) at module scope — even a single unused named export from such a module will drag the whole chain into the client bundle and break `next build`. When adding client-side formatting/utility helpers, check this before wiring them in, not after a failed build.

## Files touched (this session, full list)

Verified, ready to commit (all currently uncommitted):
- `lib/schedule-recurrence.ts` (new) — shared `scheduleAppliesOnDay()`.
- `lib/schedule-recurrence.test.ts` (new) — 6 unit tests for the recurrence logic.
- `lib/data/calendar.ts` — now imports the shared function instead of defining its own copy.
- `lib/data/by-category.ts`, `lib/data/inspections.ts` — both now filter schedules by `scheduleAppliesOnDay()`.
- `components/inspection/verification-timeline.tsx`, `app/(app)/inspections/[id]/page.tsx` — Verification Timeline timezone fix + `timeZone` prop threading.
- `app/(app)/admin/users/page.tsx` — Recent Logins timezone fix.
- `lib/pdf/report-document.tsx`, `app/api/reports/export/pdf/route.ts` — PDF report timezone fix.
- `app/api/reports/export/route.ts`, `lib/timezone.ts` (added `formatDateTimeIsoInTimeZone`) — CSV export timezone fix.
- `lib/format-attribution.ts` — now takes a `timeZone` param, uses `formatCompactDateTimeInTimeZone`.
- `lib/timezone-format.ts` (new) — db-free home for client-safe Intl formatting (`formatCompactDateTimeInTimeZone`), split out of `lib/timezone.ts` to fix the build break described above.
- `components/inspection/checklist-item-card.tsx`, `components/inspection/equipment-task-row.tsx` — both now take/pass a `timeZone` prop.

Previously committed, not pushed (untouched this session): see prior handover section above under "Committed locally but NOT pushed".

## Gotchas / constraints learned

- **Client Component + `lib/db` import chain breaks `next build` silently until you actually run it** — `tsc --noEmit` and `eslint` both pass fine even when this is wrong; only `next build`'s bundler catches it (`Module not found: Can't resolve 'net'/'tls'/'util/types'`, deep in `pg`'s internals, several import-trace hops away from the actual mistake). Always run `npm run build`, not just `tsc`/`eslint`, after touching anything imported by a `"use client"` file.
- **The Browser-pane automation tool was unreliable for most of last session** (`navigate` timed out at 300s repeatedly). Not re-attempted this session — all verification here was `tsc`/`eslint`/`vitest`/`next build` plus a unit test, no dev server needed. If picking up UI/browser verification next, budget 1-2 retries max before falling back to the curl-based recipe below.
- **Reliable verification recipe without the Browser tool**: start `npm run dev` directly via Bash (not `preview_start`) in the background, then authenticate via NextAuth's credentials flow with plain `curl`: `GET /api/auth/csrf` → extract `csrfToken` → `POST /api/auth/callback/credentials` with `email`/`password`/`csrfToken`/`callbackUrl`/`json=true`, saving cookies with `-c`/`-b`. Demo login: `admin@webops.demo` / `WebOps2026!` (Super Admin). Then `curl -b cookies.txt <url>`. Response bodies for RSC/streamed pages are escaped-JSON flight format, not plain HTML.
- **Local `prisma dev` proxy instability recurred repeatedly last session**, always `P1017`/"Server has closed the connection", after heavy dev-server churn, never caused by the code under test. Fix: find the node process on ports 51213-51215 (`Get-CimInstance Win32_Process -Filter "Name='node.exe'"`, filter for `prisma dev`/`cli-dev`, **never** a blanket `taskkill`), `Stop-Process -Force`, delete the stale lock **directory** at `%LOCALAPPDATA%\prisma-dev-nodejs\Data\durable-streams\default\server.lock.lock`, `npx prisma dev` again, restart the Next dev server too. Watch for a leftover `next dev` process surviving `pkill -f "next dev"` (Windows process-tree quirk) — `Stop-Process -Id <PID> -Force` it specifically if a fresh server refuses to start.
- **No Vercel/production access from this machine**: `vercel whoami` → "Not authorized". Any change needing a live click in production has to be handed to the user as an explicit manual step.

## Next steps

1. **Commit** the verified uncommitted work (both bug fixes + the client-side timezone piece + new test). One commit is fine — they're all part of "the timezone/schedule bugs she found while using the live app this week," or split into 2 (timezone class vs. recurrence class) if she has a preference. No strong signal either way.
2. **Ask before pushing**, as always. Once pushed, mention to her: the Rename feature (from the earlier, already-committed work) still needs her to click "Rename" once on the Facility card to fix the "Northgate Manufacturing Facility" name; and it'd be worth her clicking through the mobile nav drawer on an actual phone once, since it's never been live-tested.

## Open questions

- Whether she wants the mobile nav drawer explicitly click-tested by her on a real phone before trusting it, given it's never been verified live (carried over from last session, still open).
- One vs. two commits for this session's work — no strong signal from her.
