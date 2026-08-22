"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createCalculation, deleteCalculation } from "@/lib/actions/capsule-calculations";
import {
  CALCULATION_DIRECTIONS,
  DIRECTION_LABEL,
  WEIGHT_FIELD_LABEL,
  QUANTITY_FIELD_LABEL,
  PER_CONTAINER_LABEL,
  CONTAINER_RESULT_LABEL,
  weightKind,
  showsCapsulesResult,
  kgResultLabel,
  computeCalculation,
  formatKg,
  formatWholeCount,
} from "@/lib/capsule-calculation";
import type { CalculationDirection } from "@/app/generated/prisma/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import type { StatusTone } from "@/lib/status";

export type CalculationRow = {
  id: string;
  direction: CalculationDirection;
  label: string | null;
  productName: string | null;
  batchNumber: string | null;
  capsulesPerBottle: number;
  avgWeightMg: number;
  inputValue: number;
  resultKg: number;
  resultCapsules: number;
  resultBottles: number;
  createdByName: string;
  createdAtLabel: string;
};

const DIRECTION_TONE: Record<CalculationDirection, StatusTone> = {
  BOTTLES_TO_KG: "accent",
  KG_TO_OUTPUT: "neutral",
  BAGGED_KG_TO_OUTPUT: "pass",
  CAPSULES_TO_SHELLS: "warn",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-strong">{label}</span>
      {children}
    </label>
  );
}

const INPUT_CLASS = "w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent";

export function CalculationClient({ calculations }: { calculations: CalculationRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [direction, setDirection] = useState<CalculationDirection>("BOTTLES_TO_KG");
  const [label, setLabel] = useState("");
  const [productName, setProductName] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  // Pre-filled with the facility's common values, still fully editable --
  // most runs use the same capsule count/fill weight, so this saves
  // re-typing them every time without locking the fields.
  const [capsulesPerBottle, setCapsulesPerBottle] = useState("31");
  const [avgWeightMg, setAvgWeightMg] = useState("372");
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");

  const capsulesPerBottleNum = Number(capsulesPerBottle);
  const avgWeightMgNum = Number(avgWeightMg);
  const inputValueNum = Number(inputValue);
  const preview =
    capsulesPerBottleNum > 0 && avgWeightMgNum > 0 && inputValueNum > 0
      ? computeCalculation(direction, inputValueNum, capsulesPerBottleNum, avgWeightMgNum)
      : null;
  const kgLabel = kgResultLabel(direction);
  const showCapsulesTile = showsCapsulesResult(direction);
  const tileCount = (kgLabel ? 1 : 0) + (showCapsulesTile ? 1 : 0) + 1;

  function save() {
    setError("");
    if (!capsulesPerBottleNum || capsulesPerBottleNum <= 0) return setError(`${PER_CONTAINER_LABEL[direction]} must be greater than 0.`);
    if (!avgWeightMgNum || avgWeightMgNum <= 0) return setError(`${WEIGHT_FIELD_LABEL[direction]} must be greater than 0.`);
    if (!inputValueNum || inputValueNum <= 0) return setError(`Enter a value for "${QUANTITY_FIELD_LABEL[direction]}".`);

    startTransition(async () => {
      try {
        await createCalculation({
          direction,
          label: label || null,
          productName: productName || null,
          batchNumber: batchNumber || null,
          capsulesPerBottle: capsulesPerBottleNum,
          avgWeightMg: avgWeightMgNum,
          inputValue: inputValueNum,
        });
        setLabel("");
        setProductName("");
        setBatchNumber("");
        setInputValue("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save calculation.");
      }
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this calculation?")) return;
    startTransition(async () => {
      try {
        await deleteCalculation(id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't delete.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Calculation</h1>
        <p className="text-sm text-muted">
          Capsule/bottle ↔ kg production planning math. Theoretical figures only — no allowance for spillage, rejects, QC samples, or process yield
          loss.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {CALCULATION_DIRECTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  direction === d
                    ? "border-accent/40 bg-accent-soft text-accent-strong"
                    : "border-border-strong text-muted-strong hover:bg-surface-sunken"
                )}
              >
                {DIRECTION_LABEL[d]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Product Name (optional)">
              <input className={INPUT_CLASS} placeholder="e.g. Gut Health Complex" value={productName} onChange={(e) => setProductName(e.target.value)} />
            </Field>
            <Field label="Batch Number (optional)">
              <input className={INPUT_CLASS} placeholder="e.g. B-2026-08-14" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
            </Field>
            <Field label="Label (optional)">
              <input className={INPUT_CLASS} placeholder="e.g. August blend" value={label} onChange={(e) => setLabel(e.target.value)} />
            </Field>
            <Field label={PER_CONTAINER_LABEL[direction]}>
              <input
                type="number"
                className={INPUT_CLASS}
                value={capsulesPerBottle}
                onChange={(e) => setCapsulesPerBottle(e.target.value)}
              />
            </Field>
            <Field label={WEIGHT_FIELD_LABEL[direction]}>
              <input type="number" step="0.1" className={INPUT_CLASS} value={avgWeightMg} onChange={(e) => setAvgWeightMg(e.target.value)} />
            </Field>
            <Field label={QUANTITY_FIELD_LABEL[direction]}>
              <input type="number" step="0.001" className={INPUT_CLASS} value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
            </Field>
          </div>

          {preview && (
            <div
              className={cn(
                "grid gap-3 rounded-lg border border-border bg-surface-sunken/60 p-3 text-center",
                tileCount === 3 ? "grid-cols-3" : "grid-cols-2"
              )}
            >
              {kgLabel && (
                <div>
                  <p className="font-mono-tabular text-lg font-semibold text-foreground">{formatKg(preview.resultKg)} kg</p>
                  <p className="text-xs text-muted">{kgLabel}</p>
                </div>
              )}
              {showCapsulesTile && (
                <div>
                  <p className="font-mono-tabular text-lg font-semibold text-foreground">{formatWholeCount(preview.resultCapsules)}</p>
                  <p className="text-xs text-muted">Capsules</p>
                </div>
              )}
              <div>
                <p className="font-mono-tabular text-lg font-semibold text-foreground">{formatWholeCount(preview.resultBottles)}</p>
                <p className="text-xs text-muted">{CONTAINER_RESULT_LABEL[direction]}</p>
              </div>
            </div>
          )}

          {error && <p className="rounded-lg bg-status-critical-soft px-3 py-2 text-sm text-status-critical">{error}</p>}

          <div className="flex justify-end">
            <Button size="sm" onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Calculate & Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Calculation Log</CardTitle>
            <CardDescription>{calculations.length} run{calculations.length === 1 ? "" : "s"}, most recent first</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {calculations.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No calculations yet — run your first one above.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHead>
                  <TableRow className="hover:bg-transparent">
                    <TableHeaderCell>Product / Batch</TableHeaderCell>
                    <TableHeaderCell>Type</TableHeaderCell>
                    <TableHeaderCell>Input</TableHeaderCell>
                    <TableHeaderCell>Kg</TableHeaderCell>
                    <TableHeaderCell>Capsules</TableHeaderCell>
                    <TableHeaderCell>Bottles / Boxes</TableHeaderCell>
                    <TableHeaderCell>By</TableHeaderCell>
                    <TableHeaderCell></TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {calculations.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-foreground">
                        {c.productName ?? "—"}
                        <div className="mt-0.5 text-xs text-muted">
                          {[c.batchNumber && `Batch #${c.batchNumber}`, c.label].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge tone={DIRECTION_TONE[c.direction]}>{DIRECTION_LABEL[c.direction]}</Badge>
                      </TableCell>
                      <TableCell className="text-muted">
                        {c.direction === "BOTTLES_TO_KG"
                          ? `${formatWholeCount(c.inputValue)} bottles`
                          : c.direction === "CAPSULES_TO_SHELLS"
                            ? `${formatWholeCount(c.inputValue)} capsules`
                            : `${formatKg(c.inputValue)} kg`}
                        <br />
                        <span className="text-xs">
                          {c.capsulesPerBottle}/{c.direction === "CAPSULES_TO_SHELLS" ? "box" : "bottle"}, {c.avgWeightMg}mg {weightKind(c.direction)}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono-tabular">{formatKg(c.resultKg)}</TableCell>
                      <TableCell className="font-mono-tabular">{formatWholeCount(c.resultCapsules)}</TableCell>
                      <TableCell className="font-mono-tabular">
                        {formatWholeCount(c.resultBottles)}
                        <span className="ml-1 font-sans text-[10px] text-muted">{CONTAINER_RESULT_LABEL[c.direction].toLowerCase()}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted">
                        {c.createdByName}
                        <br />
                        {c.createdAtLabel}
                      </TableCell>
                      <TableCell>
                        <button onClick={() => remove(c.id)} disabled={pending} className="text-xs font-medium text-status-critical hover:opacity-80">
                          Delete
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
