"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveFinishedGoodsWarehouse } from "@/lib/actions/mfg-reconciliation";
import { Field, MFG_INPUT_CLASS } from "@/components/mfg/field";
import { Button } from "@/components/ui/button";

export type FgWarehouseData = {
  finishedGoodsReceived: number | null;
  qaReleased: boolean;
  qaReleasedByName: string | null;
  qaReleasedAt: string | null;
  storageLocation: string | null;
  warehouseBalance: number | null;
  batchNumber: string | null;
  expiryDate: string | null;
  remarks: string | null;
};

export function FgWarehouseSection({ batchId, data, canManage }: { batchId: string; data: FgWarehouseData | null; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [finishedGoodsReceived, setFinishedGoodsReceived] = useState(data?.finishedGoodsReceived?.toString() ?? "");
  const [qaReleased, setQaReleased] = useState(data?.qaReleased ?? false);
  const [qaReleasedByName, setQaReleasedByName] = useState(data?.qaReleasedByName ?? "");
  const [qaReleasedAt, setQaReleasedAt] = useState(data?.qaReleasedAt ? data.qaReleasedAt.slice(0, 10) : "");
  const [storageLocation, setStorageLocation] = useState(data?.storageLocation ?? "");
  const [warehouseBalance, setWarehouseBalance] = useState(data?.warehouseBalance?.toString() ?? "");
  const [batchNumber, setBatchNumber] = useState(data?.batchNumber ?? "");
  const [expiryDate, setExpiryDate] = useState(data?.expiryDate ? data.expiryDate.slice(0, 10) : "");
  const [remarks, setRemarks] = useState(data?.remarks ?? "");

  function save() {
    setError("");
    startTransition(async () => {
      try {
        await saveFinishedGoodsWarehouse(batchId, {
          finishedGoodsReceived: finishedGoodsReceived ? Number(finishedGoodsReceived) : null,
          qaReleased,
          qaReleasedByName: qaReleasedByName || null,
          qaReleasedAt: qaReleasedAt || null,
          storageLocation: storageLocation || null,
          warehouseBalance: warehouseBalance ? Number(warehouseBalance) : null,
          batchNumber: batchNumber || null,
          expiryDate: expiryDate || null,
          remarks: remarks || null,
        });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Finished Goods Received">
          <input type="number" className={MFG_INPUT_CLASS} disabled={!canManage} value={finishedGoodsReceived} onChange={(e) => setFinishedGoodsReceived(e.target.value)} />
        </Field>
        <Field label="Storage Location">
          <input className={MFG_INPUT_CLASS} disabled={!canManage} value={storageLocation} onChange={(e) => setStorageLocation(e.target.value)} />
        </Field>
        <Field label="Warehouse Balance">
          <input type="number" className={MFG_INPUT_CLASS} disabled={!canManage} value={warehouseBalance} onChange={(e) => setWarehouseBalance(e.target.value)} />
        </Field>
        <Field label="Batch Number">
          <input className={MFG_INPUT_CLASS} disabled={!canManage} value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
        </Field>
        <Field label="Expiry Date">
          <input type="date" className={MFG_INPUT_CLASS} disabled={!canManage} value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
        </Field>
        <label className="flex items-end gap-2 pb-2">
          <input type="checkbox" disabled={!canManage} checked={qaReleased} onChange={(e) => setQaReleased(e.target.checked)} className="size-4 rounded border-border-strong" />
          <span className="text-sm text-foreground">{qaReleased ? "Released" : "Not released"}</span>
        </label>
        <Field label="QA Released By">
          <input className={MFG_INPUT_CLASS} disabled={!canManage} value={qaReleasedByName} onChange={(e) => setQaReleasedByName(e.target.value)} />
        </Field>
        <Field label="QA Released At">
          <input type="date" className={MFG_INPUT_CLASS} disabled={!canManage} value={qaReleasedAt} onChange={(e) => setQaReleasedAt(e.target.value)} />
        </Field>
      </div>

      <Field label="Remarks">
        <textarea className={MFG_INPUT_CLASS} rows={2} disabled={!canManage} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </Field>

      {error && <p className="text-xs text-status-critical">{error}</p>}

      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save Finished Goods Warehouse"}
          </Button>
        </div>
      )}
    </div>
  );
}
