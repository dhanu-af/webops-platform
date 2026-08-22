"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveEncapsulation } from "@/lib/actions/mfg-reconciliation";
import { capsulesFromKg, checkRange, checkBelow, formatCount } from "@/lib/mfg-reconciliation";
import { Field, StageSection, ComputedField, MFG_INPUT_CLASS } from "@/components/mfg/field";
import { ReconciliationCheckRow } from "@/components/mfg/reconciliation-check-row";
import { Button } from "@/components/ui/button";

export type EncapsulationData = {
  targetCapsuleFillWeightMg: number | null;
  avgCapsuleFullWeightMg: number | null;
  issuedBulkBlendKg: number | null;
  capsulesProducedKg: number | null;
  capsuleSamplesKg: number | null;
  rejectCapsulesKg: number | null;
  rejectPowderKg: number | null;
  avgCapsuleFillWeightMg: number | null;
  avgCapsuleLengthMm: number | null;
  avgDisintegrationMinutes: number | null;
  avgDisintegrationSeconds: number | null;
  disintegrationResult: string | null;
  completedByName: string | null;
  completedAt: string | null;
  checkedByName: string | null;
  checkedAt: string | null;
  comments: string | null;
};

type NumKey = Exclude<keyof EncapsulationData, "disintegrationResult" | "completedByName" | "completedAt" | "checkedByName" | "checkedAt" | "comments">;
type Form = Record<NumKey, string> & { disintegrationResult: string; completedByName: string; completedAt: string; checkedByName: string; checkedAt: string; comments: string };

function toForm(d: EncapsulationData | null): Form {
  const n = (v: number | null | undefined) => v?.toString() ?? "";
  return {
    targetCapsuleFillWeightMg: n(d?.targetCapsuleFillWeightMg),
    avgCapsuleFullWeightMg: n(d?.avgCapsuleFullWeightMg),
    issuedBulkBlendKg: n(d?.issuedBulkBlendKg),
    capsulesProducedKg: n(d?.capsulesProducedKg),
    capsuleSamplesKg: n(d?.capsuleSamplesKg),
    rejectCapsulesKg: n(d?.rejectCapsulesKg),
    rejectPowderKg: n(d?.rejectPowderKg),
    avgCapsuleFillWeightMg: n(d?.avgCapsuleFillWeightMg),
    avgCapsuleLengthMm: n(d?.avgCapsuleLengthMm),
    avgDisintegrationMinutes: n(d?.avgDisintegrationMinutes),
    avgDisintegrationSeconds: n(d?.avgDisintegrationSeconds),
    disintegrationResult: d?.disintegrationResult ?? "",
    completedByName: d?.completedByName ?? "",
    completedAt: d?.completedAt ? d.completedAt.slice(0, 10) : "",
    checkedByName: d?.checkedByName ?? "",
    checkedAt: d?.checkedAt ? d.checkedAt.slice(0, 10) : "",
    comments: d?.comments ?? "",
  };
}

function NumField({ label, form, k, set, disabled, hint }: { label: string; form: Form; k: NumKey; set: (patch: Partial<Form>) => void; disabled: boolean; hint?: string }) {
  return (
    <Field label={label}>
      <input type="number" step="0.001" className={MFG_INPUT_CLASS} disabled={disabled} value={form[k]} onChange={(e) => set({ [k]: e.target.value } as Partial<Form>)} placeholder={hint} />
    </Field>
  );
}

export function EncapsulationSection({ batchId, data, canManage }: { batchId: string; data: EncapsulationData | null; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState<Form>(toForm(data));
  const set = (patch: Partial<Form>) => setForm((prev) => ({ ...prev, ...patch }));

  const num = (v: string) => (v ? Number(v) : null);
  const issuedBulkBlendKg = num(form.issuedBulkBlendKg);
  const targetFill = num(form.targetCapsuleFillWeightMg);
  const avgFull = num(form.avgCapsuleFullWeightMg);
  const avgFill = num(form.avgCapsuleFillWeightMg);
  const capsulesProducedKg = num(form.capsulesProducedKg);
  const capsuleSamplesKg = num(form.capsuleSamplesKg);
  const rejectCapsulesKg = num(form.rejectCapsulesKg);
  const rejectPowderKg = num(form.rejectPowderKg);

  const theoreticalCapsules = capsulesFromKg(issuedBulkBlendKg, targetFill);
  const capsulesProduced = capsulesFromKg(capsulesProducedKg, avgFull);
  const capsuleSamples = capsulesFromKg(capsuleSamplesKg, avgFull);
  const rejectCapsules = capsulesFromKg(rejectCapsulesKg, avgFull);
  const blendInProducedCapsulesKg = capsulesProduced !== null && avgFill !== null ? (capsulesProduced * avgFill) / 1_000_000 : null;
  const bulkBlendAccountedForKg =
    blendInProducedCapsulesKg !== null && capsuleSamplesKg !== null && rejectCapsulesKg !== null && rejectPowderKg !== null
      ? blendInProducedCapsulesKg + capsuleSamplesKg + rejectCapsulesKg + rejectPowderKg
      : null;
  const bulkBlendUnaccountedForKg = bulkBlendAccountedForKg !== null && issuedBulkBlendKg !== null ? issuedBulkBlendKg - bulkBlendAccountedForKg : null;

  const capsuleReconciliationPct =
    capsulesProduced !== null && capsuleSamples !== null && rejectCapsules !== null && theoreticalCapsules ? ((capsulesProduced + capsuleSamples + rejectCapsules) / theoreticalCapsules) * 100 : null;
  const blendReconciliationPct = bulkBlendAccountedForKg !== null && issuedBulkBlendKg ? (bulkBlendAccountedForKg / issuedBulkBlendKg) * 100 : null;
  const processYieldPct = capsulesProduced !== null && theoreticalCapsules ? (capsulesProduced / theoreticalCapsules) * 100 : null;
  const capsuleRejectionPct = rejectCapsules !== null && capsulesProduced !== null && capsulesProduced + rejectCapsules !== 0 ? (rejectCapsules / (capsulesProduced + rejectCapsules)) * 100 : null;

  function save() {
    setError("");
    startTransition(async () => {
      try {
        await saveEncapsulation(batchId, {
          targetCapsuleFillWeightMg: targetFill,
          avgCapsuleFullWeightMg: avgFull,
          issuedBulkBlendKg,
          capsulesProducedKg,
          capsuleSamplesKg,
          rejectCapsulesKg,
          rejectPowderKg,
          avgCapsuleFillWeightMg: avgFill,
          avgCapsuleLengthMm: num(form.avgCapsuleLengthMm),
          avgDisintegrationMinutes: num(form.avgDisintegrationMinutes),
          avgDisintegrationSeconds: num(form.avgDisintegrationSeconds),
          disintegrationResult: form.disintegrationResult || null,
          completedByName: form.completedByName || null,
          completedAt: form.completedAt || null,
          checkedByName: form.checkedByName || null,
          checkedAt: form.checkedAt || null,
          comments: form.comments || null,
        });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <StageSection title="Header">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumField label="Target Capsule Fill Weight (mg)" form={form} k="targetCapsuleFillWeightMg" set={set} disabled={!canManage} hint="e.g. 372 (not 0.372)" />
          <NumField label="Average Capsule Full Weight (mg)" form={form} k="avgCapsuleFullWeightMg" set={set} disabled={!canManage} hint="e.g. 450 (not 0.450)" />
        </div>
      </StageSection>

      <StageSection title="Batch Total Weights">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumField label="Issued Bulk Blend (kg)" form={form} k="issuedBulkBlendKg" set={set} disabled={!canManage} />
          <NumField label="Capsules Produced (kg)" form={form} k="capsulesProducedKg" set={set} disabled={!canManage} />
          <NumField label="Capsule Samples (kg)" form={form} k="capsuleSamplesKg" set={set} disabled={!canManage} />
          <NumField label="Reject Capsules (kg)" form={form} k="rejectCapsulesKg" set={set} disabled={!canManage} />
          <NumField label="Reject Powder (kg)" form={form} k="rejectPowderKg" set={set} disabled={!canManage} />
        </div>
      </StageSection>

      <StageSection title="Batch Calculations">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <ComputedField label="Theoretical No. of Capsules" value={formatCount(theoreticalCapsules)} />
          <ComputedField label="No. of Capsules Produced" value={formatCount(capsulesProduced)} />
          <ComputedField label="No. of Capsule Samples" value={formatCount(capsuleSamples)} />
          <ComputedField label="No. of Reject Capsules" value={formatCount(rejectCapsules)} />
          <ComputedField label="Bulk Blend Accounted For (kg)" value={formatCount(bulkBlendAccountedForKg)} />
          <ComputedField label="Bulk Blend Unaccounted For (kg)" value={formatCount(bulkBlendUnaccountedForKg)} />
        </div>
      </StageSection>

      <StageSection title="Capsule Properties">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumField label="Average Capsule Fill Weight (mg)" form={form} k="avgCapsuleFillWeightMg" set={set} disabled={!canManage} hint="e.g. 372 (not 0.372)" />
          <NumField label="Average Capsule Length (mm)" form={form} k="avgCapsuleLengthMm" set={set} disabled={!canManage} />
          <NumField label="Avg. Disintegration (minutes)" form={form} k="avgDisintegrationMinutes" set={set} disabled={!canManage} />
          <NumField label="Avg. Disintegration (seconds)" form={form} k="avgDisintegrationSeconds" set={set} disabled={!canManage} />
          <Field label="Disintegration Result">
            <select className={MFG_INPUT_CLASS} disabled={!canManage} value={form.disintegrationResult} onChange={(e) => set({ disintegrationResult: e.target.value })}>
              <option value="">—</option>
              <option value="Pass">Pass</option>
              <option value="Fail">Fail</option>
            </select>
          </Field>
        </div>
      </StageSection>

      <StageSection title="Reconciliation">
        <div className="rounded-lg border border-border bg-surface-sunken/40 px-4">
          <ReconciliationCheckRow check={checkRange("Capsule Reconciliation", capsuleReconciliationPct, 98, 102)} />
          <ReconciliationCheckRow check={checkRange("Blend Reconciliation", blendReconciliationPct, 98, 102)} />
          <ReconciliationCheckRow check={checkRange("Process Yield", processYieldPct, 95, 102)} />
          <ReconciliationCheckRow check={checkBelow("Capsule Rejection", capsuleRejectionPct, 1.5)} />
        </div>
      </StageSection>

      <StageSection title="Sign-off">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Completed By">
            <input className={MFG_INPUT_CLASS} disabled={!canManage} value={form.completedByName} onChange={(e) => set({ completedByName: e.target.value })} />
          </Field>
          <Field label="Completed Date">
            <input type="date" className={MFG_INPUT_CLASS} disabled={!canManage} value={form.completedAt} onChange={(e) => set({ completedAt: e.target.value })} />
          </Field>
          <Field label="Checked By">
            <input className={MFG_INPUT_CLASS} disabled={!canManage} value={form.checkedByName} onChange={(e) => set({ checkedByName: e.target.value })} />
          </Field>
          <Field label="Checked Date">
            <input type="date" className={MFG_INPUT_CLASS} disabled={!canManage} value={form.checkedAt} onChange={(e) => set({ checkedAt: e.target.value })} />
          </Field>
        </div>
        <Field label="Comments">
          <textarea className={MFG_INPUT_CLASS} rows={2} disabled={!canManage} value={form.comments} onChange={(e) => set({ comments: e.target.value })} />
        </Field>
      </StageSection>

      {error && <p className="text-xs text-status-critical">{error}</p>}

      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save Encapsulation"}
          </Button>
        </div>
      )}
    </div>
  );
}
