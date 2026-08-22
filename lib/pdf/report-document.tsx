import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatDayInTimeZone, formatDateTimeInTimeZone } from "@/lib/timezone";
import type { StatusTone } from "@/lib/status";
import { INSPECTION_STATUS_META } from "@/lib/status";
import type {
  getReportInspections,
  getReportSummary,
} from "@/lib/data/reports";

const TONE_COLOR: Record<StatusTone, string> = {
  pass: "#147a4a",
  warn: "#b5750a",
  attention: "#c2540c",
  critical: "#c2262e",
  neutral: "#5b6472",
  accent: "#2952cc",
};

const COLORS = {
  ink: "#14181f",
  muted: "#5b6472",
  border: "#e2e5ea",
  accent: "#2952cc",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingHorizontal: 32,
    paddingBottom: 48,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: COLORS.ink,
  },
  eyebrow: {
    fontSize: 8,
    color: COLORS.accent,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
  },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 2 },
  subtitle: { fontSize: 9, color: COLORS.muted, marginTop: 3 },
  kpiRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 16,
  },
  kpiTile: {
    width: "15%",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 8,
  },
  kpiLabel: { fontSize: 6.5, color: COLORS.muted, textTransform: "uppercase" },
  kpiValue: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 3 },
  tableHeaderRow: {
    flexDirection: "row",
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.ink,
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    width: "100%",
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    paddingVertical: 4,
  },
  th: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.muted,
    textTransform: "uppercase",
  },
  td: { fontSize: 8 },
  colChecklist: { width: "27%" },
  colArea: { width: "15%" },
  colOperator: { width: "15%" },
  colScore: { width: "9%" },
  colFindings: { width: "9%" },
  colStatus: { width: "15%" },
  colDate: { width: "10%" },
  footer: {
    position: "absolute",
    bottom: 20,
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

type Summary = Awaited<ReturnType<typeof getReportSummary>>;
type Inspection = Awaited<ReturnType<typeof getReportInspections>>[number];

export function ReportDocument({
  from,
  to,
  summary,
  inspections,
  generatedAt,
  generatedBy,
  timeZone,
}: {
  from: Date;
  to: Date;
  summary: Summary;
  inspections: Inspection[];
  generatedAt: Date;
  generatedBy: string;
  timeZone: string;
}) {
  return (
    <Document
      title={`Eagle Labs Report ${formatDayInTimeZone(from, timeZone)}–${formatDayInTimeZone(to, timeZone)}`}
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.eyebrow}>EAGLE LABS</Text>
        <Text style={styles.title}>Operations Report</Text>
        <Text style={styles.subtitle}>
          {formatDayInTimeZone(from, timeZone)} – {formatDayInTimeZone(to, timeZone)}
        </Text>

        <View style={styles.kpiRow}>
          <KpiTile label="Inspections" value={String(summary.total)} />
          <KpiTile
            label="Completed"
            value={
              summary.completionRate !== null
                ? `${summary.completionRate}%`
                : "—"
            }
          />
          <KpiTile
            label="Avg score"
            value={summary.avgScore !== null ? `${summary.avgScore}%` : "—"}
          />
          <KpiTile label="Open findings" value={String(summary.openFindings)} />
          <KpiTile
            label="Critical findings"
            value={String(summary.criticalFindings)}
          />
          <KpiTile
            label="Overdue CAs"
            value={String(summary.overdueCorrectiveActions)}
          />
        </View>

        <View style={styles.tableHeaderRow} fixed>
          <Text style={[styles.th, styles.colChecklist]}>Checklist</Text>
          <Text style={[styles.th, styles.colArea]}>Area</Text>
          <Text style={[styles.th, styles.colOperator]}>Operator</Text>
          <Text style={[styles.th, styles.colScore]}>Score</Text>
          <Text style={[styles.th, styles.colFindings]}>Findings</Text>
          <Text style={[styles.th, styles.colStatus]}>Status</Text>
          <Text style={[styles.th, styles.colDate]}>Date</Text>
        </View>

        {inspections.map((insp) => {
          const meta = INSPECTION_STATUS_META[insp.status];
          return (
            <View key={insp.id} style={styles.tableRow} wrap={false}>
              <Text style={[styles.td, styles.colChecklist]}>
                {insp.checklistVersion.checklist.name}
              </Text>
              <Text style={[styles.td, styles.colArea]}>
                {insp.area?.name ?? insp.section?.name ?? "—"}
              </Text>
              <Text style={[styles.td, styles.colOperator]}>
                {insp.operator?.name ?? "—"}
              </Text>
              <Text style={[styles.td, styles.colScore]}>
                {insp.score !== null ? `${insp.score}%` : "—"}
              </Text>
              <Text style={[styles.td, styles.colFindings]}>
                {insp.findings.length || "—"}
              </Text>
              <Text
                style={[
                  styles.td,
                  styles.colStatus,
                  { color: TONE_COLOR[meta?.tone ?? "neutral"] },
                ]}
              >
                {meta?.label ?? insp.status}
              </Text>
              <Text style={[styles.td, styles.colDate]}>
                {formatDayInTimeZone(insp.createdAt, timeZone)}
              </Text>
            </View>
          );
        })}

        {inspections.length === 0 && (
          <Text style={{ marginTop: 12, color: COLORS.muted }}>
            No inspections in this range.
          </Text>
        )}

        <View style={styles.footer} fixed>
          <Text>
            Generated {formatDateTimeInTimeZone(generatedAt, timeZone)} by{" "}
            {generatedBy}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpiTile}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  );
}
