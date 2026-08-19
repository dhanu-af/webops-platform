import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { NewUserForm } from "./new-user-form";

export default async function NewUserPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "users.manage")) notFound();

  const sections = await db.section.findMany({
    include: { facility: true },
    orderBy: [{ facility: { name: "asc" } }, { sortOrder: "asc" }],
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Create User</h1>
        <p className="text-sm text-muted">Add a new person and set their role, department and initial password.</p>
      </div>
      <NewUserForm sections={sections.map((s) => ({ id: s.id, label: `${s.facility.name} / ${s.name}` }))} />
    </div>
  );
}
