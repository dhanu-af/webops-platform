"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePackaging } from "@/lib/actions/mfg-reconciliation";
import { DEFAULT_PACKAGING_MATERIAL_LINES, PACKAGING_MATERIAL_TYPE_LABEL, computeBalance, formatCount } from "@/lib/mfg-reconciliation";
import { Field, MFG_INPUT_CLASS } from "@/components/mfg/field";
import { Button } from "@/components/ui/button";
import type { MfgPackagingMaterialType } from "@/app/generated/prisma/client";

export type PackagingMaterialLineData = { materialType: MfgPackagingMaterialType; issued: number | null; used: number | null; damaged: number | null; returned: number | null; destroyed: number | null };
export type PackagingData = {
  packedBottles: number | null;
  cartonsProduced: number | null;
  casesProduced: number | null;
  packedByName: string | null;
  packedAt: string | null;
  remarks: string | null;
  lines: PackagingMaterialLineData[];
};

type LineForm = { materialType: MfgPackagingMaterialType; issued: string; used: string; damaged: string; returned: string; destroyed: string };

function toLineForm(l: PackagingMaterialLineData): LineForm {
  const n = (v: number | null) => v?.toString() ?? "";
  return { materialType: l.materialType, issued: n(l.issued), used: n(l.used), damaged: n(l.damaged), returned: n(l.returned), destroyed: n(l.destroyed) };
}

const DEFAULT_LINES: LineForm[] = DEFAULT_PACKAGING_MATERIAL_LINES.map((materialType) => toLineForm({ materialType, issued: null, used: null, damaged: null, returned: null, destroyed: null }));

export function PackagingSection({ batchId, data, canManage }: { batchId: string; data: PackagingData | null; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [packedBottles, setPackedBottles] = useState(data?.packedBottles?.toString() ?? "");
  const [cartonsProduced, setCartonsProduced] = useState(data?.cartonsProduced?.toString() ?? "");
  const [casesProduced, setCasesProduced] = useState(data?.casesProduced?.toString() ?? "");
  const [packedByName, setPackedByName] = useState(data?.packedByName ?? "");
  const [packedAt, setPackedAt] = useState(data?.packedAt ? data.packedAt.slice(0, 10) : "");
  const [remarks, setRemarks] = useState(data?.remarks ?? "");
  const [lines, setLines] = useState<LineForm[]>(data && data.lines.length > 0 ? data.lines.map(toLineForm) : DEFAULT_LINES);

  function updateLine(i: number, patch: Partial<LineForm>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function save() {
    setError("");
    const num = (v: string) => (v ? Number(v) : null);
    startTransition(async () => {
      try {
        await savePackaging(
          batchId,
          { packedBottles: num(packedBottles), cartonsProduced: num(cartonsProduced), casesProduced: num(casesProduced), packedByName: packedByName || null, packedAt: packedAt || null, remarks: remarks || null },
          lines.map((l) => ({ materialType: l.materialType, issued: num(l.issued), used: num(l.used), damaged: num(l.damaged), returned: num(l.returned), destroyed: num(l.destroyed) }))
        );
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
              <th className="px-2 py-2">Material</th>
              <th className="px-2 py-2">Issued</th>
              <th className="px-2 py-2">Used</th>
              <th className="px-2 py-2">Damaged</th>
              <th className="px-2 py-2">Returned</th>
              <th className="px-2 py-2">Destroyed</th>
              <th className="px-2 py-2">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lines.map((l, i) => (
              <tr key={l.materialType}>
                <td className="px-2 py-1.5 font-medium text-foreground">{PACKAGING_MATERIAL_TYPE_LABEL[l.materialType]}</td>
                <td className="px-2 py-1.5">
                  <input type="number" className={MFG_INPUT_CLASS} disabled={!canManage} value={l.issued} onChange={(e) => updateLine(i, { issued: e.target.value })} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" className={MFG_INPUT_CLASS} disabled={!canManage} value={l.used} onChange={(e) => updateLine(i, { used: e.target.value })} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" className={MFG_INPUT_CLASS} disabled={!canManage} value={l.damaged} onChange={(e) => updateLine(i, { damaged: e.target.value })} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" className={MFG_INPUT_CLASS} disabled={!canManage} value={l.returned} onChange={(e) => updateLine(i, { returned: e.target.value })} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" className={MFG_INPUT_CLASS} disabled={!canManage} value={l.destroyed} onChange={(e) => updateLine(i, { destroyed: e.target.value })} />
                </td>
                <td className="px-2 py-1.5 font-mono-tabular text-muted-strong">{formatCount(computeBalance(l.issued ? Number(l.issued) : null, l.returned ? Number(l.returned) : null))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Packed Bottles">
          <input type="number" className={MFG_INPUT_CLASS} disabled={!canManage} value={packedBottles} onChange={(e) => setPackedBottles(e.target.value)} />
        </Field>
        <Field label="Cartons Produced">
          <input type="number" className={MFG_INPUT_CLASS} disabled={!canManage} value={cartonsProduced} onChange={(e) => setCartonsProduced(e.target.value)} />
        </Field>
        <Field label="Cases Produced">
          <input type="number" className={MFG_INPUT_CLASS} disabled={!canManage} value={casesProduced} onChange={(e) => setCasesProduced(e.target.value)} />
        </Field>
        <Field label="Packed By">
          <input className={MFG_INPUT_CLASS} disabled={!canManage} value={packedByName} onChange={(e) => setPackedByName(e.target.value)} />
        </Field>
        <Field label="Packed At">
          <input type="date" className={MFG_INPUT_CLASS} disabled={!canManage} value={packedAt} onChange={(e) => setPackedAt(e.target.value)} />
        </Field>
      </div>

      <Field label="Remarks">
        <textarea className={MFG_INPUT_CLASS} rows={2} disabled={!canManage} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </Field>

      {error && <p className="text-xs text-status-critical">{error}</p>}

      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save Packaging"}
          </Button>
        </div>
      )}
    </div>
  );
}
