import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { EditUserForm } from "./edit-user-form";
import { ResetPasswordForm } from "@/components/admin/reset-password-form";
import { UserPinCard, type PinStatus } from "@/components/admin/user-pin-card";
import { canUsePin } from "@/lib/pin";
import { canSeeSuperAdmins } from "@/lib/visible-users";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "users.manage")) notFound();

  const { id } = await params;
  const [user, sections, areas] = await Promise.all([
    db.user.findUnique({ where: { id }, include: { assignedAreas: { select: { id: true } } } }),
    db.section.findMany({ include: { facility: true }, orderBy: [{ facility: { name: "asc" } }, { sortOrder: "asc" }] }),
    db.area.findMany({
      where: { archived: false },
      include: { section: { include: { facility: true } } },
      orderBy: [{ section: { facility: { name: "asc" } } }, { section: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    }),
  ]);
  if (!user) notFound();
  // A Super Admin account does not exist as far as anyone else is concerned.
  if (user.role === "SUPER_ADMIN" && !canSeeSuperAdmins(session.user.role)) notFound();

  const pinStatus: PinStatus = !user.pinHash ? "NONE" : user.pinMustChange ? "TEMPORARY" : "SET";

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Edit User</h1>
        <p className="text-sm text-muted">{user.name} · {user.loginId}</p>
      </div>
      <EditUserForm
        canGrantSuperAdmin={canSeeSuperAdmins(session.user.role)}
        userId={user.id}
        isSelf={user.id === session.user.id}
        initialLoginId={user.loginId}
        initialRole={user.role}
        initialEmployeeId={user.employeeId ?? ""}
        initialSectionId={user.sectionId ?? ""}
        initialAreaIds={user.assignedAreas.map((a) => a.id)}
        initialJobTitle={user.jobTitle ?? ""}
        sections={sections.map((s) => ({ id: s.id, label: `${s.facility.name} / ${s.name}` }))}
        areas={areas.map((a) => ({ id: a.id, label: `${a.section.facility.name} / ${a.section.name} / ${a.name}` }))}
      />

      {canUsePin(user.role) && (
        <div>
          <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground">PIN sign-in</h2>
          <UserPinCard userId={user.id} userName={user.name} status={pinStatus} />
        </div>
      )}

      {user.id === session.user.id ? (
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Password</h2>
          <p className="mt-1 text-sm text-muted">
            Change your own password from <a href="/account" className="text-accent hover:underline">Account settings</a> instead.
          </p>
        </div>
      ) : (
        <div>
          <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground">Reset Password</h2>
          <ResetPasswordForm userId={user.id} />
        </div>
      )}
    </div>
  );
}
