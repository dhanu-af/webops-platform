import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { listQcSamples, getMfgBatchOptions } from "@/lib/data/qc-samples";
import { QcSamplesClient } from "./qc-samples-client";

export default async function QcSamplesPage() {
  const session = await auth();

  const [samples, mfgBatches] = await Promise.all([listQcSamples(), getMfgBatchOptions()]);

  return (
    <Suspense>
      <QcSamplesClient
      samples={samples.map((s) => ({
        id: s.id,
        sampleId: s.sampleId,
        productName: s.productName,
        batchNumber: s.batchNumber,
        mfgBatchId: s.mfgBatchId,
        manufacturingDate: s.manufacturingDate?.toISOString() ?? null,
        expiryDate: s.expiryDate?.toISOString() ?? null,
        sampleType: s.sampleType,
        productCategory: s.productCategory,
        quantity: s.quantity,
        unit: s.unit,
        collectedByName: s.collectedBy?.name ?? null,
        collectionDate: s.collectionDate?.toISOString() ?? null,
        collectionTime: s.collectionTime,
        productionRoom: s.productionRoom,
        sampleStorageLocation: s.sampleStorageLocation,
        storageTemperature: s.storageTemperature,
        storageCondition: s.storageCondition,
        sentToLab: s.sentToLab,
        sentDate: s.sentDate?.toISOString() ?? null,
        courierOrInternal: s.courierOrInternal,
        laboratoryName: s.laboratoryName,
        laboratoryLocation: s.laboratoryLocation,
        receivedByQcName: s.receivedByQc?.name ?? null,
        receivedDate: s.receivedDate?.toISOString() ?? null,
        status: s.status,
        remarks: s.remarks,
        createdByName: s.createdBy?.name ?? null,
        createdAt: s.createdAt.toISOString(),
        attachments: s.attachments.map((a) => ({
          id: a.id,
          kind: a.kind,
          url: a.url,
          fileName: a.fileName,
          fileSizeBytes: a.fileSizeBytes,
          uploadedByName: a.uploadedBy?.name ?? null,
          uploadedAt: a.uploadedAt.toISOString(),
        })),
        labTest: s.labTest
          ? {
              testedByName: s.labTest.testedBy?.name ?? null,
              testedAt: s.labTest.testedAt?.toISOString() ?? null,
              items: s.labTest.items.map((it) => ({
                section: it.section,
                parameter: it.parameter,
                result: it.result,
                details: it.details,
              })),
            }
          : null,
        retentionRecord: s.retentionRecord
          ? {
              shelf: s.retentionRecord.shelf,
              cabinet: s.retentionRecord.cabinet,
              boxNumber: s.retentionRecord.boxNumber,
              position: s.retentionRecord.position,
              quantityRemaining: s.retentionRecord.quantityRemaining,
              opened: s.retentionRecord.opened,
              lastChecked: s.retentionRecord.lastChecked?.toISOString() ?? null,
              expiryDate: s.retentionRecord.expiryDate?.toISOString() ?? null,
              destroyDate: s.retentionRecord.destroyDate?.toISOString() ?? null,
            }
          : null,
      }))}
      mfgBatches={mfgBatches}
      canCollect={can(session!.user.role, "qc.collect")}
      canManage={can(session!.user.role, "qc.manage")}
      canRunLabTesting={can(session!.user.role, "qc.lab")}
      isSuperAdmin={session!.user.role === "SUPER_ADMIN"}
      />
    </Suspense>
  );
}
