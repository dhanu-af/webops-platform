import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { EditUserForm } from "./edit-user-form";
import { ResetPasswordForm } from "@/components/admin/reset-password-form";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "users.manage")) notFound();

  const { id } = await params;
  const [user, sections, areas] = await Promise.all([
    db.user.findUnique({ where: { id } }),
    db.section.findMany({ include: { facility: true }, orderBy: [{ facility: { name: "asc" } }, { sortOrder: "asc" }] }),
    db.area.findMany({
      where: { archived: false },
      include: { section: { include: { facility: true } } },
      orderBy: [{ section: { facility: { name: "asc" } } }, { section: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    }),
  ]);
  if (!user) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Edit User</h1>
        <p className="text-sm text-muted">{user.name} · {user.email}</p>
      </div>
      <EditUserForm
        userId={user.id}
        isSelf={user.id === session.user.id}
        initialRole={user.role}
        initialEmployeeId={user.employeeId ?? ""}
        initialSectionId={user.sectionId ?? ""}
        initialAreaId={user.areaId ?? ""}
        initialJobTitle={user.jobTitle ?? ""}
        sections={sections.map((s) => ({ id: s.id, label: `${s.facility.name} / ${s.name}` }))}
        areas={areas.map((a) => ({ id: a.id, label: `${a.section.facility.name} / ${a.section.name} / ${a.name}` }))}
      />

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
