# Handover — 2026-08-23 11:45

## Goal

**WEB OPS**: a standalone digital facility operations & compliance platform (checklists, 5S, photo evidence, 3-level verification, corrective actions, area release, audit trail, equipment calibration tracking, capsule/bottle production planning, manufacturing batch reconciliation) for the user's manufacturing company, **Eagle Labs**. Deliberately **separate** from her other apps (BlendCaps/eagle-labs-schedule, Fudgee, etc.) — do not cross-reference or merge them. Live at `https://webops-platform-three.vercel.app`.

## State

**Committed locally, not yet pushed.** `git log --oneline` from HEAD back to the last-pushed commit (`e10677c`) covers, in order: checklists area-scoping fix, multi-area user assignment, the 5S leaderboard, a live-ticking topbar clock, a horizontal sidebar brand layout, a full Dashboard redesign, a login-page redesign (twice — once generic, once matched to her reference mockup with a real building photo), an app-wide indigo→professional-blue palette swap, and — most recently — real GMP equipment register data (67 items from her `EQ.xlsx`) plus a reorganized Calibration page. **Two of these are schema migrations that will run against production the moment she pushes** — see Key decisions.

## What's live, in build order this session

1. **Checklists page area-scoping fix** — was the one page not filtered through `lib/scope.ts`.
2. **Multi-area user assignment** — `User.areaId` (single) → `User.assignedAreas` (many-to-many). Admin edit form is now a checkbox list. Full detail on this was in the previous handover version; not repeated here.
3. **"Best 5S Section" leaderboard** on `/five-s` — Daily/Weekly/Monthly toggle, facility-wide (not scoped).
4. **Live topbar clock** (`components/nav/facility-clock.tsx` + `lib/format-clock.ts`) — ticks every second instead of freezing at page load. `lib/format-clock.ts` deliberately has zero DB import so the client component can use it (see Gotchas).
5. **Sidebar brand block** — logo + "Quality & Operations" now sit side by side, logo enlarged (h-6→h-9), per her mockup.
6. **Dashboard redesign** — greeting header, 5 domain-summary KPI cards (`components/dashboard/summary-card.tsx`), an Operations Overview stacked-bar chart with Today/Week/Month toggle (`lib/data/dashboard.ts`'s `getOperationsOverviewChart`), a live Today's Operations table, Quality & Compliance progress rings, an Action Required list, a Recent Activity timeline (`lib/data/recent-activity.ts`), Quick Actions, and the pre-existing Facility Status Map kept further down. Every number is real — new lean aggregates (`getCorrectiveActionSummary`, `getEquipmentCalibrationSummary`) rather than fabricated data.
7. **Login page** — rebuilt twice. First pass: floating card, icon-accented inputs, gradient backdrop. Second pass, at her request, matched a reference mockup she provided — cropped the actual building photo out of her downloaded mockup image (the file was a full mockup export with text baked into the pixels, so I isolated just the clean photo region with `sharp`, see `public/login-facility.jpg`), added hexagon pillar icons and the "Quality • Compliance • Trust • Excellence" tagline, and a real password show/hide toggle. **Deliberately did not add** the mockup's "Sign in with SSO" button — no SSO provider is configured (`lib/auth.ts` is Credentials-only), so it would be a dead button.
8. **App-wide professional-blue palette** — single-file change (`app/globals.css`): `--accent`/`--accent-strong`/`--accent-soft`/`--sidebar-accent`/`--focus-ring`, both light and dark mode. Backgrounds/cards/the navy sidebar were already on-brief and untouched.
9. **Equipment Calibration: real data + reorganization** (this session's last piece of work):
   - Sorts equipment by urgency (Overdue → Due Soon → Never Calibrated → Current) per her explicit ask, within each area group.
   - Groups the whole page into Section → Area sections per her "add to separate sections" ask.
   - `Equipment` gained 10 new optional register fields (manufacturer/model, criticality, food safety risk, PPM frequency, service provider, status, last/next service date, validation status, comments) — all shown on the list rows and the equipment detail page now.
   - Imported her real 67-item equipment register from `C:\Users\dnand\Downloads\EQ.xlsx` — see Key decisions for the two data-quality calls made and what was deliberately excluded.

## Key decisions

- **The two most recent migrations (`20260823070000_equipment_register_fields`, `20260823080000_equipment_register_data`) will run against production the moment she pushes**, via Vercel's `vercel-build` (`prisma migrate deploy && next build`). The first just adds nullable columns — zero risk to existing data. **The second actually inserts her real 67-item equipment register into whatever database it runs against** — it's written as an idempotent `INSERT ... ON CONFLICT (areaId, code) DO UPDATE`, tested against local dev in both a fresh-insert simulation and a re-run-on-existing-data simulation (both rolled back, no real side effects from testing), so it's safe to run against production as-is. Flagged clearly to her before asking her to push, since this is real facility data landing in the real live app, not just a schema change.
- **Two genuine EQ-number collisions in her spreadsheet** — two different physical machines both labeled "EQ 107" (Control Panel vs a Pouch Machine added lower in the sheet), same for "EQ 108" (Gummy Cooling Tunnel vs a Thermal Oil Boiler). Resolved by renaming the newer of each pair to "EQ 107B"/"EQ 108B" — she should confirm this against her real facility labels/paperwork rather than trusting the guess blindly.
- **The sheet's "FACILITY & BUILDING INFRASTRUCTURE" section (FAC-001 through FAC-010)** — floors, walls, drains, pest screens, roof, HVAC ducts, etc. — was excluded from the Equipment import. These read as facility walkthrough checklist items (monthly visual checks, no serial numbers, no calibration-relevant due dates), not individually-tracked equipment. If she wants them in the app, they're a better fit as a new Checklist than as Equipment records.
- **Three new Areas were created** that didn't exist before: **QC Lab** (under the pre-existing but previously-empty "QA Lab" section), **Syrup Dispensing** (under Warehouse), **Utility Area** (under Facility, houses HVAC/compressed air/water system/boiler — anything logged as "Site-wide" or "All Production" in her sheet). A few Location→Area mappings were judgment calls (e.g. her sheet's plain "Warehouse" for two pallet jacks → mapped to the existing "Raw Material Storage" area) — worth her spot-checking once live.
- **Dashboard/login/palette work**: kept the existing Geist Sans font and the already-established indigo-turned-blue accent system rather than introducing Inter/Manrope or a literal navy hex everywhere — same reasoning as before, minimize blast radius on a request that named a font/palette direction rather than exact hex values.

## Files touched (this session, from the last handover onward)

- Checklists/multi-area/5S leaderboard: see previous handover section (not repeated).
- `lib/format-clock.ts` (new), `components/nav/facility-clock.tsx` (new), `components/nav/topbar.tsx` — live clock.
- `components/nav/sidebar.tsx` — horizontal brand block.
- `lib/data/dashboard.ts`, `lib/data/recent-activity.ts` (new), `lib/data/inspections.ts` (added `assignedUser` to `getTodaySchedules`'s include), `lib/timezone.ts` (`formatTimeInTimeZone`, `startOfMonthInTimeZone`, `formatDateSlashInTimeZone`, `monthNameInTimeZone` added across this session), `app/(app)/dashboard/page.tsx`, `components/dashboard/{greeting-header,summary-card,operations-overview-chart,todays-operations-table,quality-compliance,action-required,recent-activity-timeline,quick-actions}.tsx` (all new) — Dashboard redesign.
- `app/login/page.tsx`, `app/login/login-form.tsx`, `public/login-facility.jpg` (new) — login page, both passes.
- `app/globals.css` — palette swap.
- `prisma/schema.prisma` + 2 new migrations, `lib/data/calibration.ts`, `app/(app)/calibration/page.tsx`, `app/(app)/calibration/[equipmentId]/page.tsx` — equipment register + grouping/sorting.

## Gotchas / constraints learned (new this session, beyond what's in the previous handover version)

- **A running `next dev` process can hold a stale in-memory copy of the Prisma Client after `npx prisma generate`** — after adding new Equipment columns and regenerating, the already-running dev server kept returning `undefined` for every new field (silently, no error) until the dev server process itself was killed and restarted. `npx prisma generate` alone is not enough after a schema change; restart the Next dev server too, not just the `prisma dev` proxy.
- **`prisma dev` proxy flakiness recurred multiple times again this session**, same shape as before (`P1017`/`ConnectionClosed`), consistently right after migration/build churn. Same fix each time: find the PID on ports 51213-51216, kill it, delete the stale lock file, restart. Budget 2-3 cycles per heavy work session — this is now just expected, not a real incident.
- **Browser-pane `computer` click actions were unreliable again this session** for checkboxes/buttons specifically (click reports success, underlying React state doesn't change) — same workaround as documented before: a real DOM `.click()` via `javascript_tool`, and driving NextAuth login/logout directly via `fetch()` to `/api/auth/csrf` + `/api/auth/callback/credentials` / `/api/auth/signout` rather than clicking form buttons.
- **A raw SQL data migration that needs to run identically against multiple independently-seeded databases (local dev, production) can't hardcode ids** — every environment generates its own ids for the same seeded Section/Area names. Resolve rows by name via a subquery (`JOIN "Area" a ... WHERE a.name = '...'`) instead, and validate with a rolled-back transaction test (`BEGIN; ...; ROLLBACK;`) before trusting it — tested here both as a fresh insert (delete-then-reinsert inside the transaction) and as a re-run against already-existing data.

## Next steps

1. **Push everything** once she's ready — `git log --oneline e10677c..HEAD` to see the full list. Remember the `gh auth switch --hostname github.com --user dhanu-af` dance before pushing, and switch back after.
2. After deploy, she should spot-check: the two renamed EQ-number collisions (107B/108B), the handful of judgment-call Area mappings (pallet jacks → Raw Material Storage, X-ray system → Packaging/Pouch Area), and whether the excluded FAC-* facility-infrastructure items need a home elsewhere (a new Checklist, most likely).
3. Confirm whether she wants the "Sign in with SSO" capability actually built (real OAuth provider), since the login mockup she provided included it but nothing backs it today.

## Open questions

- Carried over, still unconfirmed in production: `STAGE_AREA_KEYWORDS` matching her real Area names for Manufacturing Reconciliation, whether her real 5S checklists are scheduled per-area (needed for the 5S leaderboard to show data), the Calculation module's 4 modes, the equipment task row and daily-schedule fixes, the mobile nav drawer.
- New this session: do the Area-mapping judgment calls above match her real facility layout? Does she want the FAC-* facility infrastructure items tracked as a Checklist instead of Equipment?
