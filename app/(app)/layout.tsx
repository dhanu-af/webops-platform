import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/nav/sidebar";
import { Topbar } from "@/components/nav/topbar";
import { MobileNavProvider } from "@/components/nav/mobile-nav-context";
import { IdleLogout } from "@/components/auth/idle-logout";
import { TableLabels } from "@/components/ui/table-labels";
import { AppFooter } from "@/components/nav/app-footer";
import { NoProductionBanner } from "@/components/ui/no-production-banner";
import { KioskIdle } from "@/components/kiosk/kiosk-session";
import { pinSessionProblem } from "@/lib/pin-session";
import { signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCachedRetentionYears } from "@/lib/cached-config";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // A deactivated user's token stays valid until it expires; refuse it here so
  // deactivation takes effect on the very next page load (URS-03).
  const [account, retentionYears] = await Promise.all([
    db.user.findUnique({ where: { id: session.user.id }, select: { active: true, mustChangePassword: true, role: true, pinSetAt: true } }),
    getCachedRetentionYears(),
  ]);
  // (Cookies cannot be changed while a page renders, so signing out is done by a route: /k/end.)
  if (!account?.active) redirect("/k/end?to=login");
  // A PIN session follows its own rules (device still allowed, PIN unchanged, not older than 30 minutes) and signs itself
  // out after a few quiet minutes. The password rules below belong to password sign-ins only.
  const pinSession = session.user.authMethod === "pin";
  if (pinSession) {
    const problem = account ? await pinSessionProblem(session.user, account) : "This account is deactivated. Contact an administrator.";
    if (problem) redirect("/k/end?to=k");
  } else if (account?.mustChangePassword) {
    // An admin-issued temporary password has to be replaced before anything else.
    redirect("/change-password");
  }

  return (
    <MobileNavProvider>
      <TableLabels />
      {pinSession ? (
        <KioskIdle />
      ) : (
        <IdleLogout
          signOutAction={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        />
      )}
      <div className="flex min-h-screen">
        <Sidebar role={session.user.role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            userId={session.user.id}
            name={session.user.name ?? "User"}
            role={session.user.role}
          />
          <main className="flex-1 overflow-x-hidden bg-background p-4 sm:p-6">
            <NoProductionBanner />
            {children}
          </main>
          <AppFooter retentionYears={retentionYears} />
        </div>
      </div>
    </MobileNavProvider>
  );
}
