import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatDateTimeInTimeZone } from "@/lib/timezone";
import { INSPECTION_STATUS_META } from "@/lib/status";
import { recordStatus } from "@/lib/record-status";
import type { InspectionRecord } from "@/lib/data/inspection-record";

// A complete, printable GMP record (URS-15): header, every answer, failures and
// corrective actions, all electronic signatures, and the full audit trail.

const COLORS = { ink: "#14181f", muted: "#5b6472", border: "#d5d9e0", head: "#eef1f5", fail: "#c2262e", pass: "#147a4a" };

const s = StyleSheet.create({
  page: { paddingTop: 30, paddingHorizontal: 30, paddingBottom: 46, fontSize: 8.5, fontFamily: "Helvetica", color: COLORS.ink },
  org: { fontSize: 8, color: COLORS.muted, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 3 },
  sub: { fontSize: 8.5, color: COLORS.muted, marginTop: 2, marginBottom: 10 },
  h2: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 4 },
  group: { fontSize: 8, fontFamily: "Helvetica-Bold", color: COLORS.muted, marginTop: 8, marginBottom: 2, letterSpacing: 0.6 },
  kv: { flexDirection: "row", flexWrap: "wrap", borderTopWidth: 0.5, borderLeftWidth: 0.5, borderColor: COLORS.border },
  kvCell: { width: "50%", flexDirection: "row", borderRightWidth: 0.5, borderBottomWidth: 0.5, borderColor: COLORS.border },
  kvKey: { width: "38%", padding: 4, backgroundColor: COLORS.head, fontFamily: "Helvetica-Bold" },
  kvVal: { width: "62%", padding: 4 },
  table: { borderTopWidth: 0.5, borderLeftWidth: 0.5, borderColor: COLORS.border },
  tr: { flexDirection: "row" },
  th: { padding: 3.5, backgroundColor: COLORS.head, fontFamily: "Helvetica-Bold", borderRightWidth: 0.5, borderBottomWidth: 0.5, borderColor: COLORS.border },
  td: { padding: 3.5, borderRightWidth: 0.5, borderBottomWidth: 0.5, borderColor: COLORS.border },
  footer: { position: "absolute", bottom: 20, left: 30, right: 30, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: COLORS.muted },
});

type Row = { cells: string[]; widths: string[]; fail?: boolean };

function Table({ headers, widths, rows }: { headers: string[]; widths: string[]; rows: Row[] }) {
  return (
    <View style={s.table}>
      <View style={s.tr} fixed>
        {headers.map((h, i) => (
          <Text key={i} style={[s.th, { width: widths[i] }]}>
            {h}
          </Text>
        ))}
      </View>
      {rows.map((r, ri) => (
        <View key={ri} style={s.tr} wrap={false}>
          {r.cells.map((c, i) => (
            <Text key={i} style={[s.td, { width: widths[i] }, r.fail && i === 1 ? { color: COLORS.fail, fontFamily: "Helvetica-Bold" } : {}]}>
              {c}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function answerText(
  item: InspectionRecord["inspection"]["checklistVersion"]["items"][number],
  r: InspectionRecord["inspection"]["responses"][number] | undefined
): string {
  if (!r) return "— not answered —";
  if (item.type === "NUMERIC" && r.numericValue !== null) {
    const range = item.minValue !== null && item.maxValue !== null ? ` (range ${item.minValue}–${item.maxValue})` : "";
    return `${r.numericValue}${range}${r.passFail === "FAIL" ? " — OUT OF RANGE" : ""}`;
  }
  if (item.type === "TEXT") return r.textValue?.trim() || "— blank —";
  if (r.choiceValue) return r.passFail === "FAIL" ? `${r.choiceValue} (FAIL)` : r.choiceValue;
  if (r.passFail) return item.type === "YES_NO" ? (r.passFail === "PASS" ? "YES" : r.passFail === "FAIL" ? "NO" : "N/A") : r.passFail === "NA" ? "N/A" : r.passFail;
  return "— blank —";
}

const fmtVal = (v: unknown): string => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") {
    const o = v as { item?: string; value?: unknown };
    return `${o.item ? `${o.item}: ` : ""}${o.value === undefined ? JSON.stringify(v) : String(o.value ?? "—")}`;
  }
  return String(v);
};

export function InspectionRecordDocument({
  record,
  timeZone,
  generatedAt,
  generatedBy,
  releaseStamp,
}: {
  record: InspectionRecord;
  timeZone: string;
  generatedAt: Date;
  generatedBy: string;
  releaseStamp: string;
}) {
  const { inspection: i, organizationName, retentionYears } = record;
  const when = (d: Date | null | undefined) => (d ? formatDateTimeInTimeZone(d, timeZone) : "—");
  const responseByItem = new Map(i.responses.map((r) => [r.checklistItemId, r]));
  const groups = new Map<string, typeof i.checklistVersion.items>();
  for (const it of i.checklistVersion.items) groups.set(it.groupLabel, [...(groups.get(it.groupLabel) ?? []), it]);

  const header: Array<[string, string]> = [
    ["Area / line", i.area?.name ?? i.section?.name ?? i.facility.name],
    ["Equipment", i.equipment?.name ?? "—"],
    ["Previous product / batch", [i.previousProduct, i.previousBatchNumber].filter(Boolean).join(" / ") || "—"],
    ["Product / batch (next)", [i.product, i.batchNumber].filter(Boolean).join(" / ") || "—"],
    ["Operator", i.operator?.name ?? "—"],
    ["Frequency", i.frequency.replace(/_/g, " ")],
    ["Started (server time)", when(i.startedAt)],
    ["Submitted (server time)", when(i.submittedAt)],
    ["Checklist template version", `v${i.checklistVersion.versionNumber}`],
    ["Application release", i.appVersion ?? "—"],
    ["Record status", `${recordStatus(i.status)} (${INSPECTION_STATUS_META[i.status]?.label ?? i.status})`],
    ...(i.noProductionReason ? ([["No production", i.noProductionReason]] as Array<[string, string]>) : []),
    ["Line release", i.areaRelease ? `${i.areaRelease.status.replace(/_/g, " ")}${i.areaRelease.releasedAt ? ` — ${when(i.areaRelease.releasedAt)}` : ""}` : "n/a"],
  ];

  const findings = i.responses.filter((r) => r.finding);

  return (
    <Document title={`${i.checklistVersion.checklist.name} — ${i.id}`}>
      <Page size="A4" style={s.page}>
        <Text style={s.org}>{(organizationName ?? "GMP RECORD").toUpperCase()}</Text>
        <Text style={s.title}>{i.checklistVersion.checklist.name}</Text>
        <Text style={s.sub}>
          Record {i.id} · printed {when(generatedAt)} by {generatedBy}
        </Text>

        <View style={s.kv}>
          {header.map(([k, v]) => (
            <View key={k} style={s.kvCell}>
              <Text style={s.kvKey}>{k}</Text>
              <Text style={s.kvVal}>{v}</Text>
            </View>
          ))}
        </View>

        <Text style={s.h2}>Checklist answers</Text>
        {Array.from(groups.entries()).map(([group, items]) => (
          <View key={group}>
            <Text style={s.group}>{group}</Text>
            <Table
              headers={["Item", "Answer", "Remarks", "Entered by / at"]}
              widths={["38%", "20%", "20%", "22%"]}
              rows={items.map((it) => {
                const r = responseByItem.get(it.id);
                return {
                  cells: [it.prompt, answerText(it, r), r?.comment ?? "", r ? `${r.respondedBy?.name ?? "—"}\n${when(r.updatedAt)}` : ""],
                  widths: [],
                  fail: r?.passFail === "FAIL",
                };
              })}
            />
          </View>
        ))}

        <Text style={s.h2}>Failures and corrective actions</Text>
        {findings.length === 0 ? (
          <Text style={{ color: COLORS.muted }}>No failures were recorded.</Text>
        ) : (
          <Table
            headers={["Failed item", "Corrective action", "Owner / due", "Sign-off"]}
            widths={["28%", "30%", "20%", "22%"]}
            rows={findings.map((r) => {
              const f = r.finding!;
              const ca = f.correctiveAction;
              return {
                cells: [
                  `${f.description}\nSeverity: ${f.severity}${f.reason ? `\n${f.reason}` : ""}`,
                  ca ? `${ca.correctiveAction}${ca.rootCause ? `\nRoot cause: ${ca.rootCause}` : ""}` : "NONE RECORDED",
                  ca ? `${ca.responsibleUser.name}\n${when(ca.dueDate)}` : "—",
                  ca?.verifiedAt ? `${ca.verifiedBy?.name ?? "—"}\n${when(ca.verifiedAt)}` : "Awaiting sign-off",
                ],
                widths: [],
              };
            })}
          />
        )}

        <Text style={s.h2}>Electronic signatures</Text>
        {i.verificationRecords.length === 0 ? (
          <Text style={{ color: COLORS.muted }}>Not yet verified.</Text>
        ) : (
          <Table
            headers={["Meaning", "Signed by", "Role", "Date / time (server)", "Comment"]}
            widths={["14%", "22%", "14%", "26%", "24%"]}
            rows={i.verificationRecords.map((v) => ({
              cells: [
                v.meaning ?? v.action,
                v.signerName ?? v.actor.name,
                (v.signerRole ?? v.actor.role).replace(/_/g, " "),
                `${when(v.createdAt)}${v.passwordReverified ? "\nPassword re-entered" : ""}`,
                v.comment ?? "",
              ],
              widths: [],
            }))}
          />
        )}

        <Text style={s.h2}>Audit trail (read-only)</Text>
        <Table
          headers={["When", "Who", "Action", "Field", "Old → New", "Reason"]}
          widths={["17%", "14%", "13%", "10%", "28%", "18%"]}
          rows={i.auditLogEntries.map((a) => ({
            cells: [
              when(a.createdAt),
              `${a.user.name}\n${a.user.role.replace(/_/g, " ")}`,
              a.action.replace(/_/g, " "),
              a.fieldName ?? "",
              a.oldValue !== null || a.newValue !== null ? `${fmtVal(a.oldValue)} → ${fmtVal(a.newValue)}` : "",
              a.reason ?? "",
            ],
            widths: [],
          }))}
        />

        <View style={s.footer} fixed>
          <Text>
            Release {releaseStamp} · retained at least {retentionYears} years · uncontrolled when printed
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
