# Handover — 2026-08-23 01:48

## Goal

**WEB OPS**: a standalone digital facility operations & compliance platform (checklists, 5S, photo evidence, 3-level verification, corrective actions, area release, audit trail, equipment calibration tracking) for the user's manufacturing company, **Eagle Labs**. Deliberately **separate** from her other apps (BlendCaps/eagle-labs-schedule, Fudgee, etc.) — do not cross-reference or merge them. Live at `https://webops-platform-three.vercel.app`.

## State

**Pushed to `origin/master`** (production, deployed): everything through commit `8b939a1`. Live and working:
- Premium visual redesign (dark navy sidebar, indigo tokens, KPI cards, Facility Status Map, header search/notifications, table primitives)
- Real Eagle Labs Inc logo (`public/eagle-labs-logo.jpg`) in sidebar + login page
- Branding fully says "Eagle Labs" (not "WEB OPS", not "Eagle Labs Australia")
- Schedule area/section names are clickable → filtered Inspection History (`?areaId=`/`?sectionId=`)
- Rename capability for Areas & Equipment admin (Facility/Section/Area/Equipment "Rename" buttons) — **still needs the user to actually click "Rename" once** on the Facility card to fix the placeholder "Northgate Manufacturing Facility" name; I have no production DB access to do this myself.
- Mobile navigation drawer — verified structurally, never click-tested live by a person.
- Timezone display fix across Verification Timeline, Recent Logins, PDF/CSV exports, and the per-checklist-item attribution line (server timestamps were reading the server's UTC clock instead of the facility's `Australia/Brisbane` time).
- WEEKLY/MONTHLY schedule reset fix — a completed weekly/monthly schedule (e.g. "Weekly 5S Audit") no longer reappears as "not started" on days it isn't actually due.

**Committed locally but NOT pushed** (`3d19622` — 1 commit ahead of origin):

- **Equipment task row redesign** (`components/inspection/equipment-task-row.tsx`). The user tested the live "Weekly Cleaning Checklist" (Clean/Sanitised/Dry per equipment) on her phone and reported some taps "sometimes can't click", asking to remove the checkbox and match the 5S Audit checks' style instead.
  - **Root cause**: each stage was a single checkbox-style button that **cycled** blank → Done → N/A → blank based on the last server-revalidated `choiceValue`. On a real mobile connection, tapping again before the server action's `revalidatePath` round-trip landed meant the button still saw the old (stale) value and computed the *same* next state again — visually, the tap did nothing.
  - **Fix**: replaced the single cycling button per stage with two direct-set buttons (Done / N/A), matching the tap-a-fixed-value interaction already used by PASS_FAIL/ACKNOWLEDGEMENT items on 5S Audit checks elsewhere (those items use `db/prisma seed`'s `PASS_FAIL`/`ACKNOWLEDGEMENT` types) — each button always saves the same value regardless of current state, so there's no stale-state race left to hit. Also drops the small checkbox-square icon per her "remove tick box" ask; the button itself is now the sole indicator (solid fill = selected), same visual language as PASS_FAIL/ACKNOWLEDGEMENT.
  - **Verified**: `tsc --noEmit`, `eslint .`, `vitest run` (112/112, unchanged), `next build` — all clean. Also did curl-based rendering checks against a real inspection (`Weekly Cleaning Checklist — Capsule Room`, id `cmt2uboa90000s49kbd3zcxwn` in local dev seed data) confirming the new Done/N/A markup renders (15 `>Clean<`/`>Sanitised<`/`>Dry<` labels, 45 `>Done<`, 66 `>N/A<`) and the old checkbox SVG/`(N/A)` suffix markup is completely gone.
  - **Not click-tested live** — the Browser-pane automation tool was unreliable again this session (`computer` screenshot timed out repeatedly even after a clean `navigate`), so this hasn't actually been tapped by a finger/mouse, only verified by code review + rendered-HTML inspection. **Worth her re-testing on her phone once deployed** to confirm the original "can't click" complaint is actually resolved, since the root-cause diagnosis (stale-state race under slow mobile network) is inference from the code, not a reproduced-and-fixed bug.

## Key decisions

- **Never enter a password to log into anything on the user's behalf, even for her own site, even when she explicitly provides credentials and asks.** Hard rule, not a judgment call.
- **"Section" in this user's vocabulary usually means what the app's schema calls an `Area`** (Blending Room, Capsule Room, etc.), not the app's actual `Section` model (Production/Warehouse/Facility). Reading-comprehension note for future requests, not a code gap.
- **This repo's `npm run build` is plain `next build`** — no migration chain, unlike `npm run vercel-build` (`prisma migrate deploy && next build`, Vercel-only). Safe to use for local verification.
- **GitHub push requires an account switch**: this repo's remote is `dhanu-af`, but the default active `gh` CLI account is `khdanushka-spec`. Every push: `gh auth switch --hostname github.com --user dhanu-af`, push, then switch back. Don't skip the switch-back.
- **Always ask before `git push`, never before local `git commit`.**
- **A file is only safe to import from a `"use client"` component if *nothing in its import chain* touches `lib/db` (or anything else Node-only) at module scope** — even a single unused named export from such a module will drag the whole chain into the client bundle and break `next build` (bundler tries to resolve `pg`'s Node built-ins for the browser: `Can't resolve 'net'/'tls'/'util/types'`). `tsc`/`eslint` both pass fine even when this is wrong; only `next build` catches it. This is why `lib/timezone-format.ts` exists separately from `lib/timezone.ts` (the latter imports `@/lib/db` for `getFacilityTimezone`). When adding client-side formatting/utility helpers, check this before wiring them in, not after a failed build.
- **When a reported bug's actual mechanism is a client-side stale-state race** (a value computed from props that may be behind the latest server round-trip), prefer redesigning the interaction to be idempotent/direct-set over trying to patch the race directly — much simpler to reason about and verify, and removes the whole failure class rather than narrowing its window.

## Gotchas / constraints learned

- **The Browser-pane automation tool remains unreliable** across sessions — this time `navigate` succeeded but `computer` screenshot timed out every attempt ("the Browser pane is not displayed, so the page is not compositing frames"), even right after a fresh `navigate`. Budget 1-2 retries max, then fall back to the curl-based recipe below — don't burn time on it.
- **Reliable verification recipe without the Browser tool**: start `npm run dev` directly via Bash (not `preview_start`) in the background, then authenticate via NextAuth's credentials flow with plain `curl`: `GET /api/auth/csrf` → extract `csrfToken` → `POST /api/auth/callback/credentials` with `email`/`password`/`csrfToken`/`callbackUrl`/`json=true`, saving cookies with `-c`/`-b`. Demo login: `admin@webops.demo` / `WebOps2026!` (Super Admin). Then `curl -b cookies.txt <url>` — for this app's page router setup, plain page fetches return real HTML (not RSC flight format), so ordinary `grep`/`html` parsing works fine for finding hrefs, labels, and markup.
- **Local `prisma dev` proxy is not persistent across sessions** — it isn't a background service that survives; each fresh session needs `npx prisma dev` started explicitly before the app can authenticate/query the DB (confirmed this session: no prisma dev process was running at all, not a crash — first login attempt failed with `PrismaClientKnownRequestError` / NextAuth `error=Configuration` until it was started). After starting it, also restart the Next dev server (it holds stale connections to no-longer-existent proxy state) — and watch for a **leftover `next dev` process** surviving `pkill -f "next dev"` (Windows process-tree quirk): a fresh `npm run dev` will say "Another next dev server is already running" with a PID; `Stop-Process -Id <PID> -Force` it specifically, don't blanket-kill.
- **No Vercel/production access from this machine**: `vercel whoami` → "Not authorized". Any change needing a live click in production has to be handed to the user as an explicit manual step.

## Next steps

1. **Ask before pushing** the equipment task row commit (`3d19622`), as always.
2. Once pushed, mention to her:
   - Please re-test the Weekly Cleaning Checklist (Clean/Sanitised/Dry buttons) on her phone to confirm the "sometimes can't click" issue is actually resolved — this was fixed by diagnosis + code review, not by reproducing and confirming the fix live.
   - The Rename feature (from an earlier session, already pushed) still needs her to click "Rename" once on the Facility card in Areas & Equipment admin to fix the "Northgate Manufacturing Facility" placeholder name, if she hasn't already.
   - It'd be worth her clicking through the mobile nav drawer on an actual phone once too, since it's never been live-tested by a person.

## Open questions

- Whether she wants the mobile nav drawer explicitly click-tested by her on a real phone before trusting it, given it's never been verified live (carried over from an earlier session, still open).
- Whether the equipment task row fix actually resolves her "sometimes can't click" complaint — needs her live re-test since the Browser tool couldn't verify interactively this session either.
