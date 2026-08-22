# Handover — 2026-08-22 10:20

## Goal

**WEB OPS**: a standalone digital facility operations & compliance platform (checklists, 5S, photo evidence, 3-level verification, corrective actions, area release, audit trail) for the user's manufacturing company. Deliberately **separate** from her other apps (BlendCaps/eagle-labs-schedule, Fudgee, etc.) — do not cross-reference or merge them. Two threads running in parallel across sessions:
1. The generic platform itself (schema, auth, RBAC, admin tools, full CRUD everywhere).
2. Digitizing her **real** controlled documents (Capsule Room's cleaning forms, the 5S Daily Check) so they replace paper — not demo filler.

## State — live on production as of this write-up

- Local repo: `~/webops-platform`. Pushed to GitHub: `dhanu-af/webops-platform` (private). **Working tree clean, nothing uncommitted, nothing unpushed** — `HEAD` = `00138ec`.
- **Live production**: Vercel team `DKNS` (`dkns1`) → project `webops-platform` → **https://webops-platform-three.vercel.app**. Neon Postgres `neon-byzantium-saddle` + Vercel Blob (`BLOB_READ_WRITE_TOKEN` confirmed present, all environments, added 3 days before this write-up — user checked directly in the Vercel dashboard). Auto-deploy-on-push confirmed working reliably.
- The admin platform is feature-complete for everything identified so far: full CRUD on Facility/Section/Area/Equipment, Users, Checklists (+ cloning + real delete, see below), Verification Workflows, System Settings, Audit Trail viewer, Reports, Analytics, Calendar.
- **5S Daily Check rollout**: "Capsule Room" and "Blending Room" clones both now have correctly area-scoped `DAILY · SUPERVISOR` schedules and appear on `/five-s`. (Blending Room's was originally facility-wide; user fixed it herself via Pause + Add Schedule after automation was blocked from touching an existing production schedule.)
- **Photo evidence on 5S NUMERIC items — built and fixed today, see Key decisions.** Working end-to-end now, including real phone photos (JPEG confirmed by user; HEIC/other formats should now work too after today's fix, unconfirmed as of this write-up — worth asking if she's retried).

## Key decisions

- **Real controlled documents are built via the live admin UI (Checklist Builder → Workflow Builder → Schedule Manager), never via `prisma/seed.ts` + reseed.** Decided **not to reseed production** — real users/inspections/audit history exist now, not worth the risk to sync seed-only content. This is *the* standing pattern for any future real checklist content.
- **Checklist versioning is real and load-bearing**: every edit to a checklist's items publishes a new version; historical inspections keep the exact version they were performed against — never "fix" this by editing in place.
- **Checklist cloning copies items but never schedules** — deliberate, so a clone doesn't duplicate the source's schedule pointing at the same place. New clones always start at "0 schedules" and need one added manually.
- **Real delete now exists for checklists, distinct from Archive** (`lib/actions/checklist-builder.ts`'s `deleteChecklist()`, trash icon next to Clone on `/admin/checklists`). Only allowed when zero `Inspection` rows reference any version of the checklist — anything with real usage must still go through Archive. Added because an accidental "(Copy)" clone had no reason to linger forever.
- **Photo evidence is now available on NUMERIC items, not just PASS_FAIL/YES_NO/ACKNOWLEDGEMENT** (`components/inspection/checklist-item-card.tsx`) — a 0/1/2 compliance score is as much a judgement call as pass/fail. `PhotoUpload` (`components/inspection/photo-upload.tsx`) now supports multi-select and caps at **5 photos per item** (`maxPhotos` prop), hiding the upload button once full and showing an "N / 5 photos" counter always.
- **Two real bugs found and fixed while shipping the above** (both in `lib/storage.ts`):
  1. `storePhoto()` silently fell back to writing a file on the local filesystem whenever `BLOB_READ_WRITE_TOKEN` wasn't visible — harmless in local dev, but Vercel's filesystem is read-only, so this would throw an opaque, redacted "Minified React error #441" in production if that ever happened. Now throws a clear, actionable error instead whenever `process.env.VERCEL` is set and the token is missing.
  2. The token turned out to be present all along (user confirmed in Vercel dashboard) — the *actual* bug the user hit was that some phones (HEIC especially) hand the browser a photo with an empty or unexpected `file.type`, and the old strict `ALLOWED_PHOTO_TYPES.includes(file.type)` check rejected it. `isAllowedPhotoFile()` now falls back to the file extension, and `storePhoto()` guesses a real content type from the extension too. **Lesson for next time**: don't stop at the first plausible-sounding hypothesis (missing token) just because it fits the symptom — verify it before declaring victory. The user's own testing ("JPEG ok, other format not allowed") is what actually pinned down the real cause.
- **A GitHub multi-account gotcha, confirmed again today**: pushing needs `gh auth switch --hostname github.com --user dhanu-af` first, then switch back to `khdanushka-spec` afterward (the default for her other projects). Every push this session followed this exact two-command bracket.
- **Push confirmation pattern**: ask "want this pushed?" before running `git push`, even though `git commit` locally doesn't need to ask.

## Files touched today (major ones; full history in `git log --oneline`)

- **`app/(app)/admin/checklists/page.tsx`**, **`lib/actions/checklist-builder.ts`**, **`components/admin/delete-checklist-button.tsx`** (new) — real checklist deletion, guarded by zero-inspections check.
- **`components/inspection/checklist-item-card.tsx`**, **`components/inspection/photo-upload.tsx`** — photo evidence on NUMERIC items, 5-photo cap, multi-select.
- **`lib/storage.ts`** — `isAllowedPhotoFile()` (extension fallback), content-type guessing, explicit throw on Vercel when the Blob token is missing. **`lib/actions/inspections.ts`, `lib/actions/settings.ts`** — updated to use `isAllowedPhotoFile()` instead of the raw type-list check.
- **`app/(app)/audit/page.tsx`, `lib/status.ts`** — removed the never-fired `SUPERVISOR_REVIEWED`/`QA_REVIEWED` entries from the Audit Trail's filter/label map (dead UI, confirmed via grep that nothing ever created them).

## Gotchas / constraints

- **Local Postgres (`npx prisma dev`) stops between sessions/long gaps** — check `netstat -ano | grep 51214`. Fix: `npx prisma dev` from the repo root, comes back on the same port.
- **Never run two Next.js server processes (`next dev` + `next start`, or two `next dev`s) against the same local `prisma dev` Postgres at once** — they fight over the connection pool and produce "Connection terminated unexpectedly" errors that look like a real bug but are just resource contention. Stop one before starting the other.
- **Local dev never exercises the real Vercel Blob upload path** (`storePhoto()`'s `BLOB_READ_WRITE_TOKEN` branch) — no token is provisioned locally, so local testing always takes the filesystem-fallback branch. A bug specific to the Blob branch (like today's HEIC content-type issue) **cannot be reproduced locally** — you have to reason from the code + Vercel's Runtime Logs, or get the user to test directly on production.
- **A production build run locally (`next build && next start`) still can't fully validate Blob-path or other Vercel-specific behavior**, and is itself fragile — hit unrelated auth/DB flakiness when tried today. Not a reliable technique for this app; don't reach for it first.
- **Vercel's Runtime Logs page is the fastest way to see the real, un-redacted server-side error** when a user hits a generic "Minified React error #NNN" — the client-visible message is always redacted in production, but Vercel's own function logs show the full error. Ask the user to reproduce the failure, then immediately check Logs (or Deployments → latest → Functions/Runtime Logs) for the newest failing request.
- **The auto-mode classifier blocks browser-automation writes that modify *existing* live production state, but allows ones that *create new* state** — adding a brand-new checklist schedule went through; pausing an existing one was denied, twice, on different checklists. Don't assume one successful production-UI action means the next similar one will also go through.
- **GitHub two-account switch required before every push**: `gh auth switch --hostname github.com --user dhanu-af`, push, then `gh auth switch --hostname github.com --user khdanushka-spec` back.

## Next steps

1. **Confirm the HEIC/format fix actually worked** — ask the user to retry uploading whatever format got rejected before (not just JPEG) now that `00138ec` is deployed. If it still fails, get the exact format/device and check Vercel Runtime Logs for the specific error rather than guessing again.
2. Everything else genuinely needs the user's input before proceeding (see Open Questions below) — no other clearly-scoped, no-decision-needed work is currently identified.

## Open questions — still genuinely need the user

- **Two likely-orphaned Vercel projects** (`webops-platform.vercel.app` under the wrong team, `webops-platform-chi.vercel.app` under her personal account) — the Vercel MCP tool available in-session only has access to her personal `khdanushka-spec`/`dkns` team, not the `DKNS`/`dkns1` team that actually hosts webops-platform. Can't inspect or delete these from here — needs her to check the Vercel dashboard directly.
- **Forgot-password flow** (email + reset token) still doesn't exist — needs a real email provider decision (e.g. Resend via Vercel Marketplace) and provisioning, an account-level choice for her to make.
- **`VerificationWorkflow` has no versioning** (unlike checklists) — editing a workflow's steps takes effect immediately for every checklist using it, including in-progress inspections. Not an issue yet; flag if it ever becomes one.
- **Demo accounts** (`admin@webops.demo` etc.) — confirmed the login page doesn't leak the plaintext password (just points to HANDOVER.md), so no real exposure pre-launch. Revisit before this goes in front of anyone outside the team.
