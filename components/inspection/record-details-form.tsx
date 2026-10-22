"use client";

import { useState, useTransition } from "react";
import { saveInspectionHeader } from "@/lib/actions/inspections";

type Details = { product: string; batchNumber: string; previousProduct: string; previousBatchNumber: string };

const INPUT = "w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent disabled:opacity-60";

/**
 * Product / batch context for the record (URS-04). Line clearance and allergen
 * changeover capture the product just run AND the product coming next; other
 * checklists just an optional product/batch. Saves when a field loses focus.
 */
export function RecordDetailsForm({
  inspectionId,
  editable,
  changeover,
  initial,
}: {
  inspectionId: string;
  editable: boolean;
  changeover: boolean;
  initial: Details;
}) {
  const [, startTransition] = useTransition();
  const [values, setValues] = useState<Details>(initial);
  const [error, setError] = useState<string | null>(null);

  function save(next: Details) {
    setError(null);
    startTransition(async () => {
      const result = await saveInspectionHeader({ inspectionId, ...next });
      if (!result.ok) setError(result.error);
    });
  }
  const set = (patch: Partial<Details>) => setValues((v) => ({ ...v, ...patch }));

  const field = (key: keyof Details, label: string, required: boolean) => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-strong">
        {label}
        {required && <span className="ml-1 text-status-critical">*</span>}
      </span>
      <input className={INPUT} disabled={!editable} value={values[key]} onChange={(e) => set({ [key]: e.target.value })} onBlur={() => save(values)} />
    </label>
  );

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted">Record details</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {changeover ? (
          <>
            {field("previousProduct", "Previous product", true)}
            {field("previousBatchNumber", "Previous batch", true)}
            {field("product", "Next product", true)}
            {field("batchNumber", "Next batch", true)}
          </>
        ) : (
          <>
            {field("product", "Product (optional)", false)}
            {field("batchNumber", "Batch (optional)", false)}
          </>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-status-critical">{error}</p>}
    </div>
  );
}
