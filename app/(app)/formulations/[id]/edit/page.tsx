import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getFormulationDetail } from "@/lib/data/formulations";
import FormulationForm from "../../formulation-form";

export default async function EditFormulationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !can(session.user.role, "formulation.manage")) redirect("/formulations");

  const [folders, formulation] = await Promise.all([db.formulationFolder.findMany({ orderBy: { order: "asc" } }), getFormulationDetail(id)]);

  if (!formulation) notFound();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Edit Formulation</h1>
        <p className="text-sm text-muted">{formulation.productName}</p>
      </div>
      <FormulationForm
        folders={folders.map((f) => ({ id: f.id, name: f.name }))}
        existing={{
          id: formulation.id,
          productName: formulation.productName,
          folderId: formulation.folderId,
          baseUnit: formulation.baseUnit,
          ingredients: formulation.ingredients.map((ing) => ({
            rmNumber: ing.rmNumber ?? "",
            ingredientName: ing.ingredientName,
            uin: ing.uin ?? "",
            baseQty: ing.baseQty,
            tolerancePct: ing.tolerancePct,
            controlStatus: ing.controlStatus ?? "",
            changeControlRef: ing.changeControlRef ?? "",
            approvedBy: ing.approvedBy ?? "",
            comments: ing.comments ?? "",
          })),
        }}
      />
    </div>
  );
}
