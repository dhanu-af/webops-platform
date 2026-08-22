"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveBottling } from "@/lib/actions/mfg-reconciliation";
import { capsulesFromKg, checkRange, checkBelow, formatCount } from "@/lib/mfg-reconciliation";
import { Field, StageSection, ComputedField, MFG_INPUT_CLASS } from "@/components/mfg/field";
import { ReconciliationCheckRow } from "@/components/mfg/reconciliation-check-row";
import { Button } from "@/components/ui/button";

export type BottlingData = {
  totalCapsuleBulkWeightKg: number | null;
  avgCapsuleFullWeightMg: number | null;
  plannedQuantityBottles: number | null;
  capsuleReceivedKg: number | null;
  bottlesProduced: number | null;
  bottleUsed: number | null;
  desiccantsUsed: number | null;
  capsUsed: number | null;
  targetCapsulesPerBottle: number | null;
  completedByName: string | null;
  completedAt: string | null;
  checkedByName: string | null;
  checkedAt: string | null;
  comments: string | null;
};

type NumKey = Exclude<keyof BottlingData, "completedByName" | "completedAt" | "checkedByName" | "checkedAt" | "comments">;
type Form = Record<NumKey, string> & { completedByName: string; completedAt: string; checkedByName: string; checkedAt: string; comments: string };

function toForm(d: BottlingData | null): Form {
  const n = (v: number | null | undefined) => v?.toString() ?? "";
  return {
    totalCapsuleBulkWeightKg: n(d?.totalCapsuleBulkWeightKg),
    avgCapsuleFullWeightMg: n(d?.avgCapsuleFullWeightMg),
    plannedQuantityBottles: n(d?.plannedQuantityBottles),
    capsuleReceivedKg: n(d?.capsuleReceivedKg),
    bottlesProduced: n(d?.bottlesProduced),
    bottleUsed: n(d?.bottleUsed),
    desiccantsUsed: n(d?.desiccantsUsed),
    capsUsed: n(d?.capsUsed),
    targetCapsulesPerBottle: n(d?.targetCapsulesPerBottle),
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

export function BottlingSection({ batchId, data, canManage }: { batchId: string; data: BottlingData | null; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState<Form>(toForm(data));
  const set = (patch: Partial<Form>) => setForm((prev) => ({ ...prev, ...patch }));

  const num = (v: string) => (v ? Number(v) : null);
  const avgFull = num(form.avgCapsuleFullWeightMg);
  const targetPerBottle = num(form.targetCapsulesPerBottle);
  const plannedQuantityBottles = num(form.plannedQuantityBottles);
  const capsuleReceivedKg = num(form.capsuleReceivedKg);
  const bottlesProduced = num(form.bottlesProduced);
  const bottleUsed = num(form.bottleUsed);
  const desiccantsUsed = num(form.desiccantsUsed);
  const capsUsed = num(form.capsUsed);

  const capsulesRequired = plannedQuantityBottles !== null && targetPerBottle !== null ? plannedQuantityBottles * targetPerBottle : null;
  const theoreticalCapsules = capsulesFromKg(capsuleReceivedKg, avgFull);
  const theoreticalBottles = theoreticalCapsules !== null && targetPerBottle ? theoreticalCapsules / targetPerBottle : null;
  const capsulesUsed = bottlesProduced !== null && targetPerBottle !== null ? bottlesProduced * targetPerBottle : null;
  const rejectCapsules = theoreticalCapsules !== null && capsulesUsed !== null ? theoreticalCapsules - capsulesUsed : null;
  const rejectBottlesFromCapsuleLoss = rejectCapsules !== null && targetPerBottle ? rejectCapsules / targetPerBottle : null;
  const rejectBottles = bottleUsed !== null && bottlesProduced !== null ? bottleUsed - bottlesProduced : null;
  const rejectDesiccants = desiccantsUsed !== null && bottlesProduced !== null ? desiccantsUsed - bottlesProduced : null;
  const rejectCaps = capsUsed !== null && bottlesProduced !== null ? capsUsed - bottlesProduced : null;

  const capsuleReconciliationPct = capsulesUsed !== null && theoreticalCapsules ? (capsulesUsed / theoreticalCapsules) * 100 : null;
  const capsReconciliationPct = bottlesProduced !== null && capsUsed ? (bottlesProduced / capsUsed) * 100 : null;
  const bottleReconciliationPct = bottlesProduced !== null && bottleUsed ? (bottlesProduced / bottleUsed) * 100 : null;
  const processYieldPct = bottlesProduced !== null && theoreticalBottles ? (bottlesProduced / theoreticalBottles) * 100 : null;
  const rejectionLossPct = rejectCapsules !== null && theoreticalCapsules ? (rejectCapsules / theoreticalCapsules) * 100 : null;

  function save() {
    setError("");
    startTransition(async () => {
      try {
        await saveBottling(batchId, {
          totalCapsuleBulkWeightKg: num(form.totalCapsuleBulkWeightKg),
          avgCapsuleFullWeightMg: avgFull,
          plannedQuantityBottles,
          capsuleReceivedKg,
          bottlesProduced,
          bottleUsed,
          desiccantsUsed,
          capsUsed,
          targetCapsulesPerBottle: targetPerBottle,
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
          <NumField label="Average Capsule Full Weight (mg)" form={form} k="avgCapsuleFullWeightMg" set={set} disabled={!canManage} hint="e.g. 450 (not 0.450)" />
          <NumField label="Target Capsules per Bottle" form={form} k="targetCapsulesPerBottle" set={set} disabled={!canManage} />
        </div>
      </StageSection>

      <StageSection title="Batch Production Data">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumField label="Total Capsule Bulk Weight (kg)" form={form} k="totalCapsuleBulkWeightKg" set={set} disabled={!canManage} />
          <NumField label="Planned Quantity (Bottles)" form={form} k="plannedQuantityBottles" set={set} disabled={!canManage} />
          <NumField label="Capsule Received (kg)" form={form} k="capsuleReceivedKg" set={set} disabled={!canManage} />
          <NumField label="Bottles Produced" form={form} k="bottlesProduced" set={set} disabled={!canManage} />
          <NumField label="Bottle Used" form={form} k="bottleUsed" set={set} disabled={!canManage} />
          <NumField label="Desiccants Used" form={form} k="desiccantsUsed" set={set} disabled={!canManage} />
          <NumField label="Caps Used" form={form} k="capsUsed" set={set} disabled={!canManage} />
        </div>
      </StageSection>

      <StageSection title="Batch Calculations">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <ComputedField label="Capsules Required" value={formatCount(capsulesRequired)} />
          <ComputedField label="Theoretical No. of Capsules" value={formatCount(theoreticalCapsules)} />
          <ComputedField label="Theoretical Bottles" value={formatCount(theoreticalBottles)} />
          <ComputedField label="Capsules Used" value={formatCount(capsulesUsed)} />
          <ComputedField label="Reject Capsules" value={formatCount(rejectCapsules)} />
          <ComputedField label="Reject Bottles (from capsule loss)" value={formatCount(rejectBottlesFromCapsuleLoss)} />
          <ComputedField label="Reject Bottles" value={formatCount(rejectBottles)} />
          <ComputedField label="Reject Desiccants" value={formatCount(rejectDesiccants)} />
          <ComputedField label="Reject Caps" value={formatCount(rejectCaps)} />
        </div>
      </StageSection>

      <StageSection title="Reconciliation">
        <div className="rounded-lg border border-border bg-surface-sunken/40 px-4">
          <ReconciliationCheckRow check={checkRange("Capsule Reconciliation", capsuleReconciliationPct, 98, 102)} />
          <ReconciliationCheckRow check={checkRange("Caps Reconciliation", capsReconciliationPct, 98, 102)} />
          <ReconciliationCheckRow check={checkRange("Bottle Reconciliation", bottleReconciliationPct, 98, 102)} />
          <ReconciliationCheckRow check={checkRange("Process Yield", processYieldPct, 95, 102)} />
          <ReconciliationCheckRow check={checkBelow("Rejection & Loss", rejectionLossPct, 2)} />
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
            {pending ? "Saving…" : "Save Bottling"}
          </Button>
        </div>
      )}
    </div>
  );
}
