// What changed in a save, field by field, for the audit trail's old/new values.
// Dates are compared as ISO strings; null, undefined and "" all count as empty so re-saving an untouched
// field is not logged. Returns null when nothing changed.
export function auditDiff(before: Record<string, unknown> | null, after: Record<string, unknown>) {
  const norm = (v: unknown) => (v instanceof Date ? v.toISOString() : v === undefined || v === "" ? null : v);
  const oldValue: Record<string, string | number | boolean | null> = {};
  const newValue: Record<string, string | number | boolean | null> = {};
  for (const [field, next] of Object.entries(after)) {
    if (field === "mfgBatchId" && before && !("mfgBatchId" in before)) continue;
    if (field === "id") continue;
    const prev = norm(before?.[field]);
    if (prev !== norm(next)) {
      oldValue[field] = prev as string | number | boolean | null;
      newValue[field] = norm(next) as string | number | boolean | null;
    }
  }
  return Object.keys(newValue).length ? { oldValue, newValue } : null;
}
