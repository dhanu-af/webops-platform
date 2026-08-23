"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { QcSampleType, QcSampleStatus, QcProductCategory, QcTestResult, QcAttachmentKind } from "@/app/generated/prisma/client";
import { DashboardTab } from "./dashboard-tab";
import { SamplesTab } from "./samples-tab";
import { ReportsTab } from "./reports-tab";
import { SampleDetailModal } from "./sample-detail-modal";

export type QcLabTestItemRow = {
  section: string;
  parameter: string;
  result: QcTestResult | null;
  details: string | null;
};

export type QcLabTestRow = {
  testedByName: string | null;
  testedAt: string | null;
  items: QcLabTestItemRow[];
};

export type QcRetentionRow = {
  shelf: string | null;
  cabinet: string | null;
  boxNumber: string | null;
  position: string | null;
  quantityRemaining: number | null;
  opened: boolean;
  lastChecked: string | null;
  expiryDate: string | null;
  destroyDate: string | null;
};

export type QcSampleAttachmentRow = {
  id: string;
  kind: QcAttachmentKind;
  url: string;
  fileName: string;
  fileSizeBytes: number;
  uploadedByName: string | null;
  uploadedAt: string;
};

export type QcSampleRow = {
  id: string;
  sampleId: string;
  productName: string;
  batchNumber: string;
  mfgBatchId: string | null;
  manufacturingDate: string | null;
  expiryDate: string | null;
  sampleType: QcSampleType;
  productCategory: QcProductCategory | null;
  quantity: number;
  unit: string;
  collectedByName: string | null;
  collectionDate: string | null;
  collectionTime: string | null;
  productionRoom: string | null;
  sampleStorageLocation: string | null;
  storageTemperature: string | null;
  storageCondition: string | null;
  sentToLab: boolean;
  sentDate: string | null;
  courierOrInternal: string | null;
  laboratoryName: string | null;
  laboratoryLocation: string | null;
  receivedByQcName: string | null;
  receivedDate: string | null;
  status: QcSampleStatus;
  remarks: string | null;
  createdByName: string | null;
  createdAt: string;
  labTest: QcLabTestRow | null;
  retentionRecord: QcRetentionRow | null;
  attachments: QcSampleAttachmentRow[];
};

export type MfgBatchOption = { id: string; batchNumber: string; productName: string };

const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "samples", label: "Samples" },
  { key: "reports", label: "Reports" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function QcSamplesClient({
  samples,
  mfgBatches,
  canCollect,
  canManage,
  canRunLabTesting,
  isSuperAdmin,
}: {
  samples: QcSampleRow[];
  mfgBatches: MfgBatchOption[];
  canCollect: boolean;
  canManage: boolean;
  canRunLabTesting: boolean;
  isSuperAdmin: boolean;
}) {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = samples.find((s) => s.id === selectedId) ?? null;

  // Auto-opens the scanned sample's detail modal when a Print Label QR code
  // is scanned (?sample=<sampleId>) -- otherwise the scan just lands on the
  // general list, defeating the point of a scannable label.
  const searchParams = useSearchParams();
  useEffect(() => {
    const scannedSampleId = searchParams.get("sample");
    if (!scannedSampleId) return;
    const match = samples.find((s) => s.sampleId === scannedSampleId);
    if (match) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedId(match.id);
      setTab("samples");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">QC Samples</h1>
        <p className="text-sm text-muted">Complete QC sample lifecycle with full batch traceability.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-150",
              tab === t.key ? "border-accent/40 bg-accent-soft text-accent-strong" : "border-border text-muted hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && <DashboardTab samples={samples} onSelect={setSelectedId} />}

      {tab === "samples" && (
        <SamplesTab samples={samples} mfgBatches={mfgBatches} canCollect={canCollect} onSelect={setSelectedId} />
      )}

      {tab === "reports" && <ReportsTab sampleCount={samples.length} />}

      {selected && (
        <SampleDetailModal
          sample={selected}
          mfgBatches={mfgBatches}
          canManage={canManage}
          canRunLabTesting={canRunLabTesting}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
