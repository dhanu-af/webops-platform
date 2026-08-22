import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { listMfgBatches } from "@/lib/data/mfg-reconciliation";
import { MfgReconciliationClient } from "./mfg-reconciliation-client";

export default async function MfgReconciliationPage() {
  const session = await auth();
  const batches = await listMfgBatches();

  return (
    <MfgReconciliationClient
      batches={batches.map((b) => ({
        id: b.id,
        batchNumber: b.batchNumber,
        productName: b.productName,
        status: b.status,
        createdAt: b.createdAt.toISOString(),
        blending: b.blending,
        encapsulation: b.encapsulation,
        bottling: b.bottling,
        qaReleased: b.finishedGoodsWarehouse?.qaReleased ?? false,
      }))}
      canManage={!!session?.user && can(session.user.role, "mfg.manage")}
    />
  );
}
