import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import {
  MFG_BATCH_STATUS_LABEL,
  MFG_MATERIAL_GROUP_LABEL,
  PACKAGING_MATERIAL_TYPE_LABEL,
  computeBalance,
  computeYieldPct,
  capsulesFromKg,
  formatCount,
  computeFinalReconciliationChecks,
  type ReconciliationCheck,
} from "@/lib/mfg-reconciliation";
import type { getMfgBatchDetail } from "@/lib/data/mfg-reconciliation";

const COLORS = {
  ink: "#14181f",
  muted: "#5b6472",
  border: "#e2e5ea",
  accent: "#2952cc",
  headerBg: "#1e293b",
  headerText: "#ffffff",
  labelBg: "#f1f5f9",
  tableHeaderBg: "#e2e8f0",
  pass: "#147a4a",
  fail: "#c2262e",
};

const styles = StyleSheet.create({
  page: { paddingTop: 32, paddingHorizontal: 32, paddingBottom: 48, fontSize: 8, fontFamily: "Helvetica", color: COLORS.ink },
  titleBlock: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 10, marginBottom: 10, alignItems: "center" },
  titleText: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  subtitleText: { fontSize: 8, color: COLORS.muted, marginTop: 3 },
  sectionHeader: { backgroundColor: COLORS.headerBg, paddingVertical: 5, paddingHorizontal: 8, marginTop: 10, marginBottom: 6 },
  sectionHeaderText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: COLORS.headerText, textTransform: "uppercase" },
  fieldRow: { flexDirection: "row", borderWidth: 0.5, borderColor: COLORS.border, borderTopWidth: 0 },
  fieldRowFirst: { borderTopWidth: 0.5 },
  fieldLabel: { width: 200, backgroundColor: COLORS.labelBg, padding: 4, fontSize: 7.5, fontFamily: "Helvetica-Bold", color: COLORS.muted },
  fieldValue: { flex: 1, padding: 4, fontSize: 8, borderLeftWidth: 0.5, borderLeftColor: COLORS.border },
  emptyNotice: { fontSize: 8.5, fontStyle: "italic", color: COLORS.muted, marginBottom: 4 },
  tableHeaderRow: { flexDirection: "row", backgroundColor: COLORS.tableHeaderBg, borderWidth: 0.5, borderColor: COLORS.border },
  tableHeaderCell: { fontSize: 7, fontFamily: "Helvetica-Bold", padding: 3, borderRightWidth: 0.5, borderRightColor: COLORS.border },
  tableRow: { flexDirection: "row", borderWidth: 0.5, borderTopWidth: 0, borderColor: COLORS.border },
  tableCell: { fontSize: 7, padding: 3, borderRightWidth: 0.5, borderRightColor: COLORS.border },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: COLORS.muted,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    paddingTop: 6,
  },
});

function FieldRows({ rows }: { rows: [string, string][] }) {
  return (
    <View>
      {rows.map(([label, value], i) => (
        <View key={label} style={[styles.fieldRow, i === 0 ? styles.fieldRowFirst : undefined]} wrap={false}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <Text style={styles.fieldValue}>{value || "—"}</Text>
        </View>
      ))}
    </View>
  );
}

function EmptyStageNotice({ text }: { text: string }) {
  return <Text style={styles.emptyNotice}>{text}</Text>;
}

function LineTable({ columns, rows }: { columns: { header: string; width: string }[]; rows: string[][] }) {
  return (
    <View style={{ marginTop: 6 }}>
      <View style={styles.tableHeaderRow} fixed>
        {columns.map((c, i) => (
          <Text key={c.header} style={[styles.tableHeaderCell, { width: c.width }, i === columns.length - 1 ? { borderRightWidth: 0 } : undefined]}>
            {c.header}
          </Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.tableRow} wrap={false}>
          {row.map((cell, ci) => (
            <Text key={ci} style={[styles.tableCell, { width: columns[ci].width }, ci === row.length - 1 ? { borderRightWidth: 0 } : undefined]}>
              {cell || "—"}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function ReconciliationTable({ checks }: { checks: ReconciliationCheck[] }) {
  const columns = [
    { header: "Parameter", width: "38%" },
    { header: "Acceptance Criteria", width: "28%" },
    { header: "Result", width: "17%" },
    { header: "Status", width: "17%" },
  ];
  return (
    <View style={{ marginTop: 6 }}>
      <View style={styles.tableHeaderRow} fixed>
        {columns.map((c, i) => (
          <Text key={c.header} style={[styles.tableHeaderCell, { width: c.width }, i === columns.length - 1 ? { borderRightWidth: 0 } : undefined]}>
            {c.header}
          </Text>
        ))}
      </View>
      {checks.map((c, i) => (
        <View key={i} style={styles.tableRow} wrap={false}>
          <Text style={[styles.tableCell, { width: columns[0].width }]}>{c.label}</Text>
          <Text style={[styles.tableCell, { width: columns[1].width, color: COLORS.muted }]}>{c.limitLabel || "Informational"}</Text>
          <Text style={[styles.tableCell, { width: columns[2].width, fontFamily: "Helvetica-Bold" }]}>{c.pct !== null ? `${c.pct.toFixed(1)}%` : "—"}</Text>
          <Text
            style={[
              styles.tableCell,
              { width: columns[3].width, borderRightWidth: 0, fontFamily: "Helvetica-Bold", color: c.pass === null ? COLORS.muted : c.pass ? COLORS.pass : COLORS.fail },
            ]}
          >
            {c.pass === null ? "—" : c.pass ? "PASS" : "FAIL"}
          </Text>
        </View>
      ))}
    </View>
  );
}

function SectionHeader({ text }: { text: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{text}</Text>
    </View>
  );
}

const dateAU = (d: Date | null) => (d ? d.toLocaleDateString("en-AU") : "—");

type BatchDetail = NonNullable<Awaited<ReturnType<typeof getMfgBatchDetail>>>;

export function MfgReconciliationDocument({ batch, generatedAt }: { batch: BatchDetail; generatedAt: Date }) {
  const checks = computeFinalReconciliationChecks(batch.blending, batch.encapsulation, batch.bottling);

  return (
    <Document title={`${batch.batchNumber} Reconciliation`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.titleBlock}>
          <Text style={styles.titleText}>MANUFACTURING BATCH RECONCILIATION RECORD</Text>
          <Text style={styles.subtitleText}>GMP / GDP Controlled Document — Batch Traceability & Reconciliation Summary</Text>
        </View>

        <FieldRows
          rows={[
            ["Batch Number", batch.batchNumber],
            ["Product", batch.productName],
            ["Status", MFG_BATCH_STATUS_LABEL[batch.status]],
            ["Formulation/BOM Reference", batch.formulationReference ?? "—"],
            ["Report Generated", generatedAt.toLocaleString("en-AU")],
            ...(batch.remarks ? ([["Remarks", batch.remarks]] as [string, string][]) : []),
          ]}
        />

        <SectionHeader text="1. Warehouse Issue" />
        {batch.warehouseIssue ? (
          <>
            <FieldRows
              rows={[
                ["Issued By", batch.warehouseIssue.issuedByName ?? "—"],
                ["Issue Date", dateAU(batch.warehouseIssue.issueDate)],
                ...(batch.warehouseIssue.remarks ? ([["Remarks", batch.warehouseIssue.remarks]] as [string, string][]) : []),
              ]}
            />
            {batch.warehouseIssue.lines.length > 0 && (
              <LineTable
                columns={[
                  { header: "Group", width: "13%" },
                  { header: "Code", width: "8%" },
                  { header: "Description", width: "18%" },
                  { header: "Supplier", width: "12%" },
                  { header: "Lot/Batch", width: "10%" },
                  { header: "Expiry", width: "9%" },
                  { header: "Req.", width: "7.5%" },
                  { header: "Issued", width: "7.5%" },
                  { header: "Returned", width: "7.5%" },
                  { header: "Balance", width: "7.5%" },
                ]}
                rows={batch.warehouseIssue.lines.map((l) => [
                  MFG_MATERIAL_GROUP_LABEL[l.materialGroup],
                  l.materialCode ?? "—",
                  l.description,
                  l.supplier ?? "—",
                  l.lotBatchNumber ?? "—",
                  dateAU(l.expiryDate),
                  l.quantityRequested?.toString() ?? "—",
                  l.quantityIssued?.toString() ?? "—",
                  l.quantityReturned?.toString() ?? "—",
                  computeBalance(l.quantityIssued, l.quantityReturned)?.toString() ?? "—",
                ])}
              />
            )}
          </>
        ) : (
          <EmptyStageNotice text="Not started." />
        )}

        <SectionHeader text="2. Blending" />
        {batch.blending ? (
          <FieldRows
            rows={[
              ["Total Theoretical Weight (kg)", batch.blending.totalTheoreticalWeightKg?.toString() ?? "—"],
              ["Actual Weight (kg)", batch.blending.actualWeightKg?.toString() ?? "—"],
              ["Blend Batch Number", batch.blending.blendBatchNumber ?? "—"],
              ["Powder Remaining (kg)", batch.blending.powderRemainingKg?.toString() ?? "—"],
              ["Blender Residue (kg)", batch.blending.blenderResidueKg?.toString() ?? "—"],
              ["Sieve Loss (kg)", batch.blending.sieveLossKg?.toString() ?? "—"],
              ["Dust Loss (kg)", batch.blending.dustLossKg?.toString() ?? "—"],
              ["Spillages (kg)", batch.blending.spillagesKg?.toString() ?? "—"],
              ["QC Samples", batch.blending.qcSamplesQty?.toString() ?? "—"],
              ["Retention Samples", batch.blending.retentionSamplesQty?.toString() ?? "—"],
              ["Destroyed Material (kg)", batch.blending.destroyedMaterialKg?.toString() ?? "—"],
              ["Returned to Warehouse (kg)", batch.blending.returnedToWarehouseKg?.toString() ?? "—"],
              ["Total Blend Produced (kg)", batch.blending.totalBlendProducedKg?.toString() ?? "—"],
              ["Blend Yield %", (() => {
                const y = computeYieldPct(batch.blending.totalBlendProducedKg, batch.blending.totalTheoreticalWeightKg);
                return y !== null ? `${y.toFixed(1)}%` : "—";
              })()],
              ["Blended By", batch.blending.blendedByName ?? "—"],
              ["Blended At", dateAU(batch.blending.blendedAt)],
              ...(batch.blending.remarks ? ([["Remarks", batch.blending.remarks]] as [string, string][]) : []),
            ]}
          />
        ) : (
          <EmptyStageNotice text="Not started." />
        )}

        <SectionHeader text="3. Encapsulation" />
        {batch.encapsulation ? (
          (() => {
            const e = batch.encapsulation;
            const theoreticalCapsules = capsulesFromKg(e.issuedBulkBlendKg, e.targetCapsuleFillWeightMg);
            const capsulesProduced = capsulesFromKg(e.capsulesProducedKg, e.avgCapsuleFullWeightMg);
            return (
              <FieldRows
                rows={[
                  ["Target Capsule Fill Weight (mg)", e.targetCapsuleFillWeightMg?.toString() ?? "—"],
                  ["Average Capsule Full Weight (mg)", e.avgCapsuleFullWeightMg?.toString() ?? "—"],
                  ["Issued Bulk Blend (kg)", e.issuedBulkBlendKg?.toString() ?? "—"],
                  ["Capsules Produced (kg)", e.capsulesProducedKg?.toString() ?? "—"],
                  ["Capsule Samples (kg)", e.capsuleSamplesKg?.toString() ?? "—"],
                  ["Reject Capsules (kg)", e.rejectCapsulesKg?.toString() ?? "—"],
                  ["Reject Powder (kg)", e.rejectPowderKg?.toString() ?? "—"],
                  ["Average Capsule Fill Weight (mg)", e.avgCapsuleFillWeightMg?.toString() ?? "—"],
                  ["Average Capsule Length (mm)", e.avgCapsuleLengthMm?.toString() ?? "—"],
                  ["Average Disintegration", e.avgDisintegrationMinutes !== null || e.avgDisintegrationSeconds !== null ? `${e.avgDisintegrationMinutes ?? 0}m ${e.avgDisintegrationSeconds ?? 0}s` : "—"],
                  ["Disintegration Result", e.disintegrationResult ?? "—"],
                  ["Theoretical No. of Capsules", formatCount(theoreticalCapsules)],
                  ["No. of Capsules Produced", formatCount(capsulesProduced)],
                  ["Completed By", e.completedByName ?? "—"],
                  ["Completed Date", dateAU(e.completedAt)],
                  ["Checked By", e.checkedByName ?? "—"],
                  ["Checked Date", dateAU(e.checkedAt)],
                  ...(e.comments ? ([["Comments", e.comments]] as [string, string][]) : []),
                ]}
              />
            );
          })()
        ) : (
          <EmptyStageNotice text="Not started." />
        )}

        <SectionHeader text="4. Bottling" />
        {batch.bottling ? (
          <FieldRows
            rows={[
              ["Total Capsule Bulk Weight (kg)", batch.bottling.totalCapsuleBulkWeightKg?.toString() ?? "—"],
              ["Average Capsule Full Weight (mg)", batch.bottling.avgCapsuleFullWeightMg?.toString() ?? "—"],
              ["Planned Quantity (Bottles)", batch.bottling.plannedQuantityBottles?.toString() ?? "—"],
              ["Target Capsules per Bottle", batch.bottling.targetCapsulesPerBottle?.toString() ?? "—"],
              ["Capsule Received (kg)", batch.bottling.capsuleReceivedKg?.toString() ?? "—"],
              ["Bottles Produced", batch.bottling.bottlesProduced?.toString() ?? "—"],
              ["Bottle Used", batch.bottling.bottleUsed?.toString() ?? "—"],
              ["Desiccants Used", batch.bottling.desiccantsUsed?.toString() ?? "—"],
              ["Caps Used", batch.bottling.capsUsed?.toString() ?? "—"],
              ["Completed By", batch.bottling.completedByName ?? "—"],
              ["Completed Date", dateAU(batch.bottling.completedAt)],
              ["Checked By", batch.bottling.checkedByName ?? "—"],
              ["Checked Date", dateAU(batch.bottling.checkedAt)],
              ...(batch.bottling.comments ? ([["Comments", batch.bottling.comments]] as [string, string][]) : []),
            ]}
          />
        ) : (
          <EmptyStageNotice text="Not started." />
        )}

        <SectionHeader text="5. X-Ray / Metal Detection" />
        {batch.xrayInspection ? (
          <FieldRows
            rows={[
              ["Bottles Received", batch.xrayInspection.bottlesReceived?.toString() ?? "—"],
              ["Bottles Scanned", batch.xrayInspection.bottlesScanned?.toString() ?? "—"],
              ["Passed", batch.xrayInspection.passed?.toString() ?? "—"],
              ["Failed", batch.xrayInspection.failed?.toString() ?? "—"],
              ["Reworked", batch.xrayInspection.reworked?.toString() ?? "—"],
              ["Destroyed", batch.xrayInspection.destroyed?.toString() ?? "—"],
              ["Released", batch.xrayInspection.released?.toString() ?? "—"],
              ["Reject — Metal Detection", batch.xrayInspection.rejectMetalDetection?.toString() ?? "—"],
              ["Reject — X-Ray Failure", batch.xrayInspection.rejectXrayFailure?.toString() ?? "—"],
              ["Reject — Underweight", batch.xrayInspection.rejectUnderweight?.toString() ?? "—"],
              ["Reject — Overweight", batch.xrayInspection.rejectOverweight?.toString() ?? "—"],
              ["Reject — Damaged Bottle", batch.xrayInspection.rejectDamagedBottle?.toString() ?? "—"],
              ["Reject — Missing Cap", batch.xrayInspection.rejectMissingCap?.toString() ?? "—"],
              ["Reject — Missing Desiccant", batch.xrayInspection.rejectMissingDesiccant?.toString() ?? "—"],
              ["Inspected By", batch.xrayInspection.inspectedByName ?? "—"],
              ["Inspected At", dateAU(batch.xrayInspection.inspectedAt)],
              ...(batch.xrayInspection.remarks ? ([["Remarks", batch.xrayInspection.remarks]] as [string, string][]) : []),
            ]}
          />
        ) : (
          <EmptyStageNotice text="Not started." />
        )}

        <SectionHeader text="6. Packaging" />
        {batch.packaging ? (
          <>
            <FieldRows
              rows={[
                ["Packed Bottles", batch.packaging.packedBottles?.toString() ?? "—"],
                ["Cartons Produced", batch.packaging.cartonsProduced?.toString() ?? "—"],
                ["Cases Produced", batch.packaging.casesProduced?.toString() ?? "—"],
                ["Packed By", batch.packaging.packedByName ?? "—"],
                ["Packed At", dateAU(batch.packaging.packedAt)],
                ...(batch.packaging.remarks ? ([["Remarks", batch.packaging.remarks]] as [string, string][]) : []),
              ]}
            />
            {batch.packaging.lines.length > 0 && (
              <LineTable
                columns={[
                  { header: "Material", width: "20%" },
                  { header: "Issued", width: "16%" },
                  { header: "Used", width: "16%" },
                  { header: "Damaged", width: "16%" },
                  { header: "Returned", width: "16%" },
                  { header: "Balance", width: "16%" },
                ]}
                rows={batch.packaging.lines.map((l) => [
                  PACKAGING_MATERIAL_TYPE_LABEL[l.materialType],
                  l.issued?.toString() ?? "—",
                  l.used?.toString() ?? "—",
                  l.damaged?.toString() ?? "—",
                  l.returned?.toString() ?? "—",
                  computeBalance(l.issued, l.returned)?.toString() ?? "—",
                ])}
              />
            )}
          </>
        ) : (
          <EmptyStageNotice text="Not started." />
        )}

        <SectionHeader text="7. Finished Goods Warehouse" />
        {batch.finishedGoodsWarehouse ? (
          <FieldRows
            rows={[
              ["Finished Goods Received", batch.finishedGoodsWarehouse.finishedGoodsReceived?.toString() ?? "—"],
              ["QA Released", batch.finishedGoodsWarehouse.qaReleased ? "Yes" : "No"],
              ["QA Released By", batch.finishedGoodsWarehouse.qaReleasedByName ?? "—"],
              ["QA Released At", dateAU(batch.finishedGoodsWarehouse.qaReleasedAt)],
              ["Storage Location", batch.finishedGoodsWarehouse.storageLocation ?? "—"],
              ["Warehouse Balance", batch.finishedGoodsWarehouse.warehouseBalance?.toString() ?? "—"],
              ["Batch Number", batch.finishedGoodsWarehouse.batchNumber ?? "—"],
              ["Expiry Date", dateAU(batch.finishedGoodsWarehouse.expiryDate)],
              ...(batch.finishedGoodsWarehouse.remarks ? ([["Remarks", batch.finishedGoodsWarehouse.remarks]] as [string, string][]) : []),
            ]}
          />
        ) : (
          <EmptyStageNotice text="Not started." />
        )}

        <SectionHeader text="8. Dispatch" />
        {batch.dispatchEvents.length > 0 ? (
          <LineTable
            columns={[
              { header: "Customer", width: "16%" },
              { header: "Sales Order", width: "11%" },
              { header: "Batch No.", width: "9%" },
              { header: "Expiry", width: "9%" },
              { header: "Cases", width: "9%" },
              { header: "Bottles", width: "9%" },
              { header: "Dispatch Date", width: "12%" },
              { header: "Remaining", width: "12%" },
              { header: "By", width: "13%" },
            ]}
            rows={batch.dispatchEvents.map((d) => [
              d.customer,
              d.salesOrder ?? "—",
              d.batchNumber ?? "—",
              dateAU(d.expiryDate),
              d.casesDispatched?.toString() ?? "—",
              d.bottlesDispatched?.toString() ?? "—",
              dateAU(d.dispatchDate),
              d.remainingStockAfter?.toString() ?? "—",
              d.dispatchedByName ?? "—",
            ])}
          />
        ) : (
          <EmptyStageNotice text="No dispatch events recorded." />
        )}

        <SectionHeader text="Final Reconciliation" />
        {checks.length === 0 ? <EmptyStageNotice text="No reconciliation checks available yet." /> : <ReconciliationTable checks={checks} />}

        <View style={styles.footer} fixed>
          <Text>Batch {batch.batchNumber} — GMP Controlled Document — Confidential</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
