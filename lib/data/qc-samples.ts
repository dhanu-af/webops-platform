import { db } from "@/lib/db";

export async function listQcSamples() {
  return db.qcSample.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      collectedBy: { select: { name: true } },
      receivedByQc: { select: { name: true } },
      createdBy: { select: { name: true } },
      mfgBatch: { select: { id: true, batchNumber: true, productName: true } },
      labTest: {
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          testedBy: { select: { name: true } },
        },
      },
      retentionRecord: true,
      attachments: {
        include: { uploadedBy: { select: { name: true } } },
        orderBy: { uploadedAt: "desc" },
      },
    },
  });
}

export async function getMfgBatchOptions() {
  return db.mfgBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    select: { id: true, batchNumber: true, productName: true },
  });
}
