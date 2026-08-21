"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createWorkflow, updateWorkflow, type WorkflowInput } from "@/lib/actions/workflows";
import type { WorkflowRole } from "@/app/generated/prisma/client";
import { GripVertical, ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react";

const ROLES: { value: WorkflowRole; label: string }[] = [
  { value: "OPERATOR", label: "Operator" },
  { value: "TEAM_LEADER", label: "Team Leader" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "QA", label: "QA" },
];

export function WorkflowForm({
  workflowId,
  initialName = "",
  initialDescription = "",
  initialRequiresAreaRelease = false,
  initialSteps = ["OPERATOR", "SUPERVISOR"],
}: {
  workflowId?: string;
  initialName?: string;
  initialDescription?: string;
  initialRequiresAreaRelease?: boolean;
  initialSteps?: WorkflowRole[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [requiresAreaRelease, setRequiresAreaRelease] = useState(initialRequiresAreaRelease);
  const [steps, setSteps] = useState<WorkflowRole[]>(initialSteps);

  function moveStep(index: number, dir: -1 | 1) {
    setSteps((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }
  function addStep() {
    setSteps((prev) => [...prev, "SUPERVISOR"]);
  }

  function handleSave() {
    setError(null);
    setSuccess(false);
    if (!name.trim()) return setError("Workflow name is required.");
    if (steps.length === 0) return setError("Add at least one verification step.");

    const input: WorkflowInput = { name: name.trim(), description: description.trim() || undefined, requiresAreaRelease, steps };
    startTransition(async () => {
      try {
        if (workflowId) {
          await updateWorkflow(workflowId, input);
          setSuccess(true);
          router.refresh();
        } else {
          await createWorkflow(input);
        }
      } catch (err) {
        if (err instanceof Error && err.message !== "NEXT_REDIRECT") setError(err.message);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-strong">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Operator → Supervisor → QA"
              className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-strong">Description / reference (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-muted-strong sm:col-span-2">
            <input type="checkbox" checked={requiresAreaRelease} onChange={(e) => setRequiresAreaRelease(e.target.checked)} />
            Gates area release (the last step must clear the area before it shows as released)
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Steps ({steps.length})</CardTitle>
          <Button size="sm" variant="secondary" onClick={addStep}>
            <Plus className="size-3.5" /> Add Step
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 pt-2">
          {steps.map((role, index) => (
            <div key={index} className="flex items-center gap-2 rounded-lg border border-border bg-surface-sunken p-2.5">
              <GripVertical className="size-4 shrink-0 text-muted" />
              <span className="w-6 shrink-0 text-center font-mono-tabular text-xs text-muted">{index + 1}</span>
              <select
                value={role}
                onChange={(e) => setSteps((prev) => prev.map((r, i) => (i === index ? (e.target.value as WorkflowRole) : r)))}
                className="flex-1 rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => moveStep(index, -1)} className="rounded p-1 text-muted hover:bg-surface">
                  <ChevronUp className="size-4" />
                </button>
                <button type="button" onClick={() => moveStep(index, 1)} className="rounded p-1 text-muted hover:bg-surface">
                  <ChevronDown className="size-4" />
                </button>
                <button type="button" onClick={() => removeStep(index)} className="rounded p-1 text-status-critical hover:bg-status-critical-soft">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
          {steps.length === 0 && <p className="py-6 text-center text-sm text-muted">No steps yet — add your first one.</p>}
        </CardContent>
      </Card>

      {error && <p className="rounded-lg bg-status-critical-soft px-3 py-2 text-sm text-status-critical">{error}</p>}
      {success && <p className="rounded-lg bg-status-pass-soft px-3 py-2 text-sm text-status-pass">Saved.</p>}
      <Button onClick={handleSave} disabled={pending} className="w-full">
        {pending ? "Saving…" : workflowId ? "Save Changes" : "Create Workflow"}
      </Button>
    </div>
  );
}
