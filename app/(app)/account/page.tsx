import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "./change-password-form";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    include: { section: { include: { facility: true } } },
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">My Account</h1>
        <p className="text-sm text-muted">Your profile and login credentials.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 pt-2 text-sm">
          <p><span className="text-muted">Name</span> · <span className="text-foreground">{user.name}</span></p>
          <p><span className="text-muted">Email</span> · <span className="text-foreground">{user.email}</span></p>
          <p><span className="text-muted">Role</span> · <span className="text-foreground">{user.role.replace(/_/g, " ")}</span></p>
          {user.employeeId && <p><span className="text-muted">User ID</span> · <span className="text-foreground">{user.employeeId}</span></p>}
          {user.section && (
            <p><span className="text-muted">Department / Section</span> · <span className="text-foreground">{user.section.facility.name} / {user.section.name}</span></p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
