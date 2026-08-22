"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MFG_BATCH_STATUS_LABEL } from "@/lib/mfg-reconciliation";
import { createMfgBatch } from "@/lib/actions/mfg-reconciliation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Field, MFG_INPUT_CLASS } from "@/components/mfg/field";
import type { MfgBatchRow } from "./mfg-reconciliation-client";

function NewBatchModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [productName, setProductName] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [formulationReference, setFormulationReference] = useState("");

  function save() {
    setError("");
    if (!productName || !batchNumber) return setError("Product name and batch number are required.");
    startTransition(async () => {
      try {
        const id = await createMfgBatch({ productName, batchNumber, formulationReference: formulationReference || null });
        router.push(`/mfg-reconciliation/${id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't create batch.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow-md)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">New Manufacturing Batch</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-foreground">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Product">
              <input className={MFG_INPUT_CLASS} value={productName} onChange={(e) => setProductName(e.target.value)} />
            </Field>
            <Field label="Batch Number">
              <input className={MFG_INPUT_CLASS} value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
            </Field>
            <Field label="Formulation/BOM Reference (optional)">
              <input className={MFG_INPUT_CLASS} placeholder="e.g. FORM-0042" value={formulationReference} onChange={(e) => setFormulationReference(e.target.value)} />
            </Field>
          </div>

          {error && <p className="text-xs text-status-critical">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={pending}>
              {pending ? "Creating…" : "Create Batch"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BatchesTab({ batches, canManage }: { batches: MfgBatchRow[]; canManage: boolean }) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return batches.filter((b) => {
      if (q && !`${b.batchNumber} ${b.productName}`.toLowerCase().includes(q)) return false;
      if (statusFilter && b.status !== statusFilter) return false;
      return true;
    });
  }, [batches, search, statusFilter]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <input className={`${MFG_INPUT_CLASS} w-64`} placeholder="Search product or batch number…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className={`${MFG_INPUT_CLASS} w-40`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {Object.entries(MFG_BATCH_STATUS_LABEL).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setShowNew(true)}>
            + New Batch
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No batches match — adjust your filters or create a new manufacturing batch.</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableRow className="hover:bg-transparent">
                    <TableHeaderCell>Batch Number</TableHeaderCell>
                    <TableHeaderCell>Product</TableHeaderCell>
                    <TableHeaderCell>Created</TableHeaderCell>
                    <TableHeaderCell>QA Released</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((b) => (
                    <TableRow key={b.id} onClick={() => router.push(`/mfg-reconciliation/${b.id}`)} className="cursor-pointer">
                      <TableCell className="font-medium text-foreground">{b.batchNumber}</TableCell>
                      <TableCell>{b.productName}</TableCell>
                      <TableCell className="text-muted">{new Date(b.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{b.qaReleased ? "Yes" : "—"}</TableCell>
                      <TableCell>
                        <Badge tone={b.status === "COMPLETED" ? "pass" : "accent"}>{MFG_BATCH_STATUS_LABEL[b.status]}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {showNew && <NewBatchModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
