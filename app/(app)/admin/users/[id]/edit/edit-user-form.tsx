"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateUser } from "@/lib/actions/users";
import type { UserRole } from "@/app/generated/prisma/client";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "OPERATOR", label: "Operator" },
  { value: "TEAM_LEADER", label: "Team Leader" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "QA", label: "QA" },
  { value: "MANAGEMENT", label: "Management" },
  { value: "VIEWER", label: "Viewer" },
];

export function EditUserForm({
  userId,
  isSelf,
  initialRole,
  initialEmployeeId,
  initialSectionId,
  initialAreaId,
  initialJobTitle,
  sections,
  areas,
}: {
  userId: string;
  isSelf: boolean;
  initialRole: UserRole;
  initialEmployeeId: string;
  initialSectionId: string;
  initialAreaId: string;
  initialJobTitle: string;
  sections: Array<{ id: string; label: string }>;
  areas: Array<{ id: string; label: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>(initialRole);
  const [employeeId, setEmployeeId] = useState(initialEmployeeId);
  const [sectionId, setSectionId] = useState(initialSectionId);
  const [areaId, setAreaId] = useState(initialAreaId);
  const [jobTitle, setJobTitle] = useState(initialJobTitle);

  return (
    <form
      className="space-y-4 rounded-[var(--radius)] border border-border bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          try {
            await updateUser(userId, {
              role,
              employeeId: employeeId.trim() || undefined,
              sectionId: sectionId || undefined,
              areaId: areaId || undefined,
              jobTitle: jobTitle.trim() || undefined,
            });
          } catch (err) {
            if (err instanceof Error && err.message !== "NEXT_REDIRECT") setError(err.message);
          }
        });
      }}
    >
      <div>
        <label className="text-xs font-medium text-muted-strong">User ID / employee ID (optional)</label>
        <input
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
          placeholder="e.g. EMP-00123"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-strong">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          disabled={isSelf}
          className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent disabled:opacity-60"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {isSelf && <p className="mt-1 text-xs text-muted">You can&apos;t change your own role — ask another admin to do it.</p>}
      </div>
      <div>
        <label className="text-xs font-medium text-muted-strong">Department / Section (optional)</label>
        <select
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
        >
          <option value="">— None —</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-strong">Assigned area (optional)</label>
        <select
          value={areaId}
          onChange={(e) => setAreaId(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
        >
          <option value="">— None (sees every area) —</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted">
          For Operator / Team Leader / Supervisor: restricts them to only this area&apos;s tasks. Leave blank for QA, Management, or any role that should see every area. Takes effect next time they log in.
        </p>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-strong">Job title (optional)</label>
        <input
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
          placeholder="e.g. Production Operator"
        />
      </div>
      {error && <p className="rounded-lg bg-status-critical-soft px-3 py-2 text-sm text-status-critical">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
