#!/usr/bin/env bash
# Restore a webops pg_dump into a THROWAWAY database and sanity-check it (URS-17).
# Never point this at production.
#   RESTORE_DATABASE_URL=postgres://.../scratch ./scripts/restore-check.sh webops-2026....dump
set -euo pipefail
dump="${1:?usage: restore-check.sh <dump file>}"
: "${RESTORE_DATABASE_URL:?set RESTORE_DATABASE_URL to an empty scratch database}"

sha256sum -c "${dump}.sha256" 2>/dev/null || echo "(no checksum file next to the dump - skipping checksum)"
pg_restore --no-owner --no-privileges --clean --if-exists --dbname="$RESTORE_DATABASE_URL" "$dump"

psql "$RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 -c '
  select (select count(*) from "Inspection")      as inspections,
         (select count(*) from "InspectionResponse") as responses,
         (select count(*) from "AuditLog")          as audit_entries,
         (select count(*) from "User")              as users;'
echo "Restore check complete."
