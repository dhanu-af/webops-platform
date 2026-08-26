import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { PURPOSE_LABEL, STAGE_LABEL } from "@/lib/drying-room-defaults";
import type { DryingBayPurpose, DryingStage } from "@/app/generated/prisma/client";

const COLORS = {
  ink: "#14181f",
  muted: "#5b6472",
  border: "#e2e5ea",
  pass: "#1d8a4b",
  passBg: "#e3f3ea",
  warn: "#b7791f",
  warnBg: "#faf1e2",
  neutralBg: "#eef2f6",
};

const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingHorizontal: 36, paddingBottom: 40, fontSize: 9, fontFamily: "Helvetica", color: COLORS.ink },
  titleText: { fontSize: 16, fontFamily: "Helvetica-Bold", textAlign: "center" },
  subtitleText: { fontSize: 9, color: COLORS.muted, textAlign: "center", marginTop: 3, marginBottom: 12 },
  bayHeading: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 4 },
  batchRow: { flexDirection: "row", marginBottom: 5 },
  bullet: { width: 8, fontSize: 9 },
  batchText: { flex: 1 },
  batchTitle: { fontFamily: "Helvetica-Bold", fontSize: 9.5 },
  batchMeta: { fontSize: 8.5, color: COLORS.muted, marginTop: 1 },
  divider: { borderBottomWidth: 0.5, borderBottomColor: COLORS.border, marginTop: 4, marginBottom: 6 },
  pill: { alignSelf: "flex-start", borderRadius: 9, paddingVertical: 4, paddingHorizontal: 10, fontSize: 9, fontFamily: "Helvetica-Bold" },
  sectionHeading: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 4 },
});

function pillStyle(tone: "pass" | "warning" | "neutral") {
  const bg = tone === "pass" ? COLORS.passBg : tone === "warning" ? COLORS.warnBg : COLORS.neutralBg;
  const fg = tone === "pass" ? COLORS.pass : tone === "warning" ? COLORS.warn : COLORS.muted;
  return { ...styles.pill, backgroundColor: bg, color: fg };
}

type ReportBatch = { productName: string; batchNumber: string; numberOfTrolleys: number; currentStage: DryingStage };
type ReportBay = { bayNumber: number; purpose: DryingBayPurpose; batches: ReportBatch[] };
type ReportMiscItem = { product: string; quantityLabel: string; status: string | null };

export function DryingRoomReportDocument({ bays, misc, generatedAt }: { bays: ReportBay[]; misc: ReportMiscItem[]; generatedAt: Date }) {
  return (
    <Document title="Production Staging Status Report">
      <Page size="A4" style={styles.page}>
        <Text style={styles.titleText}>PRODUCTION STAGING STATUS REPORT</Text>
        <Text style={styles.subtitleText}>Generated {generatedAt.toLocaleString("en-AU")}</Text>

        {bays.map((bay) => {
          const tone = bay.purpose === "CLEANING_REQUIRED" ? "warning" : "neutral";
          const label = bay.purpose === "EMPTY" ? "Empty" : PURPOSE_LABEL[bay.purpose];
          return (
            <View key={bay.bayNumber} wrap={false}>
              <Text style={styles.bayHeading}>Bay {bay.bayNumber}</Text>
              {bay.batches.length === 0 ? (
                <Text style={pillStyle(tone)}>{label}</Text>
              ) : (
                bay.batches.map((batch, i) => (
                  <View key={i} style={styles.batchRow}>
                    <Text style={styles.bullet}>•</Text>
                    <View style={styles.batchText}>
                      <Text style={styles.batchTitle}>
                        {batch.productName} — Batch {batch.batchNumber}
                      </Text>
                      <Text style={styles.batchMeta}>
                        {batch.numberOfTrolleys} {batch.numberOfTrolleys === 1 ? "Trolley" : "Trolleys"} — {STAGE_LABEL[batch.currentStage]}
                      </Text>
                    </View>
                  </View>
                ))
              )}
              <View style={styles.divider} />
            </View>
          );
        })}

        {misc.length > 0 && (
          <View>
            <Text style={styles.sectionHeading}>Miscellaneous</Text>
            {misc.map((m, i) => (
              <View key={i} style={styles.batchRow}>
                <Text style={styles.bullet}>•</Text>
                <View style={styles.batchText}>
                  <Text style={styles.batchTitle}>{m.product}</Text>
                  <Text style={styles.batchMeta}>
                    {m.quantityLabel}
                    {m.status ? ` — ${m.status}` : ""}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
