import { db } from "@/lib/db";

export async function listDryingBays() {
  return db.dryingBay.findMany({
    orderBy: { bayNumber: "asc" },
    include: {
      assignedEmployee: { select: { name: true } },
      batches: {
        where: { completedAt: null },
        orderBy: { createdAt: "asc" },
        include: {
          assignedEmployee: { select: { name: true } },
          trolleys: {
            orderBy: { trolleyNumber: "asc" },
            include: { assignedEmployee: { select: { name: true } } },
          },
        },
      },
    },
  });
}

export async function listMiscStorageItems() {
  return db.miscStorageItem.findMany({ orderBy: { createdAt: "asc" } });
}
