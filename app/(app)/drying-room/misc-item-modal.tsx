"use client";

import { useState, useTransition } from "react";
import { upsertMiscStorageItem } from "@/lib/actions/drying-room-actions";
import { Button } from "@/components/ui/button";
import { Field, MFG_INPUT_CLASS } from "@/components/mfg/field";
import type { MiscItem } from "./drying-room-client";

export default function MiscItemModal({ existing, onClose, onSaved }: { existing: MiscItem | null; onClose: () => void; onSaved: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [product, setProduct] = useState(existing?.product ?? "");
  const [batchNumber, setBatchNumber] = useState(existing?.batchNumber ?? "");
  const [quantityLabel, setQuantityLabel] = useState(existing?.quantityLabel ?? "");
  const [storageType, setStorageType] = useState(existing?.storageType ?? "");
  const [status, setStatus] = useState(existing?.status ?? "");
  const [requiredAction, setRequiredAction] = useState(existing?.requiredAction ?? "");
  const [location, setLocation] = useState(existing?.location ?? "");
  const [remarks, setRemarks] = useState(existing?.remarks ?? "");

  function submit() {
    setError("");
    startTransition(async () => {
      try {
        await upsertMiscStorageItem(existing?.id ?? null, {
          product,
          batchNumber: batchNumber || null,
          quantityLabel,
          storageType: storageType || null,
          status: status || null,
          requiredAction: requiredAction || null,
          location: location || null,
          remarks: remarks || null,
        });
        onSaved();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save item.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow-md)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">{existing ? "Edit" : "Add"} Storage Item</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            ✕
          </button>
        </div>
        <div className="space-y-3">
          <Field label="Product">
            <input value={product} onChange={(e) => setProduct(e.target.value)} className={MFG_INPUT_CLASS} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Batch Number">
              <input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} className={MFG_INPUT_CLASS} />
            </Field>
            <Field label="Quantity">
              <input value={quantityLabel} onChange={(e) => setQuantityLabel(e.target.value)} placeholder="e.g. 0.5 Trolley" className={MFG_INPUT_CLASS} />
            </Field>
            <Field label="Storage Type">
              <input value={storageType} onChange={(e) => setStorageType(e.target.value)} className={MFG_INPUT_CLASS} />
            </Field>
            <Field label="Status">
              <input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="e.g. Wrapped" className={MFG_INPUT_CLASS} />
            </Field>
          </div>
          <Field label="Required Action">
            <input value={requiredAction} onChange={(e) => setRequiredAction(e.target.value)} className={MFG_INPUT_CLASS} />
          </Field>
          <Field label="Location">
            <input value={location} onChange={(e) => setLocation(e.target.value)} className={MFG_INPUT_CLASS} />
          </Field>
          <Field label="Remarks">
            <input value={remarks} onChange={(e) => setRemarks(e.target.value)} className={MFG_INPUT_CLASS} />
          </Field>
          {error && <p className="text-xs text-status-critical">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending || !product || !quantityLabel}>
              {pending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
