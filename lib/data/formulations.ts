import { db } from "@/lib/db";

export async function listFormulationFolders() {
  return db.formulationFolder.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { formulations: true } } },
  });
}

export async function listFormulationsInFolder(folderId: string, search?: string) {
  return db.formulation.findMany({
    where: {
      folderId,
      ...(search ? { productName: { contains: search, mode: "insensitive" as const } } : {}),
    },
    include: { _count: { select: { ingredients: true } } },
    orderBy: { productName: "asc" },
  });
}

export async function getFormulationDetail(id: string) {
  return db.formulation.findUnique({
    where: { id },
    include: { folder: true, ingredients: { orderBy: { order: "asc" } } },
  });
}
