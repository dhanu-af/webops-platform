# Record retention (URS-16)

- Minimum retention is configurable at **Admin -> Settings -> Record Retention** (default 3 years; the system refuses anything below 3). Changes are written to the audit trail with the old and new value.
- Inspection records, responses, signatures, corrective actions, template versions and the audit trail are **never purged**: there is no delete code path for them, and database triggers reject `DELETE` on inspections, responses, signatures and corrective actions, and reject both `UPDATE` and `DELETE` on the audit trail. Users are deactivated, never deleted.
- The retention period is printed in the app footer and on every exported PDF. A record may only be considered for disposal after `record date + retention years` (`retainUntil()` in `lib/retention.ts`) and only by a documented, approved QA procedure performed outside the app.
