"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  createCalculation,
  updateCalculation,
  deleteCalculation,
  createCalculationFolder,
  deleteCalculationFolder,
  moveCalculationToFolder,
} from "@/lib/actions/capsule-calculations";
import {
  CALCULATION_DIRECTIONS,
  DIRECTION_LABEL,
  WEIGHT_FIELD_LABEL,
  QUANTITY_FIELD_LABEL,
  PER_CONTAINER_LABEL,
  showsPerContainerField,
  CONTAINER_RESULT_LABEL,
  PIECES_LABEL,
  DEFAULT_PER_CONTAINER,
  DEFAULT_AVG_WEIGHT_DISPLAY,
  weightFieldUnit,
  toAvgWeightMg,
  fromAvgWeightMg,
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
  folderId: string | null;
  createdByName: string;
  createdAtLabel: string;
};

export type FolderRow = { id: string; name: string };

const DIRECTION_TONE: Record<CalculationDirection, StatusTone> = {
  BOTTLES_TO_KG: "accent",
  KG_TO_OUTPUT: "neutral",
  BAGGED_KG_TO_OUTPUT: "pass",
  CAPSULES_TO_SHELLS: "warn",
  KG_TO_GUMMY_POUCHES: "pass",
  KG_TO_GUMMY_BOTTLES: "attention",
  KG_TO_POUCHES_BY_WEIGHT: "neutral",
  POUCHES_TO_KG_BY_WEIGHT: "accent",
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

export function CalculationClient({ calculations, folders }: { calculations: CalculationRow[]; folders: FolderRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // "all" | "none" (uncategorized) | a folder id -- which slice of the log
  // is shown below. Folders are a pure display filter, not a separate data
  // fetch -- the full log is already loaded, so switching folders is
  // instant with no extra round trip.
  const [activeFolder, setActiveFolder] = useState<string>("all");
  const [direction, setDirection] = useState<CalculationDirection>("BOTTLES_TO_KG");
  const [label, setLabel] = useState("");
  const [productName, setProductName] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  // Pre-filled with the facility's common values for the selected direction,
  // still fully editable -- most runs use the same per-container count/fill
  // weight, so this saves re-typing them every time without locking the
  // fields. Re-seeded (not preserved) when the direction changes, since a
  // capsule count/weight doesn't carry any meaning once you switch to a
  // gummy direction and vice versa.
  const [capsulesPerBottle, setCapsulesPerBottle] = useState(DEFAULT_PER_CONTAINER.BOTTLES_TO_KG);
  // In the selected direction's own display unit (see weightFieldUnit) --
  // mg for capsules, grams for gummies. Converted to milligrams via
  // toAvgWeightMg right before it's used in a calculation or saved.
  const [avgWeightDisplay, setAvgWeightDisplay] = useState(DEFAULT_AVG_WEIGHT_DISPLAY.BOTTLES_TO_KG);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");
  // Set while editing an existing logged row instead of creating a new one
  // -- the same form above doubles as the edit form; "Calculate & Save"
  // becomes "Save Changes" and a "Cancel" button appears (see save()/
  // startEdit()/cancelEdit() below).
  const [editingId, setEditingId] = useState<string | null>(null);

  function selectDirection(d: CalculationDirection) {
    setDirection(d);
    setCapsulesPerBottle(DEFAULT_PER_CONTAINER[d]);
    setAvgWeightDisplay(DEFAULT_AVG_WEIGHT_DISPLAY[d]);
  }

  function resetForm() {
    setEditingId(null);
    setDirection("BOTTLES_TO_KG");
    setLabel("");
    setProductName("");
    setBatchNumber("");
    setCapsulesPerBottle(DEFAULT_PER_CONTAINER.BOTTLES_TO_KG);
    setAvgWeightDisplay(DEFAULT_AVG_WEIGHT_DISPLAY.BOTTLES_TO_KG);
    setInputValue("");
    setError("");
  }

  function startEdit(c: CalculationRow) {
    setEditingId(c.id);
    setDirection(c.direction);
    setLabel(c.label ?? "");
    setProductName(c.productName ?? "");
    setBatchNumber(c.batchNumber ?? "");
    setCapsulesPerBottle(c.capsulesPerBottle.toString());
    setAvgWeightDisplay(fromAvgWeightMg(c.direction, c.avgWeightMg).toString());
    setInputValue(c.inputValue.toString());
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const capsulesPerBottleNum = Number(capsulesPerBottle);
  const avgWeightDisplayNum = Number(avgWeightDisplay);
  const avgWeightMgNum = toAvgWeightMg(direction, avgWeightDisplayNum);
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

    const payload = {
      direction,
      label: label || null,
      productName: productName || null,
      batchNumber: batchNumber || null,
      capsulesPerBottle: capsulesPerBottleNum,
      avgWeightMg: avgWeightMgNum,
      inputValue: inputValueNum,
    };

    startTransition(async () => {
      try {
        if (editingId) {
          await updateCalculation(editingId, payload);
          resetForm();
        } else {
          await createCalculation(payload);
          setLabel("");
          setProductName("");
          setBatchNumber("");
          setInputValue("");
        }
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
        if (id === editingId) resetForm();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't delete.");
      }
    });
  }

  function moveToFolder(id: string, folderId: string | null) {
    startTransition(async () => {
      try {
        await moveCalculationToFolder(id, folderId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't move calculation.");
      }
    });
  }

  function newFolder() {
    const name = window.prompt("New folder name (e.g. \"Capsules\", \"August 2026\"):");
    if (!name || !name.trim()) return;
    startTransition(async () => {
      try {
        const id = await createCalculationFolder(name);
        setActiveFolder(id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't create folder.");
      }
    });
  }

  function removeFolder(id: string, name: string) {
    if (!confirm(`Delete the "${name}" folder? Its calculations stay in the log, just uncategorized.`)) return;
    startTransition(async () => {
      try {
        await deleteCalculationFolder(id);
        if (activeFolder === id) setActiveFolder("all");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't delete folder.");
      }
    });
  }

  const visibleCalculations = calculations.filter((c) => {
    if (activeFolder === "all") return true;
    if (activeFolder === "none") return !c.folderId;
    return c.folderId === activeFolder;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Calculation</h1>
        <p className="text-sm text-muted">
          Capsule/bottle and gummy/pouch ↔ kg production planning math. Theoretical figures only — no allowance for spillage, rejects, QC samples, or
          process yield loss; use the batch&apos;s actual final weight as the input to account for that.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4">
          {editingId && (
            <div className="flex items-center justify-between rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-strong">
              <span>Editing a logged calculation — changes replace the original entry.</span>
              <button type="button" onClick={resetForm} className="text-xs font-medium underline hover:opacity-80">
                Cancel
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {CALCULATION_DIRECTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => selectDirection(d)}
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
            {showsPerContainerField(direction) && (
              <Field label={PER_CONTAINER_LABEL[direction]}>
                <input
                  type="number"
                  className={INPUT_CLASS}
                  value={capsulesPerBottle}
                  onChange={(e) => setCapsulesPerBottle(e.target.value)}
                />
              </Field>
            )}
            <Field label={WEIGHT_FIELD_LABEL[direction]}>
              <input type="number" step="0.1" className={INPUT_CLASS} value={avgWeightDisplay} onChange={(e) => setAvgWeightDisplay(e.target.value)} />
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
                  <p className="text-xs text-muted">{PIECES_LABEL[direction]}</p>
                </div>
              )}
              <div>
                <p className="font-mono-tabular text-lg font-semibold text-foreground">{formatWholeCount(preview.resultBottles)}</p>
                <p className="text-xs text-muted">{CONTAINER_RESULT_LABEL[direction]}</p>
              </div>
            </div>
          )}

          {error && <p className="rounded-lg bg-status-critical-soft px-3 py-2 text-sm text-status-critical">{error}</p>}

          <div className="flex justify-end gap-2">
            {editingId && (
              <Button size="sm" variant="secondary" onClick={resetForm} disabled={pending}>
                Cancel
              </Button>
            )}
            <Button size="sm" onClick={save} disabled={pending}>
              {pending ? "Saving…" : editingId ? "Save Changes" : "Calculate & Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Calculation Log</CardTitle>
            <CardDescription>
              {visibleCalculations.length} of {calculations.length} run{calculations.length === 1 ? "" : "s"}, most recent first
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-0">
          <div className="flex flex-wrap items-center gap-2 px-6 pt-2">
            <button
              type="button"
              onClick={() => setActiveFolder("all")}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                activeFolder === "all" ? "border-accent/40 bg-accent-soft text-accent-strong" : "border-border-strong text-muted-strong hover:bg-surface-sunken"
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveFolder("none")}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                activeFolder === "none" ? "border-accent/40 bg-accent-soft text-accent-strong" : "border-border-strong text-muted-strong hover:bg-surface-sunken"
              )}
            >
              Uncategorized
            </button>
            {folders.map((f) => (
              <div
                key={f.id}
                className={cn(
                  "flex items-center gap-1 rounded-full border pl-3 pr-1 py-1 text-xs font-medium transition-colors",
                  activeFolder === f.id ? "border-accent/40 bg-accent-soft text-accent-strong" : "border-border-strong text-muted-strong hover:bg-surface-sunken"
                )}
              >
                <button type="button" onClick={() => setActiveFolder(f.id)}>
                  📁 {f.name}
                </button>
                <button
                  type="button"
                  onClick={() => removeFolder(f.id, f.name)}
                  disabled={pending}
                  className="rounded-full px-1.5 text-muted hover:bg-status-critical-soft hover:text-status-critical"
                  aria-label={`Delete folder ${f.name}`}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={newFolder}
              disabled={pending}
              className="rounded-full border border-dashed border-border-strong px-3 py-1 text-xs font-medium text-muted-strong hover:bg-surface-sunken"
            >
              + New Folder
            </button>
          </div>

          {calculations.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No calculations yet — run your first one above.</p>
          ) : visibleCalculations.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">Nothing in this folder yet — move a calculation here from another folder.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHead>
                  <TableRow className="hover:bg-transparent">
                    <TableHeaderCell>Product / Batch</TableHeaderCell>
                    <TableHeaderCell>Type</TableHeaderCell>
                    <TableHeaderCell>Input</TableHeaderCell>
                    <TableHeaderCell>Kg</TableHeaderCell>
                    <TableHeaderCell>Pieces</TableHeaderCell>
                    <TableHeaderCell>Bottles / Boxes / Pouches</TableHeaderCell>
                    <TableHeaderCell>By</TableHeaderCell>
                    <TableHeaderCell></TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleCalculations.map((c) => (
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
                            : c.direction === "POUCHES_TO_KG_BY_WEIGHT"
                              ? `${formatWholeCount(c.inputValue)} pouches`
                              : `${formatKg(c.inputValue)} kg`}
                        <br />
                        <span className="text-xs">
                          {showsPerContainerField(c.direction) && (
                            <>
                              {c.capsulesPerBottle}/{c.direction === "CAPSULES_TO_SHELLS" ? "box" : c.direction === "KG_TO_GUMMY_POUCHES" ? "pouch" : "bottle"}
                              ,{" "}
                            </>
                          )}
                          {fromAvgWeightMg(c.direction, c.avgWeightMg)}
                          {weightFieldUnit(c.direction)} {weightKind(c.direction)}
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
                        <div className="space-y-1.5">
                          <select
                            value={c.folderId ?? ""}
                            onChange={(e) => moveToFolder(c.id, e.target.value || null)}
                            disabled={pending || folders.length === 0}
                            className="w-full rounded-md border border-border-strong bg-surface px-1.5 py-1 text-xs text-foreground outline-none focus:border-accent disabled:opacity-50"
                          >
                            <option value="">No folder</option>
                            {folders.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center gap-3">
                            <button onClick={() => startEdit(c)} disabled={pending} className="text-xs font-medium text-accent hover:opacity-80">
                              Edit
                            </button>
                            <button onClick={() => remove(c.id)} disabled={pending} className="text-xs font-medium text-status-critical hover:opacity-80">
                              Delete
                            </button>
                          </div>
                        </div>
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
