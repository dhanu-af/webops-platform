"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDispatchEvent, deleteDispatchEvent } from "@/lib/actions/mfg-reconciliation";
import { Field, MFG_INPUT_CLASS } from "@/components/mfg/field";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export type DispatchEventData = {
  id: string;
  customer: string;
  salesOrder: string | null;
  batchNumber: string | null;
  expiryDate: string | null;
  casesDispatched: number | null;
  bottlesDispatched: number | null;
  dispatchDate: string | null;
  remainingStockAfter: number | null;
  dispatchedByName: string | null;
  remarks: string | null;
};

export function DispatchSection({ batchId, events, canManage }: { batchId: string; events: DispatchEventData[]; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [customer, setCustomer] = useState("");
  const [salesOrder, setSalesOrder] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [casesDispatched, setCasesDispatched] = useState("");
  const [bottlesDispatched, setBottlesDispatched] = useState("");
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [remainingStockAfter, setRemainingStockAfter] = useState("");
  const [remarks, setRemarks] = useState("");

  function reset() {
    setCustomer("");
    setSalesOrder("");
    setBatchNumber("");
    setExpiryDate("");
    setCasesDispatched("");
    setBottlesDispatched("");
    setDispatchDate(new Date().toISOString().slice(0, 10));
    setRemainingStockAfter("");
    setRemarks("");
  }

  function save() {
    setError("");
    if (!customer) return setError("Customer is required.");
    startTransition(async () => {
      try {
        await addDispatchEvent(batchId, {
          customer,
          salesOrder: salesOrder || null,
          batchNumber: batchNumber || null,
          expiryDate: expiryDate || null,
          casesDispatched: casesDispatched ? Number(casesDispatched) : null,
          bottlesDispatched: bottlesDispatched ? Number(bottlesDispatched) : null,
          dispatchDate: dispatchDate || null,
          remainingStockAfter: remainingStockAfter ? Number(remainingStockAfter) : null,
          remarks: remarks || null,
        });
        reset();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save.");
      }
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this dispatch event?")) return;
    startTransition(async () => {
      try {
        await deleteDispatchEvent(batchId, id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't delete.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Dispatch History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No dispatch events recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[1000px]">
                <TableHead>
                  <TableRow className="hover:bg-transparent">
                    <TableHeaderCell>Customer</TableHeaderCell>
                    <TableHeaderCell>Sales Order</TableHeaderCell>
                    <TableHeaderCell>Batch No.</TableHeaderCell>
                    <TableHeaderCell>Expiry</TableHeaderCell>
                    <TableHeaderCell>Cases</TableHeaderCell>
                    <TableHeaderCell>Bottles</TableHeaderCell>
                    <TableHeaderCell>Dispatch Date</TableHeaderCell>
                    <TableHeaderCell>Remaining</TableHeaderCell>
                    <TableHeaderCell>By</TableHeaderCell>
                    {canManage && <TableHeaderCell></TableHeaderCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {events.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium text-foreground">{d.customer}</TableCell>
                      <TableCell>{d.salesOrder ?? "—"}</TableCell>
                      <TableCell>{d.batchNumber ?? "—"}</TableCell>
                      <TableCell>{d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>{d.casesDispatched ?? "—"}</TableCell>
                      <TableCell>{d.bottlesDispatched ?? "—"}</TableCell>
                      <TableCell>{d.dispatchDate ? new Date(d.dispatchDate).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>{d.remainingStockAfter ?? "—"}</TableCell>
                      <TableCell className="text-muted">{d.dispatchedByName ?? "—"}</TableCell>
                      {canManage && (
                        <TableCell>
                          <button type="button" onClick={() => remove(d.id)} disabled={pending} className="text-xs font-medium text-status-critical hover:opacity-80">
                            Delete
                          </button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Record a Dispatch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Customer">
                <input className={MFG_INPUT_CLASS} value={customer} onChange={(e) => setCustomer(e.target.value)} />
              </Field>
              <Field label="Sales Order">
                <input className={MFG_INPUT_CLASS} value={salesOrder} onChange={(e) => setSalesOrder(e.target.value)} />
              </Field>
              <Field label="Batch Number">
                <input className={MFG_INPUT_CLASS} value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
              </Field>
              <Field label="Expiry Date">
                <input type="date" className={MFG_INPUT_CLASS} value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              </Field>
              <Field label="Cases Dispatched">
                <input type="number" className={MFG_INPUT_CLASS} value={casesDispatched} onChange={(e) => setCasesDispatched(e.target.value)} />
              </Field>
              <Field label="Bottles Dispatched">
                <input type="number" className={MFG_INPUT_CLASS} value={bottlesDispatched} onChange={(e) => setBottlesDispatched(e.target.value)} />
              </Field>
              <Field label="Dispatch Date">
                <input type="date" className={MFG_INPUT_CLASS} value={dispatchDate} onChange={(e) => setDispatchDate(e.target.value)} />
              </Field>
              <Field label="Remaining Stock After">
                <input type="number" className={MFG_INPUT_CLASS} value={remainingStockAfter} onChange={(e) => setRemainingStockAfter(e.target.value)} />
              </Field>
            </div>
            <Field label="Remarks">
              <textarea className={MFG_INPUT_CLASS} rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </Field>

            {error && <p className="text-xs text-status-critical">{error}</p>}

            <div className="flex justify-end">
              <Button size="sm" onClick={save} disabled={pending}>
                {pending ? "Saving…" : "Record Dispatch"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
