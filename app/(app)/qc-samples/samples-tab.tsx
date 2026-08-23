"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { QcSampleType, QcProductCategory } from "@/app/generated/prisma/client";
import { QC_SAMPLE_STATUS_META } from "@/lib/status";
import { SAMPLE_TYPE_LABEL, PRODUCT_CATEGORY_LABEL, timeUntilExpiryLabel } from "@/lib/qc-sample-defaults";
import { createQcSample } from "@/lib/actions/qc-sample-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { QcSampleRow, MfgBatchOption } from "./qc-samples-client";

const SAMPLE_TYPES: QcSampleType[] = ["FINISHED_PRODUCT", "STABILITY", "RETENTION", "INVESTIGATION", "COMPLAINT"];
const PRODUCT_CATEGORIES: QcProductCategory[] = ["CAPSULE", "GUMMY"];

export const inputClass = "mt-1.5 block w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-strong">{label}</span>
      {children}
    </label>
  );
}

type NewSampleState = {
  mfgBatchId: string;
  productName: string;
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  sampleType: QcSampleType;
  productCategory: QcProductCategory | "";
  quantity: string;
  unit: string;
  collectionDate: string;
  collectionTime: string;
  productionRoom: string;
  sampleStorageLocation: string;
  storageTemperature: string;
  storageCondition: string;
  remarks: string;
};

function initialSampleState(): NewSampleState {
  return {
    mfgBatchId: "",
    productName: "",
    batchNumber: "",
    manufacturingDate: "",
    expiryDate: "",
    sampleType: "FINISHED_PRODUCT",
    productCategory: "",
    quantity: "",
    unit: "",
    collectionDate: new Date().toISOString().slice(0, 10),
    collectionTime: new Date().toTimeString().slice(0, 5),
    productionRoom: "",
    sampleStorageLocation: "",
    storageTemperature: "",
    storageCondition: "",
    remarks: "",
  };
}

function NewSampleModal({ mfgBatches, onClose }: { mfgBatches: MfgBatchOption[]; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState<NewSampleState>(initialSampleState);

  function pickMfgBatch(id: string) {
    const b = mfgBatches.find((m) => m.id === id);
    setForm((f) => ({ ...f, mfgBatchId: id, ...(b ? { productName: b.productName, batchNumber: b.batchNumber } : {}) }));
  }

  function save() {
    setError("");
    if (!form.productName || !form.batchNumber || !form.unit || !form.quantity) {
      setError("Product, batch number, quantity, and unit are required.");
      return;
    }
    startTransition(async () => {
      try {
        await createQcSample({
          productName: form.productName,
          batchNumber: form.batchNumber,
          mfgBatchId: form.mfgBatchId || null,
          manufacturingDate: form.manufacturingDate || null,
          expiryDate: form.expiryDate || null,
          sampleType: form.sampleType,
          productCategory: form.productCategory || null,
          quantity: Number(form.quantity),
          unit: form.unit,
          collectionDate: form.collectionDate || null,
          collectionTime: form.collectionTime || null,
          productionRoom: form.productionRoom || null,
          sampleStorageLocation: form.sampleStorageLocation || null,
          storageTemperature: form.storageTemperature || null,
          storageCondition: form.storageCondition || null,
          remarks: form.remarks || null,
        });
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save sample.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-lg)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Generate QC Sample</h2>
          <button type="button" onClick={onClose} className="text-muted transition-colors hover:text-foreground">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Batch Record (optional link)">
              <select className={inputClass} value={form.mfgBatchId} onChange={(e) => pickMfgBatch(e.target.value)}>
                <option value="">Free text instead...</option>
                {mfgBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchNumber} — {b.productName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Product">
              <input className={inputClass} value={form.productName} onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))} />
            </Field>
            <Field label="Batch Number">
              <input className={inputClass} value={form.batchNumber} onChange={(e) => setForm((f) => ({ ...f, batchNumber: e.target.value }))} />
            </Field>
            <Field label="Sample Type">
              <select className={inputClass} value={form.sampleType} onChange={(e) => setForm((f) => ({ ...f, sampleType: e.target.value as QcSampleType }))}>
                {SAMPLE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {SAMPLE_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Product Category">
              <select className={inputClass} value={form.productCategory} onChange={(e) => setForm((f) => ({ ...f, productCategory: e.target.value as QcProductCategory | "" }))}>
                <option value="">Select...</option>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {PRODUCT_CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Manufacturing Date">
              <input type="date" className={inputClass} value={form.manufacturingDate} onChange={(e) => setForm((f) => ({ ...f, manufacturingDate: e.target.value }))} />
            </Field>
            <Field label="Expiry Date">
              <input type="date" className={inputClass} value={form.expiryDate} onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))} />
            </Field>
            <Field label="Quantity">
              <input type="number" className={inputClass} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
            </Field>
            <Field label="Units">
              <input className={inputClass} placeholder="Bottles / Bags / Sachets" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
            </Field>
            <Field label="Collection Date">
              <input type="date" className={inputClass} value={form.collectionDate} onChange={(e) => setForm((f) => ({ ...f, collectionDate: e.target.value }))} />
            </Field>
            <Field label="Collection Time">
              <input type="time" className={inputClass} value={form.collectionTime} onChange={(e) => setForm((f) => ({ ...f, collectionTime: e.target.value }))} />
            </Field>
            <Field label="Production Room / Bay">
              <input className={inputClass} value={form.productionRoom} onChange={(e) => setForm((f) => ({ ...f, productionRoom: e.target.value }))} />
            </Field>
            <Field label="Sample Storage Location">
              <input className={inputClass} value={form.sampleStorageLocation} onChange={(e) => setForm((f) => ({ ...f, sampleStorageLocation: e.target.value }))} />
            </Field>
            <Field label="Storage Temperature">
              <input className={inputClass} value={form.storageTemperature} onChange={(e) => setForm((f) => ({ ...f, storageTemperature: e.target.value }))} />
            </Field>
            <Field label="Storage Condition">
              <input className={inputClass} value={form.storageCondition} onChange={(e) => setForm((f) => ({ ...f, storageCondition: e.target.value }))} />
            </Field>
          </div>
          <Field label="Remarks">
            <textarea className={inputClass} rows={2} value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} />
          </Field>

          {error && <p className="rounded-lg bg-status-critical-soft px-3 py-2 text-sm text-status-critical">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Generate Sample"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SamplesTab({
  samples,
  mfgBatches,
  canCollect,
  onSelect,
}: {
  samples: QcSampleRow[];
  mfgBatches: MfgBatchOption[];
  canCollect: boolean;
  onSelect: (id: string) => void;
}) {
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [collectionDateFilter, setCollectionDateFilter] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return samples.filter((s) => {
      if (q) {
        const haystack = `${s.sampleId} ${s.productName} ${s.batchNumber} ${s.collectedByName ?? ""} ${s.productionRoom ?? ""} ${s.sampleStorageLocation ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (statusFilter && s.status !== statusFilter) return false;
      if (typeFilter && s.sampleType !== typeFilter) return false;
      if (collectionDateFilter && s.collectionDate?.slice(0, 10) !== collectionDateFilter) return false;
      return true;
    });
  }, [samples, search, statusFilter, typeFilter, collectionDateFilter]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs font-medium text-muted-strong">Search</label>
                <input
                  className={inputClass}
                  placeholder="Product, batch, sample ID, analyst, location…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: 260 }}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-strong">Status</label>
                <select className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All statuses</option>
                  {Object.entries(QC_SAMPLE_STATUS_META).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-strong">Type</label>
                <select className={inputClass} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="">All types</option>
                  {Object.entries(SAMPLE_TYPE_LABEL).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-strong">Collection Date</label>
                <input type="date" className={inputClass} value={collectionDateFilter} onChange={(e) => setCollectionDateFilter(e.target.value)} />
              </div>
            </div>
            {canCollect && (
              <Button size="sm" onClick={() => setShowNew(true)}>
                + Generate Sample
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No samples match — adjust your filters or generate a new QC sample.</p>
          ) : (
            <Table className="min-w-[920px]">
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeaderCell>Sample ID</TableHeaderCell>
                  <TableHeaderCell>Product</TableHeaderCell>
                  <TableHeaderCell>Batch</TableHeaderCell>
                  <TableHeaderCell>Type</TableHeaderCell>
                  <TableHeaderCell>Collection Date</TableHeaderCell>
                  <TableHeaderCell>Analyst</TableHeaderCell>
                  <TableHeaderCell>Time to Expiry</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((s) => {
                  const meta = QC_SAMPLE_STATUS_META[s.status];
                  const expired = !!s.expiryDate && new Date(s.expiryDate) < new Date();
                  return (
                    <TableRow key={s.id} className="cursor-pointer" onClick={() => onSelect(s.id)}>
                      <TableCell className="font-medium text-foreground">{s.sampleId}</TableCell>
                      <TableCell>{s.productName}</TableCell>
                      <TableCell className="text-muted-strong">{s.batchNumber}</TableCell>
                      <TableCell>{SAMPLE_TYPE_LABEL[s.sampleType]}</TableCell>
                      <TableCell className="text-muted-strong">{s.collectionDate ? new Date(s.collectionDate).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="text-muted-strong">{s.collectedByName ?? "—"}</TableCell>
                      <TableCell className={expired ? "text-status-critical" : "text-muted-strong"}>{timeUntilExpiryLabel(s.expiryDate)}</TableCell>
                      <TableCell>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showNew && <NewSampleModal mfgBatches={mfgBatches} onClose={() => setShowNew(false)} />}
    </div>
  );
}
