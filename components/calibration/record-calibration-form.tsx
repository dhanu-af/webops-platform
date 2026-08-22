"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { recordCalibration } from "@/lib/actions/calibration";

export function RecordCalibrationForm({ equipmentId }: { equipmentId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("equipmentId", equipmentId);
    startTransition(async () => {
      try {
        await recordCalibration(formData);
        formRef.current?.reset();
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to record calibration.");
      }
    });
  }

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Record Calibration
      </Button>
    );
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-3 rounded-lg border border-border bg-surface-sunken p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-muted-strong">Calibrated Date</label>
          <input
            type="date"
            name="calibratedDate"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-strong">Calibration Interval (days)</label>
          <input
            type="number"
            name="intervalDays"
            required
            min={1}
            defaultValue={365}
            className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-strong">Performed By</label>
          <input
            type="text"
            name="performedBy"
            required
            placeholder="e.g. NATA Cal Services Pty Ltd"
            className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-strong">Certificate Number (optional)</label>
          <input
            type="text"
            name="certificateNumber"
            className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-strong">Certificate (PDF, JPG, or PNG — optional)</label>
          <input
            type="file"
            name="certificate"
            accept="application/pdf,image/jpeg,image/png"
            className="mt-1.5 w-full text-sm text-muted-strong"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-strong">Notes (optional)</label>
          <textarea
            name="notes"
            rows={2}
            className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      {error && <p className="rounded-lg bg-status-critical-soft px-3 py-2 text-sm text-status-critical">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save Calibration Record"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
