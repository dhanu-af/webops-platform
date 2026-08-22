import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/nav/sidebar";
import { Topbar } from "@/components/nav/topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar role={session.user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          userId={session.user.id}
          name={session.user.name ?? "User"}
          role={session.user.role}
        />
        <main className="flex-1 overflow-x-hidden bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
