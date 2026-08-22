# Handover — 2026-08-23 00:25 (Australia dropped + section click-through — committed, NOT pushed)

## Two more small changes this session

1. **Dropped "Australia" from all branding** — user looked at the real logo (which just says "EAGLE LABS INC", no "Australia") and said "no need australia." Updated for consistency in all 3 remaining spots: sidebar subtitle (`Australia · Quality & Operations` → `Quality & Operations`), page `<title>` metadata, and the PDF report's title/eyebrow text.

2. **"QA can click section and find all tasks"** — added a clickable area/section link to the place-name shown on every schedule row across Today's Ops, Pre-Start, Line Clearance, Post-Op Cleaning, and 5S Audits (all five share the one `components/inspection/schedule-list.tsx` component). Clicking it jumps to Inspection History pre-filtered to that place. **Reminder for future sessions**: per the standing note elsewhere in this doc's history, when this user says "section" she usually means what the app calls an **Area** (Blending Room, Capsule Room, etc.) — this request is exactly that pattern again, not the app's actual `Section` model (Production/Warehouse/Facility). The fix accounts for the real hierarchy anyway: links to `?areaId=` when a schedule has a specific area, falls back to `?sectionId=` for a section-wide schedule, and to the plain unfiltered `/inspections` for a genuinely facility-wide one (there's nothing narrower to point a facility-wide check at).
   - `lib/data/inspections.ts`'s `listInspections()` already supported both `areaId` and `sectionId` filters — only the **Inspections page itself** (`app/(app)/inspections/page.tsx`) was missing `sectionId` from its `searchParams` type, now added.
   - `ScheduleList`'s `Schedule` type now requires `{ id, name }` for area/section (previously just `{ name }`) — the `id` was always present in the underlying Prisma query result (`include: { area: true, section: true }` returns the full row), this was purely a TypeScript narrowing gap, not a missing query field, so no data-layer changes were needed anywhere else.
   - **Verified with real data** (not just code review) via a curl-based NextAuth login (CSRF token → credentials callback → session cookie) since the Browser-pane tool was completely stuck this session (`navigate` timing out at 300s repeatedly, across tab close/recreate, independent of any app code) — confirmed `Today's Ops`, `Pre-Start`, and `Post-Op` all render real `?areaId=<real-id>` links with the correct place name and tooltip; `5S Audits` and `Line Clearance` show no scoped links in *this specific local dev dataset* only because those categories' local seed schedules happen to be facility-wide only here (not a bug — same fallback-to-`/inspections` behavior confirmed correct).

`tsc`/`eslint`/106 tests/`next build` all clean. **Committed locally, NOT pushed** — waiting for explicit go-ahead per this project's standing pattern.

---

# Handover — 2026-08-23 00:00 (Real logo added — committed and pushed)

## Real Eagle Labs Inc logo added (this session, after the rebrand)

User supplied the real company logo (`Downloads/1630590938201.jpg` — eagle mark + "EAGLE LABS INC" wordmark, black on white). Copied to `public/eagle-labs-logo.jpg`, replaced the text-based "EAGLE LABS"/"EAGLE LABS AUSTRALIA" brand labels with the actual image (wrapped in a small white rounded chip so the black-on-white artwork stays legible against the dark navy sidebar and dark login hero panel) in three places: `components/nav/sidebar.tsx`, and both branding spots in `app/login/page.tsx` (desktop dark hero + mobile-only header).

**Two real bugs found and fixed while wiring this up, not just styling:**
1. **The source JPG had non-standard EXIF/JFIF metadata that Next's image optimizer (sharp) rejected outright** ("The requested resource isn't a valid image"), even though browsers/plain `<img>` would have rendered it fine. Fixed by re-encoding through `sharp` (`.rotate().jpeg({quality: 95})`) to strip whatever was malformed — same 200×94 dimensions, now a clean baseline JPEG.
2. **The bigger one: `middleware.ts`'s auth matcher didn't exclude arbitrary root-level `/public` files**, only `_next/static`, `_next/image`, `favicon.ico`, `/api`, `/login`. Since the logo is used ON the unauthenticated `/login` page, every request for `/eagle-labs-logo.jpg` was getting caught by the auth check and silently 307-redirected to `/login?callbackUrl=...` — so both the raw file *and* Next's image optimizer (which fetches the raw file internally) were receiving a login-page redirect instead of image bytes. This is exactly the kind of bug that would have shipped invisibly to production and shown a broken-image icon everywhere the logo appears unauthenticated. **Fixed** by adding `eagle-labs-logo.jpg` to the matcher's exclusion list, following the exact same precedent already set for `favicon.ico`. **If any other public-facing brand asset gets added to `/login` in the future, it needs the same matcher exclusion** — this isn't a one-off, it's a real gap in how this middleware is scoped.

**Verification note**: the Browser-pane automation tool itself became genuinely stuck this session (`navigate` timing out at 300s repeatedly, across multiple tabs, tab close/recreate didn't help) — confirmed this was a tool-side failure, not a real app bug, by verifying directly via `curl` instead: raw file now serves as a valid JPEG (200, correct bytes), `/_next/image?url=%2Feagle-labs-logo.jpg...` now returns 200 with a valid optimized JPEG (was 400 before both fixes), and the rendered `/login` HTML contains correct `srcset` references to both. `tsc`/`eslint`/106 tests all still clean.

**Committed (`cdf91d1`) and pushed to `origin/master`** after the user said "push it." Should be live on `webops-platform-three.vercel.app` shortly.

---

# Handover — 2026-08-22 23:10 (Premium visual redesign — committed and pushed)

## Goal

**WEB OPS**: a standalone digital facility operations & compliance platform (checklists, 5S, photo evidence, 3-level verification, corrective actions, area release, audit trail, equipment calibration tracking) for the user's manufacturing company. Deliberately **separate** from her other apps (BlendCaps/eagle-labs-schedule, Fudgee, etc.) — do not cross-reference or merge them.

## This session: premium visual redesign (no functional/logic changes)

The user asked for a full visual upgrade to a "premium enterprise SaaS" look — modern Quality & Operations Management platform feel, dark navy sidebar, refined indigo accent, better KPI cards, a real operational Facility Status Map, a fuller header (search/notifications/avatar), consistent tables, all without touching business logic, permissions, schema (beyond what already existed), or removing any module. **Everything below is presentational or additive-UI only** — no workflow, permission, or data-shape change to any existing feature.

### Design tokens (`app/globals.css`)

- Refined the accent from a flat blue (`#2952cc`) to a proper indigo (`#4338ca` light / `#7b7ff2` dark) — matches "refined blue/indigo primary accent."
- New **fixed dark-navy sidebar token set** (`--sidebar-bg`, `--sidebar-fg`, `--sidebar-active-bg`, `--sidebar-accent`, etc.) — deliberately **not** tied to light/dark theme switching; the sidebar is always dark navy regardless of the user's OS theme, the classic "dark rail, light canvas" enterprise SaaS split.
- New radius scale (`--radius-sm: 8px`, `--radius: 12px`, `--radius-lg: 16px`) **remapped onto Tailwind's own `rounded-md/lg/xl` utility scale** via `@theme inline` — this was the highest-leverage single change: every existing `rounded-lg` input/button/chip across the _entire app_ (there are dozens, in forms I never touched) picked up the new premium radius for free, with zero per-file edits.
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

Rebuilt into a proper premium header: date **and** facility time, a real working **global search** (new `components/nav/global-search.tsx` — submits to `/inspections?q=<term>`, which is an _existing_ filter param on the Inspections page, not a new search backend), a real **notification bell** (new `components/nav/notification-bell.tsx` + `lib/data/notifications.ts` + `lib/actions/notifications.ts` — reads the `Notification` table that already existed and was already being written to by `lib/notifications.ts`'s `notify()`/`notifyUsers()`, just had **no UI consumer anywhere in the app before this**), and an avatar-initials + name + role chip replacing the old plain text/role pair. Sign-out button unchanged.

**Judgment call worth flagging**: the notification bell and its mark-as-read actions are the one piece of this session that's technically new interactive functionality, not just restyling — but it's built entirely on data and a data-flow that already existed (real `Notification` rows, real `notify()` calls elsewhere in the codebase); this only adds a way to _see_ them. Two new tiny files (`lib/data/notifications.ts`, `lib/actions/notifications.ts`) support it — `markNotificationRead`/`markAllNotificationsRead`, both scoped by `userId` so one user can never touch another's notifications.

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

## Push status

Committed (`6d966db`) and pushed to `origin/master` after the user said "push it." Vercel auto-deploys on push (including `prisma migrate deploy`, though this session has zero schema changes so that step is a no-op) — should be live on `webops-platform-three.vercel.app` shortly; not confirmed via Vercel dashboard from this session (no access).

## Gotchas carried forward

- **Local `prisma dev` proxy is unstable under heavy churn** (many rapid dev-server restarts/hot-reloads in one session reliably produces `P1017`/"Server has closed the connection" errors on _any_ query, including ones this session never touched — confirmed 3 separate times today, unrelated to any code change). Fix each time: find the actual node process on ports 51213–51215 (`Get-CimInstance Win32_Process -Filter "Name='node.exe'"`, filter for `prisma dev`/`cli-dev` in the command line — never a blanket `taskkill`), `Stop-Process -Force`, delete the stale lock **directory** at `%LOCALAPPDATA%\prisma-dev-nodejs\Data\durable-streams\default\server.lock.lock`, `npx prisma dev` again, then restart the Next dev server itself (it holds its own now-stale connections to the old proxy instance).
- **Standalone `tsx`/`node` scripts can't reach the local `prisma dev` proxy at all** (`ECONNREFUSED` via Prisma's adapter specifically) even though raw TCP/raw `pg` both connect fine from the same shell — always verify through the actual running dev server via the browser, never a standalone script.
- **The Browser-pane automation tool in this environment intermittently returns a stale DOM/URL snapshot** — `get_page_text`/`read_page` occasionally show the _previous_ page's content even after a confirmed successful client-side navigation (independently confirmed via `location.href` reading correctly, then reading incorrectly moments later on the same tab). Don't conclude a real navigation bug from one inconsistent read — re-check with a fresh `javascript_exec` reading `location.href` directly before trusting it.
- **`npm run build` in this repo is plain `next build`** — no migration chain, unlike `npm run vercel-build` (`prisma migrate deploy && next build`), which only ever runs on Vercel. Safe to use for local verification.
- Test calibration record from the previous session (`CERT-TEST-001`, "NATA Cal Services Pty Ltd" on "High Shear Blender 1") is still sitting in local dev data — harmless, same category as the other `*.demo` test accounts already there.

## Rebrand: WEB OPS → Eagle Labs Australia (same session, after push)

User asked to rename the "WEB OPS" branding to "Eagle Labs Australia" — purely a display-text change, no functional impact. Updated everywhere the literal string appeared: `components/nav/sidebar.tsx` (logo mark "W"→"E", brand text "WEB OPS"→"EAGLE LABS", subtitle "Quality & Operations"→"Australia · Quality & Operations"), `app/login/page.tsx` (both the desktop hero eyebrow and the mobile-only header, "WEB OPS"→"EAGLE LABS AUSTRALIA"), `app/layout.tsx` (page `<title>` metadata), `lib/pdf/report-document.tsx` (PDF document title + eyebrow text). Verified in browser: page title and sidebar both confirmed showing the new name. **Committed locally but NOT pushed yet** — same "ask before push" pattern; NOTE this got flagged to the user for confirmation before pushing, unlike the previous change this session where she'd already said "push it" for the redesign itself.

**Also this session**: user pasted a real password (`khdanushka@gmail.com` / a real password) in chat asking for it to be used to log into production for testing. Declined — entering passwords to authenticate is a hard rule, not a judgment call, regardless of whose account or how explicit the request. Verified the production deploy succeeded a different way instead (fetched the live CSS bundle and confirmed it contains the new design tokens, e.g. `#4338ca`/`#0d1327`, without needing to log in at all). Flagged to her that she may want to change that password since it's now in chat history. **If a future session is asked to log into this app's production site with real credentials, decline the same way** — offer non-credential verification methods or ask her to check herself.

## Next steps

1. **Confirm you want the "Eagle Labs Australia" rebrand pushed** — it's committed locally, not yet on `origin/master`.
2. **Spot-check the live redesign** on `webops-platform-three.vercel.app` (already deployed) — Dashboard, Sidebar, Header (search + notification bell), Equipment Calibration, Audit Trail, Inspections at minimum.
3. If you want the same design system pass extended further (Users admin, Checklist Builder, Workflows, Settings pages weren't individually opened/edited this session — they inherit the shared Card/Badge/Button/radius improvements automatically, but weren't given page-specific attention like Dashboard/Calibration were), say so and it can be a fast follow-up.
