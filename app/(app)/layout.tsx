import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/nav/sidebar";
import { Topbar } from "@/components/nav/topbar";
import { MobileNavProvider } from "@/components/nav/mobile-nav-context";
import { IdleLogout } from "@/components/auth/idle-logout";
import { AppFooter } from "@/components/nav/app-footer";
import { signOut } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // A deactivated user's token stays valid until it expires; refuse it here so
  // deactivation takes effect on the very next page load (URS-03).
  const [account, settings] = await Promise.all([
    db.user.findUnique({ where: { id: session.user.id }, select: { active: true, mustChangePassword: true } }),
    db.systemSettings.findFirst({ select: { retentionYears: true } }),
  ]);
  if (!account?.active) {
    await signOut({ redirectTo: "/login" });
  }
  // An admin-issued temporary password has to be replaced before anything else.
  if (account?.mustChangePassword) redirect("/change-password");

  return (
    <MobileNavProvider>
      <IdleLogout
        signOutAction={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      />
      <div className="flex min-h-screen">
        <Sidebar role={session.user.role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            userId={session.user.id}
            name={session.user.name ?? "User"}
            role={session.user.role}
          />
          <main className="flex-1 overflow-x-hidden bg-background p-4 sm:p-6">
            {children}
          </main>
          <AppFooter retentionYears={settings?.retentionYears ?? 3} />
        </div>
      </div>
    </MobileNavProvider>
  );
}
