# Handover — 2026-08-22 23:10 (Premium visual redesign — not committed, not pushed)

## Goal

**WEB OPS**: a standalone digital facility operations & compliance platform (checklists, 5S, photo evidence, 3-level verification, corrective actions, area release, audit trail, equipment calibration tracking) for the user's manufacturing company. Deliberately **separate** from her other apps (BlendCaps/eagle-labs-schedule, Fudgee, etc.) — do not cross-reference or merge them.

## This session: premium visual redesign (no functional/logic changes)

The user asked for a full visual upgrade to a "premium enterprise SaaS" look — modern Quality & Operations Management platform feel, dark navy sidebar, refined indigo accent, better KPI cards, a real operational Facility Status Map, a fuller header (search/notifications/avatar), consistent tables, all without touching business logic, permissions, schema (beyond what already existed), or removing any module. **Everything below is presentational or additive-UI only** — no workflow, permission, or data-shape change to any existing feature.

### Design tokens (`app/globals.css`)
- Refined the accent from a flat blue (`#2952cc`) to a proper indigo (`#4338ca` light / `#7b7ff2` dark) — matches "refined blue/indigo primary accent."
- New **fixed dark-navy sidebar token set** (`--sidebar-bg`, `--sidebar-fg`, `--sidebar-active-bg`, `--sidebar-accent`, etc.) — deliberately **not** tied to light/dark theme switching; the sidebar is always dark navy regardless of the user's OS theme, the classic "dark rail, light canvas" enterprise SaaS split.
- New radius scale (`--radius-sm: 8px`, `--radius: 12px`, `--radius-lg: 16px`) **remapped onto Tailwind's own `rounded-md/lg/xl` utility scale** via `@theme inline` — this was the highest-leverage single change: every existing `rounded-lg` input/button/chip across the *entire app* (there are dozens, in forms I never touched) picked up the new premium radius for free, with zero per-file edits.
- New shadow scale (`--shadow-xs/sm/md/lg`) with separate, more visible values for dark mode (shadows on dark backgrounds need higher-opacity black, not the same rgba as light mode).

### Shared components (cascades to nearly every page automatically)
- **`components/ui/card.tsx`** — subtle shadow via the new token, a divider under `CardHeader`, new `CardDescription` sub-component, optional `interactive` hover-elevate prop.
- **`components/ui/badge.tsx`** — added a subtle inset ring per tone for clearer status definition ("clear status indicators").
- **`components/ui/button.tsx`** — primary variant gets a restrained vertical gradient + shadow that lifts on hover, all variants get a tiny `active:scale-[0.98]` press micro-interaction.
- **`components/ui/table.tsx`** (new) — `Table`/`TableHead`/`TableHeaderCell`/`TableBody`/`TableRow`/`TableCell` primitives, applied to the three pages that had literal `<table>` markup: Audit Trail, Inspection History, Reports.

Because Corrective Actions, Evidence Gallery, Equipment Calibration, Checklists, Users, Workflows, Settings, etc. **already used** `Card`/`Badge`/`Button` before this session, they all inherit the new look with no changes to their own files — this is why the diff is concentrated in a handful of shared files plus the pages explicitly called out in the request (Dashboard, Sidebar, Header, Calibration).

### Sidebar (`components/nav/sidebar.tsx`)
Dark navy background, gradient brand mark, "Quality & Operations" subtitle under WEB OPS, a left accent bar + tinted background on the active nav item (replacing the old plain soft-background active state), refined icon color states. **Nav structure/routes untouched** — same groups, same items, same hrefs.

### Header (`components/nav/topbar.tsx`, was a bare date+signout bar)
Rebuilt into a proper premium header: date **and** facility time, a real working **global search** (new `components/nav/global-search.tsx` — submits to `/inspections?q=<term>`, which is an *existing* filter param on the Inspections page, not a new search backend), a real **notification bell** (new `components/nav/notification-bell.tsx` + `lib/data/notifications.ts` + `lib/actions/notifications.ts` — reads the `Notification` table that already existed and was already being written to by `lib/notifications.ts`'s `notify()`/`notifyUsers()`, just had **no UI consumer anywhere in the app before this**), and an avatar-initials + name + role chip replacing the old plain text/role pair. Sign-out button unchanged.

**Judgment call worth flagging**: the notification bell and its mark-as-read actions are the one piece of this session that's technically new interactive functionality, not just restyling — but it's built entirely on data and a data-flow that already existed (real `Notification` rows, real `notify()` calls elsewhere in the codebase); this only adds a way to *see* them. Two new tiny files (`lib/data/notifications.ts`, `lib/actions/notifications.ts`) support it — `markNotificationRead`/`markAllNotificationsRead`, both scoped by `userId` so one user can never touch another's notifications.

### Dashboard (`app/(app)/dashboard/page.tsx`, `components/dashboard/kpi-card.tsx`, `components/dashboard/facility-status-map.tsx`)
- KPI cards: icon in a tone-coloured soft badge, larger tabular number, a `helpText` line under each (e.g. "Last 30 days", "Needs attention"), and an optional thin progress bar (used on Compliance % and 5S Score — real values, not decorative). Subtle lift-on-hover.
- Facility Status Map: each row is now a full clickable card-row (→ `/inspections?areaId=<id>`, an existing filter param) with a colour-coded left rail (green/amber/red/neutral matching release status), a department chip, a status-context icon, and a chevron that appears on hover. **All fields shown were already being fetched** (`sectionName`, `responsiblePerson`, `lastInspectionAt`, `openFindings`, `releaseStatus`) — no new query.

### Equipment Calibration (`app/(app)/calibration/page.tsx`, `.../[equipmentId]/page.tsx`, `components/calibration/record-calibration-form.tsx`)
Added the 5 requested summary stat chips (Total Equipment / Current / Due Soon / Overdue / Never Calibrated) at the top of the list page — computed client-side from the already-fetched `equipment` array, not a new query, not fake data. Record-calibration form now sits inside a proper `Card` with a title/description instead of a bare bordered box; the collapsed state is a primary button with a `+` icon instead of a plain secondary button. History rows got a real "Certificate" pill-button (with a file icon) instead of a bare text link.

### Tables (Audit Trail, Inspection History, Reports)
Swapped the three literal `<table>` implementations onto the new `components/ui/table.tsx` primitives — tinted header row, consistent cell padding, row hover highlight. Also swapped 4 leftover raw `<button type="submit" className="rounded-lg bg-accent...">Apply</button>` filter-bar buttons (Audit, Inspections, Analytics, Calendar) onto the shared `<Button>` component for consistency — purely cosmetic, same GET-form behaviour.

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint .` — clean, zero warnings.
- `npx vitest run` — **106/106 tests pass**, unchanged from before this session (nothing here touches logic these tests would exercise).
- `npm run build` (plain `next build`, no migration chain in this repo's `build` script — see Gotchas) — clean, all 31 routes still build, no new routes, no removed routes.
- **Manually verified in the browser** (local dev, `admin@webops.demo`): Dashboard KPIs render with helpText/progress, Facility Status Map rows link correctly to `/inspections?areaId=`, Sidebar computed styles confirmed dark navy (`rgb(13,19,39)`) with correct active-state colours, Header confirmed showing date/time + working search (confirmed it actually navigates to `/inspections?q=blending`) + notification bell (opens, shows real "You're all caught up." state for this account) + avatar/role chip, Equipment Calibration page shows real computed stat counts (4 total / 1 current / 3 never calibrated, matching actual local data), Audit Trail/Inspections tables render with the new `Table` primitives and real data. Token values spot-checked via computed styles (`border-radius: 12px`, box-shadow matching `--shadow-xs`, border colour matching `--border`) — all correct.

## Functional changes, for the record (everything else is pure styling)
1. Global header search — new, wired to the existing `q` filter on `/inspections`.
2. Notification bell — new UI surface for an existing, previously-unconsumed data table; two new tiny server actions to mark read.
3. Facility Status Map rows are now clickable (→ filtered Inspections) — previously inert `<div>`s.

Nothing else changed behaviourally. No schema change, no migration, no permission change, no route removed, no workflow altered.

## NOT done this session (explicitly, per the user's instructions)
- **Not committed.** All of the above is sitting as uncommitted working-tree changes.
- **Not pushed, not deployed.** Vercel production (`webops-platform-three.vercel.app`) is completely untouched — still running the pre-redesign UI.

## Gotchas carried forward
- **Local `prisma dev` proxy is unstable under heavy churn** (many rapid dev-server restarts/hot-reloads in one session reliably produces `P1017`/"Server has closed the connection" errors on *any* query, including ones this session never touched — confirmed 3 separate times today, unrelated to any code change). Fix each time: find the actual node process on ports 51213–51215 (`Get-CimInstance Win32_Process -Filter "Name='node.exe'"`, filter for `prisma dev`/`cli-dev` in the command line — never a blanket `taskkill`), `Stop-Process -Force`, delete the stale lock **directory** at `%LOCALAPPDATA%\prisma-dev-nodejs\Data\durable-streams\default\server.lock.lock`, `npx prisma dev` again, then restart the Next dev server itself (it holds its own now-stale connections to the old proxy instance).
- **Standalone `tsx`/`node` scripts can't reach the local `prisma dev` proxy at all** (`ECONNREFUSED` via Prisma's adapter specifically) even though raw TCP/raw `pg` both connect fine from the same shell — always verify through the actual running dev server via the browser, never a standalone script.
- **The Browser-pane automation tool in this environment intermittently returns a stale DOM/URL snapshot** — `get_page_text`/`read_page` occasionally show the *previous* page's content even after a confirmed successful client-side navigation (independently confirmed via `location.href` reading correctly, then reading incorrectly moments later on the same tab). Don't conclude a real navigation bug from one inconsistent read — re-check with a fresh `javascript_exec` reading `location.href` directly before trusting it.
- **`npm run build` in this repo is plain `next build`** — no migration chain, unlike `npm run vercel-build` (`prisma migrate deploy && next build`), which only ever runs on Vercel. Safe to use for local verification.
- Test calibration record from the previous session (`CERT-TEST-001`, "NATA Cal Services Pty Ltd" on "High Shear Blender 1") is still sitting in local dev data — harmless, same category as the other `*.demo` test accounts already there.

## Next steps
1. **Review the visual changes** — start the dev server (`npm run dev`) and click through Dashboard, Sidebar, Header, Equipment Calibration, Audit Trail, Inspections at minimum.
2. Say the word and this gets committed (and pushed, if you also want it live) — nothing happens to git or Vercel until then.
3. If you want the same design system pass extended further (Users admin, Checklist Builder, Workflows, Settings pages weren't individually opened/edited this session — they inherit the shared Card/Badge/Button/radius improvements automatically, but weren't given page-specific attention like Dashboard/Calibration were), say so and it can be a fast follow-up.
