import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PASSWORD_POLICY_HINT } from "@/lib/password-policy";
import { ForcedChangePasswordForm } from "./forced-change-form";

// Shown instead of the app while a user is still on an admin-issued temporary
// password. Lives outside the (app) layout so that layout can redirect here
// without looping.
export default async function ChangePasswordPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { name: true, loginId: true, mustChangePassword: true, active: true } });
  if (!user?.active) redirect("/login");
  if (!user.mustChangePassword) redirect("/account");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Choose your own password</h1>
        <p className="mt-1 text-sm text-muted">
          Hi {user.name} ({user.loginId}). You signed in with a temporary password. Set a new one to continue — enter the temporary password as your current password.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>New password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <ForcedChangePasswordForm loginId={user.loginId} name={user.name} />
          <p className="text-xs text-muted">{PASSWORD_POLICY_HINT}</p>
        </CardContent>
      </Card>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <Button type="submit" variant="ghost" className="w-full">
          Sign out
        </Button>
      </form>
    </main>
  );
}
