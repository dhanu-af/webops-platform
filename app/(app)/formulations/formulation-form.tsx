"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createFormulation, updateFormulation, type IngredientInput } from "@/lib/actions/formulation-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Field, MFG_INPUT_CLASS } from "@/components/mfg/field";

type FolderOption = { id: string; name: string };
type Row = IngredientInput & { key: string };

let keySeq = 0;
function newRow(): Row {
  keySeq += 1;
  return {
    key: `row-${keySeq}`,
    rmNumber: "",
    ingredientName: "",
    uin: "",
    baseQty: 0,
    tolerancePct: 2,
    controlStatus: "Approved",
    changeControlRef: "",
    approvedBy: "",
    comments: "",
  };
}

export default function FormulationForm({
  folders,
  defaultFolderId,
  existing,
}: {
  folders: FolderOption[];
  defaultFolderId?: string;
  existing?: {
    id: string;
    productName: string;
    folderId: string;
    baseUnit: string;
    ingredients: IngredientInput[];
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [folderId, setFolderId] = useState(existing?.folderId ?? defaultFolderId ?? folders[0]?.id ?? "");
  const [productName, setProductName] = useState(existing?.productName ?? "");
  const [baseUnit, setBaseUnit] = useState(existing?.baseUnit ?? "kg");
  const [rows, setRows] = useState<Row[]>(() =>
    existing && existing.ingredients.length > 0
      ? existing.ingredients.map((ing) => ({ ...ing, key: `row-${keySeq++}` }))
      : [newRow()]
  );

  const totalQty = useMemo(() => rows.reduce((s, r) => s + (Number(r.baseQty) || 0), 0), [rows]);

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, newRow()]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function submit() {
    setError(null);
    if (!productName.trim()) return setError("Product name is required");
    if (!folderId) return setError("Choose a folder");
    if (rows.length === 0) return setError("Add at least one ingredient");
    if (rows.some((r) => !r.ingredientName.trim())) return setError("Every ingredient needs a name");

    const payload = {
      folderId,
      productName: productName.trim(),
      baseUnit,
      ingredients: rows.map((r) => ({
        rmNumber: r.rmNumber,
        ingredientName: r.ingredientName,
        uin: r.uin,
        baseQty: Number(r.baseQty) || 0,
        tolerancePct: Number(r.tolerancePct) || 0,
        controlStatus: r.controlStatus,
        changeControlRef: r.changeControlRef,
        approvedBy: r.approvedBy,
        comments: r.comments,
      })),
    };

    startTransition(async () => {
      try {
        if (existing) {
          await updateFormulation(existing.id, payload);
          router.push(`/formulations/${existing.id}`);
        } else {
          const created = await createFormulation(payload);
          router.push(`/formulations/${created.id}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <h2 className="mb-3 text-[15px] font-semibold text-foreground">Master Formulation — Controlled Percentage Basis</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Product Name">
              <input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g. Bladder Support AU" className={MFG_INPUT_CLASS} />
            </Field>
            <Field label="Folder">
              <select value={folderId} onChange={(e) => setFolderId(e.target.value)} className={MFG_INPUT_CLASS}>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Unit">
              <input value={baseUnit} onChange={(e) => setBaseUnit(e.target.value)} className={MFG_INPUT_CLASS} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[1050px]">
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeaderCell>No.</TableHeaderCell>
                  <TableHeaderCell>RM Number</TableHeaderCell>
                  <TableHeaderCell>Ingredient</TableHeaderCell>
                  <TableHeaderCell>UIN</TableHeaderCell>
                  <TableHeaderCell>Base Qty ({baseUnit})</TableHeaderCell>
                  <TableHeaderCell>% w/w</TableHeaderCell>
                  <TableHeaderCell>Tolerance %</TableHeaderCell>
                  <TableHeaderCell>Control Status</TableHeaderCell>
                  <TableHeaderCell>Change Control Ref</TableHeaderCell>
                  <TableHeaderCell>Approved By</TableHeaderCell>
                  <TableHeaderCell>Comments</TableHeaderCell>
                  <TableHeaderCell></TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r, i) => {
                  const qty = Number(r.baseQty) || 0;
                  const pctWw = totalQty > 0 ? (qty / totalQty) * 100 : 0;
                  return (
                    <TableRow key={r.key} className="hover:bg-transparent">
                      <TableCell className="text-muted">{i + 1}</TableCell>
                      <TableCell>
                        <input value={r.rmNumber ?? ""} onChange={(e) => updateRow(r.key, { rmNumber: e.target.value })} className={MFG_INPUT_CLASS} style={{ width: "6rem" }} />
                      </TableCell>
                      <TableCell>
                        <input
                          value={r.ingredientName}
                          onChange={(e) => updateRow(r.key, { ingredientName: e.target.value })}
                          className={MFG_INPUT_CLASS}
                          style={{ width: "11rem" }}
                        />
                      </TableCell>
                      <TableCell>
                        <input value={r.uin ?? ""} onChange={(e) => updateRow(r.key, { uin: e.target.value })} className={MFG_INPUT_CLASS} style={{ width: "5rem" }} />
                      </TableCell>
                      <TableCell>
                        <input
                          type="number"
                          step="0.001"
                          value={r.baseQty}
                          onChange={(e) => updateRow(r.key, { baseQty: Number(e.target.value) })}
                          className={MFG_INPUT_CLASS}
                          style={{ width: "6rem" }}
                        />
                      </TableCell>
                      <TableCell className="text-muted">{pctWw.toFixed(4)}%</TableCell>
                      <TableCell>
                        <input
                          type="number"
                          step="0.1"
                          value={r.tolerancePct}
                          onChange={(e) => updateRow(r.key, { tolerancePct: Number(e.target.value) })}
                          className={MFG_INPUT_CLASS}
                          style={{ width: "4.5rem" }}
                        />
                      </TableCell>
                      <TableCell>
                        <input value={r.controlStatus ?? ""} onChange={(e) => updateRow(r.key, { controlStatus: e.target.value })} className={MFG_INPUT_CLASS} style={{ width: "6rem" }} />
                      </TableCell>
                      <TableCell>
                        <input
                          value={r.changeControlRef ?? ""}
                          onChange={(e) => updateRow(r.key, { changeControlRef: e.target.value })}
                          className={MFG_INPUT_CLASS}
                          style={{ width: "6rem" }}
                        />
                      </TableCell>
                      <TableCell>
                        <input value={r.approvedBy ?? ""} onChange={(e) => updateRow(r.key, { approvedBy: e.target.value })} className={MFG_INPUT_CLASS} style={{ width: "6rem" }} />
                      </TableCell>
                      <TableCell>
                        <input value={r.comments ?? ""} onChange={(e) => updateRow(r.key, { comments: e.target.value })} className={MFG_INPUT_CLASS} style={{ width: "8rem" }} />
                      </TableCell>
                      <TableCell>
                        <button onClick={() => removeRow(r.key)} className="text-xs font-medium text-status-critical hover:opacity-80">
                          Remove
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-sm font-semibold text-foreground">
            <span>TOTAL (Base Batch Size)</span>
            <span>
              {totalQty.toFixed(3)} {baseUnit} — {totalQty > 0 ? "100.0000%" : "—"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Button variant="secondary" size="sm" onClick={addRow}>
        + Add Ingredient
      </Button>

      {error && <p className="text-sm text-status-critical">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={pending}>
          {pending ? "Saving..." : "Save Formulation"}
        </Button>
      </div>
    </div>
  );
}
