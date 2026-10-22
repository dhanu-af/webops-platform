# Database backup and restore (URS-17)

## What is backed up
The whole production Postgres (Neon) database: users, checklists and template versions, inspections, responses, corrective actions, electronic signatures and the audit trail. Uploaded photos live in Vercel Blob and are **not** in the dump (see "Photos" below).

## Automated daily backup
- `.github/workflows/db-backup.yml` runs every day at 16:17 UTC (and on demand via *Actions -> Daily database backup -> Run workflow*).
- It runs `pg_dump --format=custom`, verifies the archive is readable with `pg_restore --list`, records a SHA-256 checksum, and stores both as a workflow artifact.
- **One-time setup:** add the repository secret `BACKUP_DATABASE_URL` (Settings -> Secrets and variables -> Actions). Use Neon's *direct* (non-pooled) connection string; a read-only role is ideal.
- A failed run shows red in GitHub Actions and emails the repository watchers. Someone must look at it - assign an owner.
- GitHub keeps artifacts for at most 90 days. To meet the 3-year record-retention period, download one dump per month and keep it in company storage (SharePoint / S3 / external drive), recording the date and checksum.

## Second layer: Neon point-in-time restore
Neon also keeps a rolling history window (length depends on the plan). It restores to any second inside the window by creating a branch from a past timestamp: Neon console -> Branches -> *Create branch* -> *Past data*. Use this for "undo what happened at 14:05"; use the dump for disasters outside that window.

## Restore procedure (tested path)
Always restore into a **scratch** database first, check it, and only then decide what to do with production.

1. Create an empty scratch database (a new Neon branch/database, or local Postgres 17).
2. Download the dump and its `.sha256` from the Actions run.
3. Run:
   ```bash
   export RESTORE_DATABASE_URL="postgres://user:pass@host/scratch"
   ./scripts/restore-check.sh webops-YYYYMMDDTHHMMSSZ.dump
   ```
   It verifies the checksum, restores, and prints row counts for inspections, responses, audit entries and users. Compare them to production.
4. To recover production: point the app's `DATABASE_URL` (and `DATABASE_URL_UNPOOLED`) at the restored database in Vercel -> Settings -> Environment Variables, redeploy, then log in and spot-check a recent record, its signatures and its audit trail.
5. Record the restore (date, reason, dump used, who approved) in the QA change log.

Notes
- The immutability triggers are part of the schema and are restored with it. `pg_restore --clean` drops and recreates them; the restore itself does not need the `webops.allow_record_delete` bypass.
- Run a restore drill at least quarterly and file the output - an untested backup is not a backup.

## Photos
Photo evidence is in Vercel Blob. Blob keeps objects until deleted, and the app never deletes them. For disaster recovery, periodically copy the Blob store to company storage as well.
