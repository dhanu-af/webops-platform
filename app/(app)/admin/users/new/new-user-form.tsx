"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createUser } from "@/lib/actions/users";
import type { UserRole } from "@/app/generated/prisma/client";
import { validatePassword } from "@/lib/password-policy";
import { generateTemporaryPassword } from "@/lib/temp-password";
import { LOGIN_ID_HINT, normalizeLoginId, validateLoginId } from "@/lib/login-id";

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

export function NewUserForm({
  sections,
  areas,
}: {
  sections: Array<{ id: string; label: string }>;
  areas: Array<{ id: string; label: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [temporary, setTemporary] = useState(true);
  const [employeeId, setEmployeeId] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [role, setRole] = useState<UserRole>("OPERATOR");
  const [sectionId, setSectionId] = useState("");
  const [areaIds, setAreaIds] = useState<string[]>([]);

  function toggleArea(id: string) {
    setAreaIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  }

  return (
    <form
      className="space-y-4 rounded-[var(--radius)] border border-border bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (!name.trim()) return setError("Name is required.");
        { const idProblem = validateLoginId(normalizeLoginId(loginId)); if (idProblem) return setError(idProblem); }
        { const problems = validatePassword(password, { loginId: normalizeLoginId(loginId), name }); if (problems.length) return setError(problems.join(" ")); }
        startTransition(async () => {
          try {
            await createUser({
              name: name.trim(),
              loginId,
              email: email.trim() || undefined,
              password,
              temporaryPassword: temporary,
              role,
              employeeId: employeeId.trim() || undefined,
              sectionId: sectionId || undefined,
              areaIds,
              jobTitle: jobTitle.trim() || undefined,
            });
          } catch (err) {
            if (err instanceof Error && err.message !== "NEXT_REDIRECT") setError(err.message);
          }
        });
      }}
    >
      <div>
        <label className="text-xs font-medium text-muted-strong">User name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
          placeholder="e.g. Dhanu"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-strong">User ID (used to sign in)</label>
        <input
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          autoCapitalize="none"
          autoComplete="off"
          className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
          placeholder="e.g. dhanu or emp-00123"
        />
        <p className="mt-1 text-xs text-muted">{LOGIN_ID_HINT}</p>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-strong">Email (optional)</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
          placeholder="name@company.com"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-strong">{temporary ? "Temporary password" : "Initial password"}</label>
        <div className="mt-1.5 flex gap-2">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="min-w-0 flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2.5 font-mono text-sm outline-none focus:border-accent"
            placeholder="At least 10 characters"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setPassword(generateTemporaryPassword());
              setShowPassword(true);
            }}
          >
            Generate
          </Button>
          <Button type="button" variant="secondary" onClick={() => setShowPassword((v) => !v)}>
            {showPassword ? "Hide" : "Show"}
          </Button>
        </div>
        <label className="mt-2 flex items-start gap-2 text-sm text-foreground">
          <input type="checkbox" className="mt-0.5" checked={temporary} onChange={(e) => setTemporary(e.target.checked)} />
          <span>
            Temporary password — the user must choose their own password the first time they sign in.
            <span className="block text-xs text-muted">Give them the User ID and this password in person; it is not shown again after you save.</span>
          </span>
        </label>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-strong">Employee number (optional)</label>
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
          className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
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
        <label className="text-xs font-medium text-muted-strong">Assigned area(s) (optional)</label>
        <div className="mt-1.5 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border-strong bg-surface p-2.5">
          {areas.length === 0 && <p className="px-1 py-1 text-sm text-muted">No areas defined yet.</p>}
          {areas.map((a) => (
            <label key={a.id} className="flex items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-surface-sunken">
              <input type="checkbox" checked={areaIds.includes(a.id)} onChange={() => toggleArea(a.id)} />
              {a.label}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">
          For Operator / Team Leader / Supervisor: restricts them to only these areas&apos; tasks — pick more than one for staff who work across sections. Leave every box unchecked for QA, Management, or any role that should see every area.
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
        {pending ? "Creating…" : "Create User"}
      </Button>
    </form>
  );
}
