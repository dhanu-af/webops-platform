import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function UsersAdminPage() {
  const users = await db.user.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Users</h1>
        <p className="text-sm text-muted">Role-based access — server-side authorisation, never trusted from the client.</p>
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
                  <p className="text-xs text-muted">{u.email}{u.jobTitle ? ` · ${u.jobTitle}` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={u.active ? "pass" : "neutral"}>{u.active ? "Active" : "Inactive"}</Badge>
                  <Badge tone="accent">{u.role.replace(/_/g, " ")}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
