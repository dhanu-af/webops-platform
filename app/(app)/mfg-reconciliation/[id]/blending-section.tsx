"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveBlending } from "@/lib/actions/mfg-reconciliation";
import { computeYieldPct } from "@/lib/mfg-reconciliation";
import { Field, StageSection, ComputedField, MFG_INPUT_CLASS } from "@/components/mfg/field";
import { Button } from "@/components/ui/button";

export type BlendingData = {
  totalTheoreticalWeightKg: number | null;
  actualWeightKg: number | null;
  blendBatchNumber: string | null;
  powderRemainingKg: number | null;
  blenderResidueKg: number | null;
  sieveLossKg: number | null;
  dustLossKg: number | null;
  spillagesKg: number | null;
  qcSamplesQty: number | null;
  retentionSamplesQty: number | null;
  destroyedMaterialKg: number | null;
  returnedToWarehouseKg: number | null;
  totalBlendProducedKg: number | null;
  blendedByName: string | null;
  blendedAt: string | null;
  remarks: string | null;
};

type Form = Record<keyof Omit<BlendingData, "blendedAt">, string> & { blendedAt: string };

function toForm(d: BlendingData | null): Form {
  const n = (v: number | null) => v?.toString() ?? "";
  return {
    totalTheoreticalWeightKg: n(d?.totalTheoreticalWeightKg ?? null),
    actualWeightKg: n(d?.actualWeightKg ?? null),
    blendBatchNumber: d?.blendBatchNumber ?? "",
    powderRemainingKg: n(d?.powderRemainingKg ?? null),
    blenderResidueKg: n(d?.blenderResidueKg ?? null),
    sieveLossKg: n(d?.sieveLossKg ?? null),
    dustLossKg: n(d?.dustLossKg ?? null),
    spillagesKg: n(d?.spillagesKg ?? null),
    qcSamplesQty: n(d?.qcSamplesQty ?? null),
    retentionSamplesQty: n(d?.retentionSamplesQty ?? null),
    destroyedMaterialKg: n(d?.destroyedMaterialKg ?? null),
    returnedToWarehouseKg: n(d?.returnedToWarehouseKg ?? null),
    totalBlendProducedKg: n(d?.totalBlendProducedKg ?? null),
    blendedByName: d?.blendedByName ?? "",
    blendedAt: d?.blendedAt ? d.blendedAt.slice(0, 10) : "",
    remarks: d?.remarks ?? "",
  };
}

function NumField({ label, form, k, set, disabled }: { label: string; form: Form; k: keyof Form; set: (patch: Partial<Form>) => void; disabled: boolean }) {
  return (
    <Field label={label}>
      <input type="number" step="0.001" className={MFG_INPUT_CLASS} disabled={disabled} value={form[k]} onChange={(e) => set({ [k]: e.target.value } as Partial<Form>)} />
    </Field>
  );
}

export function BlendingSection({ batchId, data, canManage }: { batchId: string; data: BlendingData | null; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState<Form>(toForm(data));
  const set = (patch: Partial<Form>) => setForm((prev) => ({ ...prev, ...patch }));

  const blendYield = computeYieldPct(form.totalBlendProducedKg ? Number(form.totalBlendProducedKg) : null, form.totalTheoreticalWeightKg ? Number(form.totalTheoreticalWeightKg) : null);

  function save() {
    setError("");
    startTransition(async () => {
      try {
        await saveBlending(batchId, {
          totalTheoreticalWeightKg: form.totalTheoreticalWeightKg ? Number(form.totalTheoreticalWeightKg) : null,
          actualWeightKg: form.actualWeightKg ? Number(form.actualWeightKg) : null,
          blendBatchNumber: form.blendBatchNumber || null,
          powderRemainingKg: form.powderRemainingKg ? Number(form.powderRemainingKg) : null,
          blenderResidueKg: form.blenderResidueKg ? Number(form.blenderResidueKg) : null,
          sieveLossKg: form.sieveLossKg ? Number(form.sieveLossKg) : null,
          dustLossKg: form.dustLossKg ? Number(form.dustLossKg) : null,
          spillagesKg: form.spillagesKg ? Number(form.spillagesKg) : null,
          qcSamplesQty: form.qcSamplesQty ? Number(form.qcSamplesQty) : null,
          retentionSamplesQty: form.retentionSamplesQty ? Number(form.retentionSamplesQty) : null,
          destroyedMaterialKg: form.destroyedMaterialKg ? Number(form.destroyedMaterialKg) : null,
          returnedToWarehouseKg: form.returnedToWarehouseKg ? Number(form.returnedToWarehouseKg) : null,
          totalBlendProducedKg: form.totalBlendProducedKg ? Number(form.totalBlendProducedKg) : null,
          blendedByName: form.blendedByName || null,
          blendedAt: form.blendedAt || null,
          remarks: form.remarks || null,
        });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <StageSection title="Input">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumField label="Total Theoretical Weight (kg)" form={form} k="totalTheoreticalWeightKg" set={set} disabled={!canManage} />
          <NumField label="Actual Weight (kg)" form={form} k="actualWeightKg" set={set} disabled={!canManage} />
          <Field label="Blend Batch Number">
            <input className={MFG_INPUT_CLASS} disabled={!canManage} value={form.blendBatchNumber} onChange={(e) => set({ blendBatchNumber: e.target.value })} />
          </Field>
        </div>
      </StageSection>

      <StageSection title="Reconciliation">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumField label="Powder Remaining (kg)" form={form} k="powderRemainingKg" set={set} disabled={!canManage} />
          <NumField label="Blender Residue (kg)" form={form} k="blenderResidueKg" set={set} disabled={!canManage} />
          <NumField label="Sieve Loss (kg)" form={form} k="sieveLossKg" set={set} disabled={!canManage} />
          <NumField label="Dust Loss (kg)" form={form} k="dustLossKg" set={set} disabled={!canManage} />
          <NumField label="Spillages (kg)" form={form} k="spillagesKg" set={set} disabled={!canManage} />
          <NumField label="QC Samples" form={form} k="qcSamplesQty" set={set} disabled={!canManage} />
          <NumField label="Retention Samples" form={form} k="retentionSamplesQty" set={set} disabled={!canManage} />
          <NumField label="Destroyed Material (kg)" form={form} k="destroyedMaterialKg" set={set} disabled={!canManage} />
          <NumField label="Returned to Warehouse (kg)" form={form} k="returnedToWarehouseKg" set={set} disabled={!canManage} />
        </div>
      </StageSection>

      <StageSection title="Output">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumField label="Total Blend Produced (kg)" form={form} k="totalBlendProducedKg" set={set} disabled={!canManage} />
          <ComputedField label="Blend Yield %" value={blendYield !== null ? `${blendYield.toFixed(1)}%` : "—"} />
          <Field label="Blended By">
            <input className={MFG_INPUT_CLASS} disabled={!canManage} value={form.blendedByName} onChange={(e) => set({ blendedByName: e.target.value })} />
          </Field>
          <Field label="Blended At">
            <input type="date" className={MFG_INPUT_CLASS} disabled={!canManage} value={form.blendedAt} onChange={(e) => set({ blendedAt: e.target.value })} />
          </Field>
        </div>
      </StageSection>

      <Field label="Remarks">
        <textarea className={MFG_INPUT_CLASS} rows={2} disabled={!canManage} value={form.remarks} onChange={(e) => set({ remarks: e.target.value })} />
      </Field>

      {error && <p className="text-xs text-status-critical">{error}</p>}

      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save Blending"}
          </Button>
        </div>
      )}
    </div>
  );
}
