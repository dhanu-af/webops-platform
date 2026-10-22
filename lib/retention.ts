// Record retention policy (URS-16). The application never purges records --
// there is no delete path for them, and the database refuses deletes (see the
// immutability triggers) -- so this figure is the documented minimum the
// organisation commits to keeping them, shown to auditors and on each record.
export const MIN_RETENTION_YEARS = 3;

/** Null when acceptable, otherwise why not. The floor is the SQF minimum and can't be lowered. */
export function validateRetentionYears(years: unknown): string | null {
  if (typeof years !== "number" || !Number.isInteger(years)) return "Enter a whole number of years.";
  if (years < MIN_RETENTION_YEARS) return `Records must be kept for at least ${MIN_RETENTION_YEARS} years.`;
  if (years > 100) return "That retention period is not realistic.";
  return null;
}

/** The earliest date a record could ever be considered for disposal. */
export function retainUntil(recordDate: Date, years: number): Date {
  const d = new Date(recordDate);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d;
}
