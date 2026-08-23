import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { listFormulationFolders, listFormulationsInFolder } from "@/lib/data/formulations";
import FormulationsClient from "./formulations-client";

export default async function FormulationsPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string; q?: string }>;
}) {
  const { folder: folderId, q } = await searchParams;
  const session = await auth();

  const folders = await listFormulationFolders();
  const activeFolder = folderId ? folders.find((f) => f.id === folderId) ?? null : null;
  const formulations = activeFolder ? await listFormulationsInFolder(activeFolder.id, q) : [];

  return (
    <FormulationsClient
      canManage={!!session?.user && can(session.user.role, "formulation.manage")}
      folders={folders.map((f) => ({ id: f.id, name: f.name, count: f._count.formulations }))}
      activeFolderId={activeFolder?.id ?? null}
      searchQuery={q ?? ""}
      formulations={formulations.map((f) => ({
        id: f.id,
        productName: f.productName,
        baseBatchSize: f.baseBatchSize,
        baseUnit: f.baseUnit,
        ingredientCount: f._count.ingredients,
        updatedAt: f.updatedAt.toISOString(),
      }))}
    />
  );
}
