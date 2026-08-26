"use client";

import { useState, useTransition } from "react";
import { createBatch } from "@/lib/actions/drying-room-actions";
import { Button } from "@/components/ui/button";
import { Field, MFG_INPUT_CLASS } from "@/components/mfg/field";
import type { Employee } from "./drying-room-client";

export default function AddBatchModal({ bayId, employees, onClose, onCreated }: { bayId: string; employees: Employee[]; onClose: () => void; onCreated: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [productName, setProductName] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [batchSize, setBatchSize] = useState(0);
  const [batchSizeUnit, setBatchSizeUnit] = useState("kg");
  const [numberOfTrolleys, setNumberOfTrolleys] = useState(1);
  const [trayCount, setTrayCount] = useState(0);
  const [dateEnteredDryingRoom, setDateEnteredDryingRoom] = useState(new Date().toISOString().slice(0, 10));
  const [assignedEmployeeId, setAssignedEmployeeId] = useState("");
  const [priorityRank, setPriorityRank] = useState("");

  function submit() {
    setError("");
    startTransition(async () => {
      try {
        await createBatch(bayId, {
          productName,
          batchNumber,
          batchSize,
          batchSizeUnit,
          numberOfTrolleys,
          trayCount,
          dateEnteredDryingRoom,
          dryingStartTime: new Date().toISOString(),
          assignedEmployeeId: assignedEmployeeId || null,
          priorityRank: priorityRank ? Number(priorityRank) : null,
        });
        onCreated();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't add batch.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow-md)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Add Batch</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            ✕
          </button>
        </div>
        <div className="space-y-3">
          <Field label="Product Name">
            <input value={productName} onChange={(e) => setProductName(e.target.value)} className={MFG_INPUT_CLASS} />
          </Field>
          <Field label="Batch Number">
            <input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} className={MFG_INPUT_CLASS} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Batch Size">
              <input type="number" value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} className={MFG_INPUT_CLASS} />
            </Field>
            <Field label="Unit">
              <input value={batchSizeUnit} onChange={(e) => setBatchSizeUnit(e.target.value)} className={MFG_INPUT_CLASS} />
            </Field>
            <Field label="Trolleys">
              <input type="number" min={1} value={numberOfTrolleys} onChange={(e) => setNumberOfTrolleys(Number(e.target.value))} className={MFG_INPUT_CLASS} />
            </Field>
            <Field label="Tray Count">
              <input type="number" value={trayCount} onChange={(e) => setTrayCount(Number(e.target.value))} className={MFG_INPUT_CLASS} />
            </Field>
          </div>
          <Field label="Date Entered Production Staging">
            <input type="date" value={dateEnteredDryingRoom} onChange={(e) => setDateEnteredDryingRoom(e.target.value)} className={MFG_INPUT_CLASS} />
          </Field>
          <Field label="Assigned Operator">
            <select value={assignedEmployeeId} onChange={(e) => setAssignedEmployeeId(e.target.value)} className={MFG_INPUT_CLASS}>
              <option value="">Unassigned</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select value={priorityRank} onChange={(e) => setPriorityRank(e.target.value)} className={MFG_INPUT_CLASS}>
              <option value="">None</option>
              <option value="1">1st Priority</option>
              <option value="2">2nd Priority</option>
              <option value="3">3rd Priority</option>
            </select>
          </Field>
          {error && <p className="text-xs text-status-critical">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending || !productName || !batchNumber}>
              {pending ? "Adding..." : "Add Batch"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
