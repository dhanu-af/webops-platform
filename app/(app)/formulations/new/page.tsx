import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import FormulationForm from "../formulation-form";

export default async function NewFormulationPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>;
}) {
  const { folder } = await searchParams;
  const session = await auth();
  if (!session?.user || !can(session.user.role, "formulation.manage")) redirect("/formulations");

  const folders = await db.formulationFolder.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">New Formulation</h1>
        <p className="text-sm text-muted">Enter each ingredient&apos;s base quantity — % w/w and the total are calculated automatically.</p>
      </div>
      <FormulationForm folders={folders.map((f) => ({ id: f.id, name: f.name }))} defaultFolderId={folder} />
    </div>
  );
}
