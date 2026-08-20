import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { EditUserForm } from "./edit-user-form";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "users.manage")) notFound();

  const { id } = await params;
  const [user, sections] = await Promise.all([
    db.user.findUnique({ where: { id } }),
    db.section.findMany({ include: { facility: true }, orderBy: [{ facility: { name: "asc" } }, { sortOrder: "asc" }] }),
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
        initialJobTitle={user.jobTitle ?? ""}
        sections={sections.map((s) => ({ id: s.id, label: `${s.facility.name} / ${s.name}` }))}
      />
    </div>
  );
}
