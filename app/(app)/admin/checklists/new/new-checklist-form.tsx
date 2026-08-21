"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createChecklist } from "@/lib/actions/checklist-builder";
import type { ChecklistCategory } from "@/app/generated/prisma/client";

const CATEGORIES: { value: ChecklistCategory; label: string }[] = [
  { value: "PRE_START", label: "Pre-Start" },
  { value: "LINE_CLEARANCE", label: "Line Clearance" },
  { value: "POST_OPERATION_CLEANING", label: "Post-Operation Cleaning" },
  { value: "FIVE_S", label: "5S Audit" },
  { value: "EQUIPMENT_CHECK", label: "Equipment Check" },
  { value: "FACILITY_INSPECTION", label: "Facility Inspection" },
  { value: "WAREHOUSE_INSPECTION", label: "Warehouse Inspection" },
  { value: "PER_SHIFT", label: "Per-Shift" },
  { value: "CUSTOM", label: "Custom" },
];

export function NewChecklistForm({ workflows }: { workflows: Array<{ id: string; name: string; steps: string[] }> }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ChecklistCategory>("CUSTOM");
  const [workflowId, setWorkflowId] = useState(workflows[0]?.id ?? "");
  const [description, setDescription] = useState("");

  return (
    <form
      className="space-y-4 rounded-[var(--radius)] border border-border bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (!name.trim()) return setError("Name is required.");
        if (!workflowId) return setError("Select a verification workflow.");
        startTransition(async () => {
          try {
            await createChecklist({ name: name.trim(), category, workflowId, description: description.trim() || undefined });
          } catch (err) {
            if (err instanceof Error && err.message !== "NEXT_REDIRECT") setError(err.message);
          }
        });
      }}
    >
      <div>
        <label className="text-xs font-medium text-muted-strong">Checklist name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
          placeholder="e.g. Daily Cleaning Checklist — Bottling Area"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-strong">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ChecklistCategory)}
          className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-strong">Verification workflow</label>
        <select
          value={workflowId}
          onChange={(e) => setWorkflowId(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
        >
          {workflows.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-strong">Description / reference (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
          placeholder="Doc number, cleaning agents, verification method…"
        />
      </div>
      {error && <p className="rounded-lg bg-status-critical-soft px-3 py-2 text-sm text-status-critical">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating…" : "Create & Add Items"}
      </Button>
    </form>
  );
}
