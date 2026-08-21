"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveChecklistVersion, type BuilderItem } from "@/lib/actions/checklist-builder";
import type { ChecklistCategory, ItemType } from "@/app/generated/prisma/client";
import { GripVertical, Trash2, ChevronUp, ChevronDown, Plus } from "lucide-react";

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

const ITEM_TYPES: { value: ItemType; label: string }[] = [
  { value: "PASS_FAIL", label: "Pass / Fail" },
  { value: "YES_NO", label: "Yes / No" },
  { value: "ACKNOWLEDGEMENT", label: "Acknowledgement (done/not done)" },
  { value: "NUMERIC", label: "Numeric" },
  { value: "TEXT", label: "Text" },
  { value: "MULTIPLE_CHOICE", label: "Multiple Choice" },
  { value: "PHOTO", label: "Photo Only" },
];

function blankItem(groupLabel: string): BuilderItem {
  return { groupLabel, prompt: "", type: "PASS_FAIL", required: true, requiresPhotoOnFail: false, criticalFailure: false };
}

export function ChecklistEditor({
  checklistId,
  initialName,
  initialCategory,
  initialDescription,
  initialWorkflowId,
  currentVersionNumber,
  initialItems,
  workflows,
}: {
  checklistId: string;
  initialName: string;
  initialCategory: ChecklistCategory;
  initialDescription: string;
  initialWorkflowId: string;
  currentVersionNumber: string;
  initialItems: BuilderItem[];
  workflows: Array<{ id: string; name: string; steps: string[] }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState(initialCategory);
  const [workflowId, setWorkflowId] = useState(initialWorkflowId);
  const [description, setDescription] = useState(initialDescription);
  const [items, setItems] = useState<BuilderItem[]>(initialItems);

  function updateItem(index: number, patch: Partial<BuilderItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }
  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }
  function moveItem(index: number, dir: -1 | 1) {
    setItems((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function addItem() {
    const lastGroup = items[items.length - 1]?.groupLabel ?? "General";
    setItems((prev) => [...prev, blankItem(lastGroup)]);
  }

  function handleSave() {
    setError(null);
    setSuccess(false);
    if (!name.trim()) return setError("Checklist name is required.");
    if (!workflowId) return setError("Select a verification workflow.");
    if (items.length === 0) return setError("Add at least one item.");
    for (const item of items) {
      if (!item.prompt.trim()) return setError("Every item needs a prompt.");
    }
    startTransition(async () => {
      try {
        await saveChecklistVersion({ checklistId, name: name.trim(), category, workflowId, description: description.trim() || undefined, items });
        setSuccess(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <span className="font-mono-tabular text-xs text-muted">current v{currentVersionNumber}</span>
        </CardHeader>
        <CardContent className="grid gap-4 pt-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-strong">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
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
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-strong">Description / reference</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items ({items.length})</CardTitle>
          <Button size="sm" variant="secondary" onClick={addItem}>
            <Plus className="size-3.5" /> Add Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          {items.map((item, index) => (
            <div key={index} className="rounded-lg border border-border bg-surface-sunken p-3">
              <div className="flex items-start gap-2">
                <GripVertical className="mt-2.5 size-4 shrink-0 text-muted" />
                <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    value={item.groupLabel}
                    onChange={(e) => updateItem(index, { groupLabel: e.target.value })}
                    placeholder="Group label (e.g. Equipment)"
                    className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-strong outline-none focus:border-accent sm:col-span-1"
                  />
                  <select
                    value={item.type}
                    onChange={(e) => updateItem(index, { type: e.target.value as ItemType })}
                    className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                  >
                    {ITEM_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => moveItem(index, -1)} className="rounded p-1 text-muted hover:bg-surface">
                    <ChevronUp className="size-4" />
                  </button>
                  <button type="button" onClick={() => moveItem(index, 1)} className="rounded p-1 text-muted hover:bg-surface">
                    <ChevronDown className="size-4" />
                  </button>
                  <button type="button" onClick={() => removeItem(index)} className="rounded p-1 text-status-critical hover:bg-status-critical-soft">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              <input
                value={item.prompt}
                onChange={(e) => updateItem(index, { prompt: e.target.value })}
                placeholder="Prompt shown to the operator"
                className="mt-2 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent"
              />
              <input
                value={item.helpText ?? ""}
                onChange={(e) => updateItem(index, { helpText: e.target.value })}
                placeholder="Help text (optional)"
                className="mt-2 w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-muted-strong outline-none focus:border-accent"
              />

              {item.type === "NUMERIC" && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="number"
                    value={item.minValue ?? ""}
                    onChange={(e) => updateItem(index, { minValue: e.target.value === "" ? undefined : Number(e.target.value) })}
                    placeholder="Min"
                    className="w-24 rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                  />
                  <input
                    type="number"
                    value={item.maxValue ?? ""}
                    onChange={(e) => updateItem(index, { maxValue: e.target.value === "" ? undefined : Number(e.target.value) })}
                    placeholder="Max"
                    className="w-24 rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                  />
                </div>
              )}

              {item.type === "MULTIPLE_CHOICE" && (
                <input
                  value={(item.choices ?? []).join(", ")}
                  onChange={(e) => updateItem(index, { choices: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  placeholder="Choices, comma-separated"
                  className="mt-2 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                />
              )}

              <div className="mt-2.5 flex flex-wrap gap-4 text-xs text-muted-strong">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={item.required} onChange={(e) => updateItem(index, { required: e.target.checked })} />
                  Required
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={item.requiresPhotoOnFail}
                    onChange={(e) => updateItem(index, { requiresPhotoOnFail: e.target.checked })}
                  />
                  Photo required on fail
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={item.criticalFailure} onChange={(e) => updateItem(index, { criticalFailure: e.target.checked })} />
                  Critical failure
                </label>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="py-6 text-center text-sm text-muted">No items yet — add your first one.</p>}
        </CardContent>
      </Card>

      {error && <p className="rounded-lg bg-status-critical-soft px-3 py-2 text-sm text-status-critical">{error}</p>}
      {success && <p className="rounded-lg bg-status-pass-soft px-3 py-2 text-sm text-status-pass">Published as a new version.</p>}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={pending} size="lg">
          {pending ? "Publishing…" : "Publish New Version"}
        </Button>
      </div>
    </div>
  );
}
