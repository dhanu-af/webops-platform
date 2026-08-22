import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { getFacilityTimezone, formatDateTimeInTimeZone } from "@/lib/timezone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleUserActiveButton } from "@/components/admin/toggle-user-active-button";
import { Plus } from "lucide-react";

export default async function UsersAdminPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "users.manage")) notFound();

  const currentUserId = session.user.id;

  const [users, recentLogins, timeZone] = await Promise.all([
    db.user.findMany({ include: { section: { include: { facility: true } }, area: true }, orderBy: { name: "asc" } }),
    db.auditLog.findMany({ where: { action: "LOGIN" }, include: { user: true }, orderBy: { createdAt: "desc" }, take: 20 }),
    getFacilityTimezone(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Users</h1>
          <p className="text-sm text-muted">Role-based access — server-side authorisation, never trusted from the client.</p>
        </div>
        <Button href="/admin/users/new">
          <Plus className="size-4" /> Create User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="divide-y divide-border">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{u.name}</p>
                  <p className="text-xs text-muted">
                    {u.email}
                    {u.employeeId ? ` · ${u.employeeId}` : ""}
                    {u.jobTitle ? ` · ${u.jobTitle}` : ""}
                    {u.section ? ` · ${u.section.facility.name} / ${u.section.name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={u.active ? "pass" : "neutral"}>{u.active ? "Active" : "Inactive"}</Badge>
                  {u.area && <Badge tone="neutral">{u.area.name} only</Badge>}
                  <Badge tone="accent">{u.role.replace(/_/g, " ")}</Badge>
                  <Button href={`/admin/users/${u.id}/edit`} size="sm" variant="secondary">
                    Edit
                  </Button>
                  {u.id !== currentUserId && <ToggleUserActiveButton userId={u.id} active={u.active} />}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Logins</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {recentLogins.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No logins recorded yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {recentLogins.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-4 py-2.5">
                  <p className="text-sm font-medium text-foreground">{l.user.name}</p>
                  <p className="text-xs text-muted">
                    {formatDateTimeInTimeZone(l.createdAt, timeZone)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
