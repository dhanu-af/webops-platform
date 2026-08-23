import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { calculateBatch } from "@/lib/formulation-calc";

const COLORS = {
  ink: "#14181f",
  muted: "#5b6472",
  border: "#e2e5ea",
  headerBg: "#1e293b",
  headerText: "#ffffff",
  tableHeaderBg: "#e2e8f0",
};

const styles = StyleSheet.create({
  page: { paddingTop: 32, paddingHorizontal: 32, paddingBottom: 40, fontSize: 8, fontFamily: "Helvetica", color: COLORS.ink },
  titleBlock: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 10, marginBottom: 10, alignItems: "center" },
  titleText: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  subtitleText: { fontSize: 8, color: COLORS.muted, marginTop: 3 },
  sectionHeader: { backgroundColor: COLORS.headerBg, paddingVertical: 5, paddingHorizontal: 8, marginTop: 10, marginBottom: 6 },
  sectionHeaderText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: COLORS.headerText, textTransform: "uppercase" },
  tableHeaderRow: { flexDirection: "row", backgroundColor: COLORS.tableHeaderBg, borderWidth: 0.5, borderColor: COLORS.border },
  tableHeaderCell: { fontSize: 6.5, fontFamily: "Helvetica-Bold", padding: 3, borderRightWidth: 0.5, borderRightColor: COLORS.border },
  tableRow: { flexDirection: "row", borderWidth: 0.5, borderTopWidth: 0, borderColor: COLORS.border },
  tableCell: { fontSize: 6.5, padding: 3, borderRightWidth: 0.5, borderRightColor: COLORS.border },
  totalRow: { flexDirection: "row", marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: COLORS.ink },
  totalText: { fontSize: 8, fontFamily: "Helvetica-Bold" },
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

function LineTable({ columns, rows }: { columns: { header: string; width: string }[]; rows: string[][] }) {
  return (
    <View style={{ marginTop: 4 }}>
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

function SectionHeader({ text }: { text: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{text}</Text>
    </View>
  );
}

type FormulationIngredient = { id: string; rmNumber: string | null; ingredientName: string; uin: string | null; baseQty: number; tolerancePct: number; controlStatus: string | null; changeControlRef: string | null; approvedBy: string | null; comments: string | null };
type FormulationForPdf = { productName: string; baseBatchSize: number; baseUnit: string; folder: { name: string }; ingredients: FormulationIngredient[] };

export function FormulationDocument({
  formulation,
  batchSize,
  calcUnit,
  batchNumber,
  enteredBy,
  checkedBy,
  calcDate,
}: {
  formulation: FormulationForPdf;
  batchSize: number;
  calcUnit: string;
  batchNumber: string;
  enteredBy: string;
  checkedBy: string;
  calcDate: string;
}) {
  const totalQty = formulation.ingredients.reduce((s, i) => s + i.baseQty, 0);
  const { rows: batchRows, batchTotal } = calculateBatch(formulation.ingredients, formulation.baseUnit, batchSize, calcUnit);

  return (
    <Document title={`${formulation.productName} Formulation`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.titleBlock}>
          <Text style={styles.titleText}>MASTER FORMULATION — CONTROLLED PERCENTAGE BASIS</Text>
          <Text style={styles.subtitleText}>
            Product Name: {formulation.productName}    Folder: {formulation.folder.name}    Base Batch Size: {formulation.baseBatchSize} {formulation.baseUnit}
          </Text>
        </View>

        <LineTable
          columns={[
            { header: "No.", width: "4%" },
            { header: "RM Number", width: "8%" },
            { header: "Ingredient", width: "18%" },
            { header: "UIN", width: "6%" },
            { header: `Base Qty (${formulation.baseUnit})`, width: "9%" },
            { header: "% w/w", width: "8%" },
            { header: "Control Status", width: "9%" },
            { header: "Change Control Ref", width: "10%" },
            { header: "Approved By", width: "9%" },
            { header: "Comments", width: "19%" },
          ]}
          rows={formulation.ingredients.map((ing, i) => [
            String(i + 1),
            ing.rmNumber ?? "—",
            ing.ingredientName,
            ing.uin ?? "—",
            ing.baseQty.toFixed(3),
            totalQty > 0 ? `${((ing.baseQty / totalQty) * 100).toFixed(4)}%` : "0%",
            ing.controlStatus ?? "—",
            ing.changeControlRef ?? "—",
            ing.approvedBy ?? "—",
            ing.comments ?? "—",
          ])}
        />
        <View style={styles.totalRow}>
          <Text style={styles.totalText}>
            TOTAL: {totalQty.toFixed(3)} {formulation.baseUnit}   100.0000%
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>{formulation.productName} — Formulation Manager — Confidential</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      <Page size="A4" orientation="landscape" style={styles.page}>
        <SectionHeader text="Batch Calculator" />
        <Text style={styles.subtitleText}>
          Required Batch Size: {batchSize} {calcUnit}    Batch Number: {batchNumber || "—"}    Entered By: {enteredBy || "—"}    Checked By: {checkedBy || "—"}    Date: {calcDate || "—"}
        </Text>

        <LineTable
          columns={[
            { header: "No.", width: "5%" },
            { header: "Ingredient", width: "22%" },
            { header: "Controlled % w/w", width: "13%" },
            { header: `Calculated Qty (${calcUnit})`, width: "15%" },
            { header: `Rounded Qty (${calcUnit})`, width: "15%" },
            { header: "Tolerance %", width: "10%" },
            { header: "Min Qty", width: "10%" },
            { header: "Max Qty", width: "10%" },
          ]}
          rows={batchRows.map((r, i) => [
            String(i + 1),
            r.ingredientName,
            `${(r.pctWw * 100).toFixed(4)}%`,
            r.calculatedQty.toFixed(3),
            r.roundedQty.toFixed(2),
            `${r.tolerancePct.toFixed(2)}%`,
            r.minQty.toFixed(3),
            r.maxQty.toFixed(3),
          ])}
        />
        <View style={styles.totalRow}>
          <Text style={styles.totalText}>
            TOTAL: {batchTotal.toFixed(2)} {calcUnit}
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>{formulation.productName} — Formulation Manager — Confidential</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
