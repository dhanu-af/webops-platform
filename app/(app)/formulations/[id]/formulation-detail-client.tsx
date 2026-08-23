"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteFormulation } from "@/lib/actions/formulation-actions";
import { calculateBatch, canConvertUnit, unitOptionsFor } from "@/lib/formulation-calc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Field, MFG_INPUT_CLASS } from "@/components/mfg/field";
import IngredientModal from "./ingredient-modal";

type Ingredient = {
  id: string;
  rmNumber: string | null;
  ingredientName: string;
  uin: string | null;
  baseQty: number;
  tolerancePct: number;
  controlStatus: string | null;
  changeControlRef: string | null;
  approvedBy: string | null;
  comments: string | null;
};

type Formulation = {
  id: string;
  productName: string;
  folderName: string;
  baseBatchSize: number;
  baseUnit: string;
  ingredients: Ingredient[];
};

export default function FormulationDetailClient({
  canManage,
  enteredByDefault,
  todayStr,
  formulation,
}: {
  canManage: boolean;
  enteredByDefault: string;
  todayStr: string;
  formulation: Formulation;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [openIngredientName, setOpenIngredientName] = useState<string | null>(null);

  const canConvert = canConvertUnit(formulation.baseUnit);
  const unitOptions = unitOptionsFor(formulation.baseUnit);

  const [requiredBatchSize, setRequiredBatchSize] = useState(formulation.baseBatchSize);
  const [calcUnit, setCalcUnit] = useState(canConvert ? formulation.baseUnit.trim().toLowerCase() : formulation.baseUnit);
  const [batchNumber, setBatchNumber] = useState("");
  const [enteredBy, setEnteredBy] = useState(enteredByDefault);
  const [checkedBy, setCheckedBy] = useState("");
  const [calcDate, setCalcDate] = useState(todayStr);

  const totalQty = formulation.ingredients.reduce((s, i) => s + i.baseQty, 0);

  const { rows: batchRows, batchTotal } = useMemo(
    () => calculateBatch(formulation.ingredients, formulation.baseUnit, requiredBatchSize, calcUnit),
    [formulation.ingredients, formulation.baseUnit, requiredBatchSize, calcUnit]
  );

  function remove() {
    if (!confirm(`Delete formulation "${formulation.productName}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteFormulation(formulation.id);
      router.push("/formulations");
    });
  }

  function downloadPdf() {
    const params = new URLSearchParams({
      batchSize: String(requiredBatchSize),
      unit: calcUnit,
      batchNumber,
      enteredBy,
      checkedBy,
      calcDate,
    });
    window.open(`/api/formulations/${formulation.id}/pdf?${params.toString()}`, "_blank");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted">
            <Link href="/formulations" className="hover:underline">
              Formulation Manager
            </Link>{" "}
            / {formulation.folderName}
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{formulation.productName}</h1>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={downloadPdf}>
            Download PDF
          </Button>
          {canManage && (
            <>
              <Button size="sm" variant="secondary" href={`/formulations/${formulation.id}/edit`}>
                Edit
              </Button>
              <Button size="sm" variant="destructive" onClick={remove} disabled={pending}>
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardContent>
          <h2 className="mb-3 text-[15px] font-semibold text-foreground">Master Formulation — Controlled Percentage Basis</h2>
          <p className="mb-3 text-sm text-muted">
            Base Batch Size:{" "}
            <span className="font-medium text-foreground">
              {formulation.baseBatchSize.toFixed(2)} {formulation.baseUnit}
            </span>
          </p>
        </CardContent>
        <div className="overflow-x-auto">
          <Table className="min-w-[1000px]">
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableHeaderCell>No.</TableHeaderCell>
                <TableHeaderCell>RM Number</TableHeaderCell>
                <TableHeaderCell>Ingredient</TableHeaderCell>
                <TableHeaderCell>UIN</TableHeaderCell>
                <TableHeaderCell>Base Qty ({formulation.baseUnit})</TableHeaderCell>
                <TableHeaderCell>% w/w</TableHeaderCell>
                <TableHeaderCell>Control Status</TableHeaderCell>
                <TableHeaderCell>Change Control Ref</TableHeaderCell>
                <TableHeaderCell>Approved By</TableHeaderCell>
                <TableHeaderCell>Comments</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {formulation.ingredients.map((ing, i) => (
                <TableRow key={ing.id} className="hover:bg-transparent">
                  <TableCell className="text-muted">{i + 1}</TableCell>
                  <TableCell className="text-muted">{ing.rmNumber ?? "—"}</TableCell>
                  <TableCell className="text-foreground">
                    <button
                      type="button"
                      onClick={() => setOpenIngredientName(ing.ingredientName)}
                      className="text-left underline decoration-dotted underline-offset-2 hover:text-accent"
                    >
                      {ing.ingredientName}
                    </button>
                  </TableCell>
                  <TableCell className="text-muted">{ing.uin ?? "—"}</TableCell>
                  <TableCell className="text-muted">{ing.baseQty.toFixed(2)}</TableCell>
                  <TableCell className="text-muted">{totalQty > 0 ? ((ing.baseQty / totalQty) * 100).toFixed(4) : "0.0000"}%</TableCell>
                  <TableCell className="text-muted">{ing.controlStatus ?? "—"}</TableCell>
                  <TableCell className="text-muted">{ing.changeControlRef ?? "—"}</TableCell>
                  <TableCell className="text-muted">{ing.approvedBy ?? "—"}</TableCell>
                  <TableCell className="text-muted">{ing.comments ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-sm font-semibold text-foreground">
            <span>TOTAL</span>
            <span>
              {totalQty.toFixed(2)} {formulation.baseUnit} — 100.0000%
            </span>
          </div>
        </div>
      </Card>

      <Card>
        <CardContent>
          <h2 className="mb-3 text-[15px] font-semibold text-foreground">Batch Calculator</h2>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Field label="Required Batch Size">
              <div className="flex gap-1.5">
                <input
                  type="number"
                  step="0.001"
                  value={requiredBatchSize}
                  onChange={(e) => setRequiredBatchSize(Number(e.target.value))}
                  className={`${MFG_INPUT_CLASS} min-w-0 flex-1`}
                />
                <select
                  value={calcUnit}
                  onChange={(e) => setCalcUnit(e.target.value)}
                  disabled={!canConvert}
                  className={`${MFG_INPUT_CLASS} shrink-0`}
                  style={{ width: "5.5rem" }}
                >
                  {unitOptions.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              {canConvert && calcUnit !== formulation.baseUnit.trim().toLowerCase() && (
                <span className="mt-1 block text-[11px] text-muted">
                  Formulation is authored in {formulation.baseUnit} — auto-converted to {calcUnit}.
                </span>
              )}
            </Field>
            <Field label="Batch Number">
              <input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} className={MFG_INPUT_CLASS} />
            </Field>
            <Field label="Entered By">
              <input value={enteredBy} onChange={(e) => setEnteredBy(e.target.value)} className={MFG_INPUT_CLASS} />
            </Field>
            <Field label="Checked By">
              <input value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} className={MFG_INPUT_CLASS} />
            </Field>
            <Field label="Calculation Date">
              <input type="date" value={calcDate} onChange={(e) => setCalcDate(e.target.value)} className={MFG_INPUT_CLASS} />
            </Field>
          </div>
        </CardContent>

        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableHeaderCell>No.</TableHeaderCell>
                <TableHeaderCell>Ingredient</TableHeaderCell>
                <TableHeaderCell>Controlled % w/w</TableHeaderCell>
                <TableHeaderCell>Calculated Qty ({calcUnit})</TableHeaderCell>
                <TableHeaderCell>Rounded Qty ({calcUnit})</TableHeaderCell>
                <TableHeaderCell>Tolerance %</TableHeaderCell>
                <TableHeaderCell>Min Qty</TableHeaderCell>
                <TableHeaderCell>Max Qty</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {batchRows.map((r, i) => (
                <TableRow key={r.id} className="hover:bg-transparent">
                  <TableCell className="text-muted">{i + 1}</TableCell>
                  <TableCell className="text-foreground">{r.ingredientName}</TableCell>
                  <TableCell className="text-muted">{(r.pctWw * 100).toFixed(4)}%</TableCell>
                  <TableCell className="text-muted">{r.calculatedQty.toFixed(3)}</TableCell>
                  <TableCell className="text-foreground">{r.roundedQty.toFixed(2)}</TableCell>
                  <TableCell className="text-muted">{r.tolerancePct.toFixed(2)}%</TableCell>
                  <TableCell className="text-muted">{r.minQty.toFixed(3)}</TableCell>
                  <TableCell className="text-muted">{r.maxQty.toFixed(3)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-sm font-semibold text-foreground">
            <span>TOTAL</span>
            <span>
              {batchTotal.toFixed(2)} {calcUnit}
            </span>
          </div>
        </div>
      </Card>

      {openIngredientName && <IngredientModal ingredientName={openIngredientName} onClose={() => setOpenIngredientName(null)} />}
    </div>
  );
}
