import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getFormulationDetail } from "@/lib/data/formulations";
import FormulationDetailClient from "./formulation-detail-client";

export default async function FormulationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const formulation = await getFormulationDetail(id);
  if (!formulation) notFound();

  const today = new Date().toISOString().slice(0, 10);

  return (
    <FormulationDetailClient
      canManage={!!session?.user && can(session.user.role, "formulation.manage")}
      enteredByDefault={session?.user.name ?? ""}
      todayStr={today}
      formulation={{
        id: formulation.id,
        productName: formulation.productName,
        folderName: formulation.folder.name,
        baseBatchSize: formulation.baseBatchSize,
        baseUnit: formulation.baseUnit,
        ingredients: formulation.ingredients.map((ing) => ({
          id: ing.id,
          rmNumber: ing.rmNumber,
          ingredientName: ing.ingredientName,
          uin: ing.uin,
          baseQty: ing.baseQty,
          tolerancePct: ing.tolerancePct,
          controlStatus: ing.controlStatus,
          changeControlRef: ing.changeControlRef,
          approvedBy: ing.approvedBy,
          comments: ing.comments,
        })),
      }}
    />
  );
}
