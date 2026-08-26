"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveXrayInspection } from "@/lib/actions/mfg-reconciliation";
import { Field, StageSection, MFG_INPUT_CLASS } from "@/components/mfg/field";
import { Button } from "@/components/ui/button";

export type XrayData = {
  bottlesReceived: number | null;
  bottlesScanned: number | null;
  passed: number | null;
  failed: number | null;
  reworked: number | null;
  destroyed: number | null;
  released: number | null;
  rejectMetalDetection: number | null;
  rejectXrayFailure: number | null;
  rejectUnderweight: number | null;
  rejectOverweight: number | null;
  rejectDamagedBottle: number | null;
  rejectMissingCap: number | null;
  rejectMissingDesiccant: number | null;
  inspectedByName: string | null;
  inspectedAt: string | null;
  remarks: string | null;
};

type NumKey = Exclude<keyof XrayData, "inspectedByName" | "inspectedAt" | "remarks">;
type Form = Record<NumKey, string> & { inspectedByName: string; inspectedAt: string; remarks: string };

const COUNT_FIELDS: { key: NumKey; label: string }[] = [
  { key: "bottlesReceived", label: "Bottles Received" },
  { key: "bottlesScanned", label: "Bottles Scanned" },
  { key: "passed", label: "Passed" },
  { key: "failed", label: "Failed" },
  { key: "reworked", label: "Reworked" },
  { key: "destroyed", label: "Destroyed" },
  { key: "released", label: "Released" },
];

const REJECT_FIELDS: { key: NumKey; label: string }[] = [
  { key: "rejectMetalDetection", label: "Metal Detection" },
  { key: "rejectXrayFailure", label: "X-Ray Failure" },
  { key: "rejectUnderweight", label: "Underweight" },
  { key: "rejectOverweight", label: "Overweight" },
  { key: "rejectDamagedBottle", label: "Damaged Bottle" },
  { key: "rejectMissingCap", label: "Missing Cap" },
  { key: "rejectMissingDesiccant", label: "Missing Desiccant" },
];

function toForm(d: XrayData | null, priorStageBottlesProduced: number | null): Form {
  const n = (v: number | null | undefined) => v?.toString() ?? "";
  return {
    bottlesReceived: n(d?.bottlesReceived ?? priorStageBottlesProduced),
    bottlesScanned: n(d?.bottlesScanned),
    passed: n(d?.passed),
    failed: n(d?.failed),
    reworked: n(d?.reworked),
    destroyed: n(d?.destroyed),
    released: n(d?.released),
    rejectMetalDetection: n(d?.rejectMetalDetection),
    rejectXrayFailure: n(d?.rejectXrayFailure),
    rejectUnderweight: n(d?.rejectUnderweight),
    rejectOverweight: n(d?.rejectOverweight),
    rejectDamagedBottle: n(d?.rejectDamagedBottle),
    rejectMissingCap: n(d?.rejectMissingCap),
    rejectMissingDesiccant: n(d?.rejectMissingDesiccant),
    inspectedByName: d?.inspectedByName ?? "",
    inspectedAt: d?.inspectedAt ? d.inspectedAt.slice(0, 10) : "",
    remarks: d?.remarks ?? "",
  };
}

export function XraySection({
  batchId,
  data,
  canManage,
  priorStageBottlesProduced = null,
}: {
  batchId: string;
  data: XrayData | null;
  canManage: boolean;
  priorStageBottlesProduced?: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState<Form>(toForm(data, priorStageBottlesProduced));
  const set = (patch: Partial<Form>) => setForm((prev) => ({ ...prev, ...patch }));
  const num = (v: string) => (v ? Number(v) : null);
  const bottlesReceivedAutoFilled = data?.bottlesReceived == null && priorStageBottlesProduced != null;

  function save() {
    setError("");
    startTransition(async () => {
      try {
        await saveXrayInspection(batchId, {
          bottlesReceived: num(form.bottlesReceived),
          bottlesScanned: num(form.bottlesScanned),
          passed: num(form.passed),
          failed: num(form.failed),
          reworked: num(form.reworked),
          destroyed: num(form.destroyed),
          released: num(form.released),
          rejectMetalDetection: num(form.rejectMetalDetection),
          rejectXrayFailure: num(form.rejectXrayFailure),
          rejectUnderweight: num(form.rejectUnderweight),
          rejectOverweight: num(form.rejectOverweight),
          rejectDamagedBottle: num(form.rejectDamagedBottle),
          rejectMissingCap: num(form.rejectMissingCap),
          rejectMissingDesiccant: num(form.rejectMissingDesiccant),
          inspectedByName: form.inspectedByName || null,
          inspectedAt: form.inspectedAt || null,
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
      <StageSection title="Inspection">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COUNT_FIELDS.map((f) => (
            <Field key={f.key} label={f.label} note={f.key === "bottlesReceived" && bottlesReceivedAutoFilled ? "auto-filled from Bottling" : undefined}>
              <input type="number" className={MFG_INPUT_CLASS} disabled={!canManage} value={form[f.key]} onChange={(e) => set({ [f.key]: e.target.value } as Partial<Form>)} />
            </Field>
          ))}
        </div>
      </StageSection>

      <StageSection title="Reject Reasons">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {REJECT_FIELDS.map((f) => (
            <Field key={f.key} label={f.label}>
              <input type="number" className={MFG_INPUT_CLASS} disabled={!canManage} value={form[f.key]} onChange={(e) => set({ [f.key]: e.target.value } as Partial<Form>)} />
            </Field>
          ))}
        </div>
      </StageSection>

      <StageSection title="Sign-off">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Inspected By">
            <input className={MFG_INPUT_CLASS} disabled={!canManage} value={form.inspectedByName} onChange={(e) => set({ inspectedByName: e.target.value })} />
          </Field>
          <Field label="Inspected At">
            <input type="date" className={MFG_INPUT_CLASS} disabled={!canManage} value={form.inspectedAt} onChange={(e) => set({ inspectedAt: e.target.value })} />
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
            {pending ? "Saving…" : "Save X-Ray / Metal Detection"}
          </Button>
        </div>
      )}
    </div>
  );
}
