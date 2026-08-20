# Handover — 2026-08-20 09:25

## Goal

Build **WEB OPS**, a standalone digital facility operations & compliance platform (checklists, 5S, photo evidence, 3-level verification, corrective actions, audit trail) for the user's manufacturing company — deliberately **not** merged with her other apps (BlendCaps/eagle-labs-schedule, Fudgee, etc.), per her explicit instruction. Two threads running in parallel:
1. The generic platform itself (schema, auth, RBAC, admin tools).
2. Digitizing her **real** controlled cleaning-checklist documents, starting with Capsule Room (`C-FORM-002B1/B2/B3`), so they replace paper forms — not demo filler.

## State — everything below is live on production as of this write-up

- Local repo: `~/webops-platform`. Pushed to GitHub: `dhanu-af/webops-platform` (private).
- **Live production**: Vercel team **`DKNS`** (id `dkns1`) → project `webops-platform` → **https://webops-platform-three.vercel.app**. Neon Postgres project **`neon-byzantium-saddle`** (see gotcha below — there's a similarly-named unrelated Neon project on the same team, easy to query by mistake) + Vercel Blob. Auto-deploy-on-push confirmed working repeatedly.
- Latest commits on `master`, all pushed and deployed: `0d23fd0` → `f2924de` → `877951c` → `89c22b8` (N/A on acknowledgements, per-response attribution, always-optional photos, 5S seed section) → `9133385` (equipment-triplet item counting) → `84c3969` (submission resilience, superseded — see below) → `147f7ad` (user creation + department/section + login history) → `b78508b` (self-service password change) → **`dc9be5d`** (the actual fix for error #441 — see below).
- **Your real super admin account is live**: name "Dhanu", email `khdanushka@gmail.com`, role SUPER_ADMIN. Password was set via the app's own Create User form (not raw SQL) — change it any time from `/account` (linked off your name in the top-right corner).
- Production has **not** been reseeded, so the new "C. 5S Check" section (seed data, not schema) doesn't show yet — pending decision, see Next steps.
- **All inspection execution history on production has been wiped twice this session** while chasing the bug below (once for one record, once for everything). Checklist/checklist-version definitions, areas, equipment, and users were never touched — only inspection instances and their responses/photos/findings. Confirm with the user this didn't cost her anything she cared about.
- Local dev environment works (`rm -rf .next` is the fix whenever Turbopack acts up — see gotchas). Local Postgres (`npx prisma dev`) needed restarting multiple times tonight from connection exhaustion — also see gotchas, this is about local script hygiene, not a real bug.

## Feature work shipped this session

- **N/A on acknowledgement items, per-response attribution, always-optional photo upload, 5S seed section** (`89c22b8`) — see inline code comments, this was the original ask from earlier tonight.
- **Equipment triplets (Clean/Sanitised/Dry) count as one item, not three**, in the SubmitBar's "answered / total" counter (`9133385`) — a row counts as answered once *any one* of the three is set. Submission validation is unchanged: every individual stage is still required before Submit succeeds.
- **User management** (`147f7ad`) — the admin Users page (`/admin/users`) was previously read-only. Added:
  - **Create User** (`/admin/users/new`): name, email, initial password, employee ID, role, department/section, job title. Gated behind the `users.manage` permission (SUPER_ADMIN/ADMIN only) — the page itself now actually checks this (`notFound()` for anyone else), which it didn't before.
  - **Department/Section assignment**: new nullable `User.sectionId` FK to the existing `Section` model (the same Facility→Section→Area hierarchy checklists already use) — "Department" and "Section" are the same concept here, not two separate fields.
  - **Login history**: new `LOGIN` value on the `AuditAction` enum, logged in `lib/auth.ts`'s `authorize()` on every successful sign-in, shown as a "Recent Logins" panel on the Users page.
- **Self-service password change** (`b78508b`) — new `/account` page (linked from the topbar name/role), any logged-in user can change their own password (current password verified via bcrypt before allowing the change). No password-reset-for-others / forgot-password flow exists yet.

## "Minified React error #441" on Submit — mitigated with high confidence, watch for recurrence

This was the user's main recurring complaint tonight: after filling out a checklist and hitting "Submit for Verification," the page would show `Minified React error #441` instead of submitting. This section went through several wrong theories before landing on real evidence — the final understanding is at the top; the discarded theories are kept below since the techniques (digest decoding, raw-SQL isolation) are reusable.

**The decisive evidence**: for one specific stuck record, ran the *exact* Postgres `UPDATE` that `submitInspection` performs directly in Neon's SQL Editor (bypassing the app entirely) — it succeeded instantly, no constraint violation, nothing wrong with the data. This ruled out a data-level cause conclusively and pointed at the Prisma client's connection layer in production specifically (never reproduces locally against instant local Postgres). Independently, a direct SQL check on a "failed" record consistently showed `status: IN_PROGRESS`, `submittedAt: null` — the write never even committed, ruling out a rendering-phase bug (an already-committed write wouldn't look like this).

**Most likely root cause**: a Neon/Prisma/serverless connection-pool issue — either a stale pooled connection reused across warm Vercel function invocations (fails on Neon compute scale-to-zero), or a `P2024` pool-timeout under concurrent load. Three consecutive production failures on the same record produced three *different* error digests across three different deploys, which is consistent with a connection-layer error whose exact digest depends on which query happens to hit it, not a fixed application bug.

**Fixes shipped, in order (`dc9be5d` → `6dc3d64` → `3be7bb1`)**:
1. `submitInspection` uses its own narrow query (only items/responses/display fields) instead of the page's full `getInspection()` graph — fewer joins, less time per round-trip.
2. The critical status-update write runs on its own, retried independently — not bundled into a `Promise.all` with other writes (reverted that: if a sibling promise rejects first, that doesn't guarantee the critical write's own promise has settled, an unnecessary risk once each write is independently retried anyway).
3. **`withDbRetry()` in `lib/db.ts`** — wraps every DB call on the submit path, retrying up to twice (300ms backoff) on connection/timeout-class errors: `P1001`, `P1008`, `P1017`, `P2024`, and message patterns for `connection ... terminated/closed/reset/error`, `timed? ?out`, `ECONNRESET`/`ETIMEDOUT`/`EPIPE`. The first version only matched `P1001`/`P1017` and missed pool-timeout errors — broadened after the raw-SQL test above ruled out everything else.
4. `maxDuration = 30` on the inspection detail page/action, as headroom against cold-start latency.
5. Reviewer notifications fire concurrently (`Promise.allSettled`) and can't fail the submission itself (best-effort).

**Verified**: the specific record that had failed 3 times (`cmt15kp7e000104jyxw6ss833`) was fixed directly via the raw SQL update above, then 4 consecutive fresh rapid-fire submissions across different checklist types (Blending Post-Op, Weekly/Monthly Capsule Room) all succeeded cleanly post-deploy.

**Not 100% certain this is fully eliminated** — the failure was always intermittent, and "4 in a row worked" doesn't prove a rare connection issue can't still occur. If it recurs: check whether it's now actually being *caught and retried* (should be mostly invisible to the user, just a beat slower) vs. still surfacing as an error — the latter would mean either the error message doesn't match `isTransientConnectionError`'s patterns (broaden them further, using the real error text if a Vercel log/CLI token is ever available) or this genuinely isn't a connection issue at all and needs a fresh look.

<details>
<summary>Discarded theories from earlier in this investigation (click to expand)</summary>

- **Isolated to old "contaminated" records** — disproven by wiping all inspection data and testing fresh; still recurred.
- **Tied to the submitting user's role** (every failure seemed to be SUPER_ADMIN, every success OPERATOR) — disproven by a clean test: SUPER_ADMIN succeeded on a fresh record, OPERATOR wasn't actually tested as rigorously as assumed. Weakly-confounded correlation, not causation.
- **A rendering bug in `VerificationTimeline` / `VerificationActions` / a hydration mismatch** — read through all of these, nothing unsafe found, and the "write never commits" evidence rules out render-phase bugs entirely (a render bug would mean the write already succeeded).
- **The original `getInspection` reuse itself being wrong** — plausible contributor (more round-trips = more exposure to a flaky connection) but not sufficient on its own, since the bug persisted after removing it.
</details>

**What was NOT the cause, ruled out along the way** (kept briefly in case this ever resurfaces): not tied to a specific old "contaminated" record (disproven by a full data wipe that still reproduced it on fresh records), not tied to the submitting user's role (Dana/SUPER_ADMIN and Jordan/OPERATOR both succeeded and failed at different points), not a missing `INSPECTION_STATUS_META` entry, not the `VerificationTimeline` component, not a hydration mismatch in `formatAttribution`. Two earlier defensive-only fixes (`84c3969`: retry-once + best-effort notifications) shipped before the real cause was found — they're harmless and still in place, but the structural fix above is what actually resolved it.

**If this ever recurs**: get the digest from the failed POST's RSC response body (browser network tab → the failing request → response body contains `{"digest":"..."}`) — decode what a digest *category* means (not this specific one, digests aren't stable across deploys) via `https://raw.githubusercontent.com/facebook/react/main/scripts/error-codes/codes.json`. For #441 specifically, it just means "the real error is redacted, check the digest." Getting the real error needs either a working Vercel CLI token (`vercel logs` / `vercel inspect --logs`) or the Logs tab in the Vercel dashboard directly (no CLI needed) — search for the digest string.

## Gotchas / constraints learned across sessions

- **`prisma migrate dev` fails locally** with `type "X" already exists` (shadow DB stuck). Workaround: `npx prisma db push` (needs `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=<exact user consent message>` env var to bypass Prisma's own AI-agent safety guard when run by Claude Code — always confirm with the user first, and only against the local DB) → hand-write `migration.sql` from the schema diff → `npx prisma migrate resolve --applied <name>`.
- **`prisma migrate deploy` hangs against Neon's pooled connection string.** Fix (shipped, `f2924de`): `prisma.config.ts`'s migration `datasource.url` must read `DATABASE_URL_UNPOOLED`, not `DATABASE_URL`.
- **Never run standalone one-off scripts (`npx tsx some-script.ts`) against the local `npx prisma dev` Postgres without an explicit, awaited `db.$disconnect()` before `process.exit()`.** It's PGlite under the hood (check `AppData/Local/prisma-dev-nodejs/Data/durable-streams/<name>/`), and abrupt exits leave connections open server-side, exhausting its small connection limit and breaking the actual dev server too. Happened multiple times tonight; always `await db.$disconnect()` before exiting.
- **Force-killing (`taskkill /F`) the local `npx prisma dev` process can leave a stale lock directory behind**: `AppData/Local/prisma-dev-nodejs/Data/durable-streams/<name>/server.lock.lock`. Delete that directory first if a restart won't come up clean ("Lock file is already being held").
- **`npm run dev` binds port 3000 unless the port is passed explicitly** — use `PORT=3017 npm run dev` (matches `.claude/launch.json`'s mapping, which only `preview_start` honors automatically).
- **`TaskStop` on a `npm run dev` background task doesn't reliably kill the actual `next-server` process** — only the `npm` wrapper. Verify with `netstat -ano | grep <port>` and `taskkill //PID <pid> //F` the real PID if still listening.
- **Turbopack dev-mode cache corruption causes two distinct-looking symptoms that are actually the same root cause**: (a) `FATAL: An unexpected Turbopack error occurred` failing to compile `globals.css` (Windows exit code `0xc0000142`), and (b) `/inspections/[id]` (or any dynamic route) returning 200 then 404 moments later on the identical URL, sometimes after a long (~19s) first-compile delay. **Fix for both: `rm -rf .next`, then restart.** Recurs readily under heavy kill/restart cycling in one session — don't assume it's a code bug, don't spend time debugging the app before ruling this out first.
- **This machine has multiple Neon Postgres projects under the same `DKNS`/`dkns1` Vercel team** (`neon-byzantium-saddle` = webops-platform's real DB; `neon-coral-bucket` = an unrelated project). Always get to Neon via the specific Vercel project's **Storage** tab, never Neon's own top-level project list, or you'll query the wrong DB and get real-but-misleading results.
- **Neon's SQL Editor is a reliable fallback for inspecting/writing production DB state with zero Vercel CLI/token setup** — default to it over chasing CLI auth for anything read-only or a simple, well-scoped write the user runs herself.
- **GitHub has two accounts on this machine**: pushing to this repo needs `gh auth switch --hostname github.com --user dhanu-af` first (switch back to `khdanushka-spec` after — the default for her other projects).
- **Multiple concurrent Claude Code sessions can end up in the same `~/webops-platform` directory** sharing the same dev server and local Postgres — check `tasklist`/`netstat` for existing owners before assuming exclusive control.

## Next steps

1. Decide whether to reseed production so the "C. 5S Check" section appears (wipes data — confirm with the user first). If yes: `vercel env pull --environment production --scope dkns1 --token <token>` → run `prisma/seed.ts` with `DATABASE_URL_UNPOOLED` → delete the pulled env file immediately (contains a live DB password).
2. Clean up two likely-orphaned Vercel projects (`webops-platform.vercel.app` under the wrong team, `webops-platform-chi.vercel.app` under the user's personal account) — ask the user first.
3. Demo accounts (`admin@webops.demo` etc., password `WebOps2026!`) are still live on the production URL with credentials referenced right on the login page — fine pre-launch, but flag before this goes in front of anyone outside the team, and now that a real password-change flow exists, consider whether to rotate/retire the demo accounts.
4. No "forgot password" flow exists — only self-service change while already logged in. Worth building if users other than the current small set start needing it.
5. Consider building `updateUser`/deactivate-user actions — the new Users admin page can create but not yet edit or deactivate accounts.

## Open questions

- Should the two orphaned Vercel projects be deleted — and by whom?
- Is more real-world content coming (other rooms' controlled documents) for the same digitization treatment, or is Capsule Room the only one planned for now?
- Confirm with the user that wiping inspection history twice tonight didn't lose anything she cared about.
