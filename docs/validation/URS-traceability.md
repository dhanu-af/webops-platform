# URS traceability (SQF Edition 10 GMP records)

Release 0.2.0. "Test" = how to verify by hand; automated tests run with `npm test`.

| URS | Implemented | Where in code | How to test it |
|---|---|---|---|
| URS-01 Individual accounts, password rules, 15-min timeout | Y | `lib/login-id.ts` (sign in with User ID, no email), `lib/login-throttle.ts` (8 wrong passwords = 15-minute lock), `lib/password-policy.ts`, `lib/temp-password.ts`, `lib/actions/users.ts`, `app/change-password/`, `lib/auth.config.ts`, `components/auth/idle-logout.tsx` | Admin -> Users: create user (User ID, Generate temporary password); sign in as them -> forced to choose their own password. Weak password refused. Idle 15 min = signed out. |
| URS-02 Role-based access, no self-verification | Y | `lib/permissions.ts`, `lib/session-user.ts`, `lib/actions/inspections.ts` (`verifyInspection`), `lib/inspection-rules.ts` | `npm test` -> `access-control.test.ts`, `inspections.test.ts`. Manually: operator who entered answers cannot verify the same record. |
| URS-03 Deactivate, never delete users | Y | `lib/actions/users.ts`, `requireActiveUser` in `lib/session-user.ts` | Admin -> Users -> Deactivate; user's next request is refused; no delete control exists. |
| URS-04 Three checklists + required context | Y | `prisma/seed.ts`, `prisma/seed-allergen-changeover.ts`, `app/(app)/allergen-changeover/page.tsx`, `components/inspection/record-details-form.tsx` | Open Pre-start/Post-op, Line Clearance, Allergen Changeover; header shows area, equipment, product/batch (previous + next), operator, server time. |
| URS-05 Required fields, no incomplete submit | Y | `lib/inspection-rules.ts` (`missingRequired`), `submitInspection` | `npm test` -> `inspection-rules.test.ts`. Manually: Submit with a blank required item is refused. |
| URS-06 Server timestamps, automatic user | Y | `lib/actions/inspections.ts`, `lib/audit.ts` (user from session, `createdAt` server default) | `npm test` -> `inspections.test.ts`. Client cannot supply who/when. |
| URS-07 Fail forces corrective action, blocks release | Y | `createCorrectiveAction`, `closeCorrectiveAction`, `inspection-rules.ts` | `npm test`. Manually: mark FAIL -> submit blocked until CA recorded; line release blocked until Supervisor/QA signs off the CA. |
| URS-08 Chemical concentration ranges | Y | `inspection-rules.ts` (`evaluateNumeric`), `ChecklistItem.minValue/maxValue` | Enter an out-of-range number: auto-FAIL, opens finding. |
| URS-09 E-signature with password re-entry | Y | `lib/signature.ts`, `verifyInspection`, `components/inspection/verification-actions.tsx` | `npm test`. Manually: wrong password -> refused and `SIGNATURE_FAILED` audited. |
| URS-10 Draft/Submitted/Verified/Rejected | Y | `lib/record-status.ts`, `app/(app)/inspections/page.tsx` | Status chips on the Inspections list. |
| URS-11 Never delete; edits need reason; original kept | Y | Triggers in migration `20261023100100_urs_immutability_triggers`, `resubmitReturnedInspection`, audit `oldValue/newValue` | `npm test`. SQL `DELETE FROM "Inspection"` is rejected by the database. |
| URS-12 Full read-only audit trail | Y | `lib/audit.ts`, `app/(app)/audit/page.tsx`, `AuditLog_block_change` trigger | `npm test`. Audit page lists who/field/old/new/when/why; `UPDATE "AuditLog"` is rejected. |
| URS-13 Versioned templates stored per record | Y | `ChecklistVersion`, `Inspection.checklistVersionId`, checklist builder | Edit a checklist -> new version; old records still show their original version number. |
| URS-14 Search/filter | Y | `lib/data/inspections.ts`, `app/(app)/inspections/page.tsx` | Filter by date, line, product/batch, user, status. |
| URS-15 PDF export with audit trail + signatures | Y | `app/api/inspections/[id]/pdf/route.ts`, `lib/pdf/inspection-record-document.tsx` | Inspection page -> PDF; export is itself audited (`RECORD_EXPORTED`). |
| URS-16 Retention >= 3 years, configurable, no purge | Y | `lib/retention.ts`, `updateRetentionYears` in `lib/actions/settings.ts`, `components/admin/retention-form.tsx`, `docs/retention-policy.md` | `npm test` -> `retention.test.ts`. Admin -> Settings -> Record Retention: 2 refused, 5 saved + audited. |
| URS-17 Daily backup + documented restore | Y (needs secret) | `.github/workflows/db-backup.yml`, `scripts/restore-check.sh`, `docs/backup-restore.md` | Add `BACKUP_DATABASE_URL` secret, run the workflow, then follow the restore drill. |
| URS-18 HTTPS only, no secrets in code, pinned deps | Y | `next.config.ts` (HSTS + headers), `.gitignore`/`.env` untracked, exact versions in `package.json` + `.npmrc` | `curl -I` shows `Strict-Transport-Security`; `grep '\^' package.json` is empty. |
| URS-19 App version in footer and on records | Y | `lib/app-version.ts`, `components/nav/app-footer.tsx`, `Inspection.appVersion`, `AuditLog.appVersion` | Footer shows `v0.2.0`; PDF header shows release. |
| URS-20 Printable blank paper checklists | Y | `app/forms/page.tsx`, `app/forms/[id]/page.tsx` | Open `/forms`, pick a checklist, Print. Fields mirror the electronic form. |

## Additional controls (independent GMP review, 2026-10-24)

| Control | Where it is enforced | How it is tested |
|---|---|---|
| Live account on every action and download (deactivated / demoted users stop at once) | `requireLiveUser`, `liveSession` in `lib/session-user.ts` | `lib/actions/inspections.test.ts` (deactivated account), browser run |
| No password hash ever reaches the browser | `SAFE_USER` selects, `lib/safe-user.ts` | `lib/safe-user.test.ts` scans the source |
| Measured values judged by the server only | `saveResponse` (`numericVerdict`) | `inspections.test.ts` "measured values are judged by the server" |
| Status change + signature + audit row are one transaction; a step can be signed once | `submitInspection`, `verifyInspection`, `closeCorrectiveAction` (`db.$transaction`, `updateMany where status`) | `inspections.test.ts`, browser run |
| Segregation of duties: not the operator/any participant, Supervisor-step approver is not the QA approver, CA creator/owner cannot sign it off | `participantIds`, `verifierConflict`, `closeCorrectiveAction` | `inspections.test.ts` |
| E-signature wrong passwords count toward lockout | `lib/signature.ts` | `lib/signature.test.ts` |
| QC sample approval/rejection is signed, second-person, no FAIL | `approveSample`, `rejectSample` | browser run (`audit/modules.js`) |
| Manufacturing sign-offs = signed-in user + server time; QA release QA-only; completed batch locked | `lib/mfg-signoff.ts`, `lib/actions/mfg-reconciliation.ts` | `lib/mfg-signoff.test.ts` |
| QC decisions in the drying room are QA/Supervisor only | `updateBatchStage`, `updateTrolley` | browser run |
| Database refuses: editing a signature, editing an answer on an approved/closed record, deleting a completed batch or a lab-tested QC sample | migration `20261024180000_record_protection_more` | local DB test, monthly restore drill checks the 9 triggers |
| Deletions keep a full snapshot in the audit trail | mfg batch/dispatch, QC sample/attachment, drying batch, formulation | code review |
| Shop-floor PIN sign-in: attributable to a named person, short session, lockout, device registration, audited | `lib/pin.ts`, `lib/pin-session.ts`, `lib/actions/kiosk.ts`, `lib/actions/kiosk-admin.ts`, provider `pin` in `lib/auth.ts` | `lib/pin*.test.ts`, `lib/actions/kiosk*.test.ts`, browser run `audit/kiosk.js` |
| Health / uptime monitoring | `/api/health`, `.github/workflows/uptime-check.yml` | live probe |

## Items that need a person
- Add the `BACKUP_DATABASE_URL` GitHub secret and run a restore drill (URS-17).
- QA to confirm the placeholder ranges/items in the Allergen Changeover checklist (URS-04/08).
- Run `npm run seed:allergen-changeover` on production and add a schedule for it.
