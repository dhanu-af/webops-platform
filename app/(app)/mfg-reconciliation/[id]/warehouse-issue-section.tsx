"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveWarehouseIssue } from "@/lib/actions/mfg-reconciliation";
import { RAW_MATERIAL_GROUPS, PACKAGING_MATERIAL_GROUPS, MFG_MATERIAL_GROUP_LABEL, computeBalance, formatCount } from "@/lib/mfg-reconciliation";
import { Field, MFG_INPUT_CLASS } from "@/components/mfg/field";
import { Button } from "@/components/ui/button";
import type { MfgMaterialGroup } from "@/app/generated/prisma/client";

export type MaterialIssueLineData = {
  materialGroup: MfgMaterialGroup;
  materialCode: string | null;
  description: string;
  supplier: string | null;
  lotBatchNumber: string | null;
  expiryDate: string | null;
  quantityRequested: number | null;
  quantityIssued: number | null;
  quantityReturned: number | null;
};

export type WarehouseIssueData = { issuedByName: string | null; issueDate: string | null; remarks: string | null; lines: MaterialIssueLineData[] };

type LineForm = {
  materialGroup: MfgMaterialGroup;
  materialCode: string;
  description: string;
  supplier: string;
  lotBatchNumber: string;
  expiryDate: string;
  quantityRequested: string;
  quantityIssued: string;
  quantityReturned: string;
};

const ALL_GROUPS: MfgMaterialGroup[] = [...RAW_MATERIAL_GROUPS, ...PACKAGING_MATERIAL_GROUPS];

function toLineForm(l: MaterialIssueLineData): LineForm {
  return {
    materialGroup: l.materialGroup,
    materialCode: l.materialCode ?? "",
    description: l.description,
    supplier: l.supplier ?? "",
    lotBatchNumber: l.lotBatchNumber ?? "",
    expiryDate: l.expiryDate ? l.expiryDate.slice(0, 10) : "",
    quantityRequested: l.quantityRequested?.toString() ?? "",
    quantityIssued: l.quantityIssued?.toString() ?? "",
    quantityReturned: l.quantityReturned?.toString() ?? "",
  };
}

export function WarehouseIssueSection({ batchId, data, canManage }: { batchId: string; data: WarehouseIssueData | null; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [issuedByName, setIssuedByName] = useState(data?.issuedByName ?? "");
  const [issueDate, setIssueDate] = useState(data?.issueDate ? data.issueDate.slice(0, 10) : "");
  const [remarks, setRemarks] = useState(data?.remarks ?? "");
  const [lines, setLines] = useState<LineForm[]>(data?.lines.map(toLineForm) ?? []);

  function updateLine(i: number, patch: Partial<LineForm>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, toLineForm({ materialGroup: "RAW_INGREDIENT", materialCode: null, description: "", supplier: null, lotBatchNumber: null, expiryDate: null, quantityRequested: null, quantityIssued: null, quantityReturned: null })]);
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  function save() {
    setError("");
    startTransition(async () => {
      try {
        await saveWarehouseIssue(
          batchId,
          { issuedByName: issuedByName || null, issueDate: issueDate || null, remarks: remarks || null },
          lines.map((l) => ({
            materialGroup: l.materialGroup,
            materialCode: l.materialCode || null,
            description: l.description,
            supplier: l.supplier || null,
            lotBatchNumber: l.lotBatchNumber || null,
            expiryDate: l.expiryDate || null,
            quantityRequested: l.quantityRequested ? Number(l.quantityRequested) : null,
            quantityIssued: l.quantityIssued ? Number(l.quantityIssued) : null,
            quantityReturned: l.quantityReturned ? Number(l.quantityReturned) : null,
          }))
        );
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Issued By">
          <input className={MFG_INPUT_CLASS} disabled={!canManage} value={issuedByName} onChange={(e) => setIssuedByName(e.target.value)} />
        </Field>
        <Field label="Issue Date">
          <input type="date" className={MFG_INPUT_CLASS} disabled={!canManage} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        </Field>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
              <th className="px-2 py-2">Group</th>
              <th className="px-2 py-2">Code</th>
              <th className="px-2 py-2">Description</th>
              <th className="px-2 py-2">Supplier</th>
              <th className="px-2 py-2">Lot/Batch</th>
              <th className="px-2 py-2">Expiry</th>
              <th className="px-2 py-2">Req.</th>
              <th className="px-2 py-2">Issued</th>
              <th className="px-2 py-2">Returned</th>
              <th className="px-2 py-2">Balance</th>
              {canManage && <th className="px-2 py-2" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lines.map((l, i) => (
              <tr key={i}>
                <td className="px-2 py-1.5">
                  <select className={MFG_INPUT_CLASS} disabled={!canManage} value={l.materialGroup} onChange={(e) => updateLine(i, { materialGroup: e.target.value as MfgMaterialGroup })}>
                    {ALL_GROUPS.map((g) => (
                      <option key={g} value={g}>
                        {MFG_MATERIAL_GROUP_LABEL[g]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <input className={MFG_INPUT_CLASS} disabled={!canManage} value={l.materialCode} onChange={(e) => updateLine(i, { materialCode: e.target.value })} />
                </td>
                <td className="px-2 py-1.5">
                  <input className={MFG_INPUT_CLASS} disabled={!canManage} value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} />
                </td>
                <td className="px-2 py-1.5">
                  <input className={MFG_INPUT_CLASS} disabled={!canManage} value={l.supplier} onChange={(e) => updateLine(i, { supplier: e.target.value })} />
                </td>
                <td className="px-2 py-1.5">
                  <input className={MFG_INPUT_CLASS} disabled={!canManage} value={l.lotBatchNumber} onChange={(e) => updateLine(i, { lotBatchNumber: e.target.value })} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="date" className={MFG_INPUT_CLASS} disabled={!canManage} value={l.expiryDate} onChange={(e) => updateLine(i, { expiryDate: e.target.value })} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" className={MFG_INPUT_CLASS} disabled={!canManage} value={l.quantityRequested} onChange={(e) => updateLine(i, { quantityRequested: e.target.value })} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" className={MFG_INPUT_CLASS} disabled={!canManage} value={l.quantityIssued} onChange={(e) => updateLine(i, { quantityIssued: e.target.value })} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" className={MFG_INPUT_CLASS} disabled={!canManage} value={l.quantityReturned} onChange={(e) => updateLine(i, { quantityReturned: e.target.value })} />
                </td>
                <td className="px-2 py-1.5 font-mono-tabular text-muted-strong">
                  {formatCount(computeBalance(l.quantityIssued ? Number(l.quantityIssued) : null, l.quantityReturned ? Number(l.quantityReturned) : null))}
                </td>
                {canManage && (
                  <td className="px-2 py-1.5">
                    <button type="button" onClick={() => removeLine(i)} className="text-status-critical hover:opacity-80">
                      ✕
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canManage && (
        <button type="button" onClick={addLine} className="text-xs font-medium text-accent hover:text-accent-strong">
          + Add Material Line
        </button>
      )}

      <Field label="Remarks">
        <textarea className={MFG_INPUT_CLASS} rows={2} disabled={!canManage} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </Field>

      {error && <p className="text-xs text-status-critical">{error}</p>}

      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save Warehouse Issue"}
          </Button>
        </div>
      )}
    </div>
  );
}
