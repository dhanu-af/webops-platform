import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getUserScope } from "@/lib/scope";
import { getReportInspections, type ReportFilters } from "@/lib/data/reports";
import { INSPECTION_STATUS_META } from "@/lib/status";

function csvEscape(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toRow(values: (string | number | null | undefined)[]): string {
  return values.map(csvEscape).join(",");
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "reports.export")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const filters: ReportFilters = {
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
    areaId: searchParams.get("areaId") || undefined,
    frequency: searchParams.get("frequency") || undefined,
    status: searchParams.get("status") || undefined,
  };

  const scope = getUserScope(session.user);
  const inspections = await getReportInspections(filters, scope, 5000);

  const header = [
    "Checklist",
    "Facility",
    "Section",
    "Area",
    "Equipment",
    "Frequency",
    "Status",
    "Score %",
    "Operator",
    "Supervisor",
    "QA",
    "Open Findings",
    "Critical Findings",
    "Created At",
    "Submitted At",
  ];

  const rows = inspections.map((insp) =>
    toRow([
      insp.checklistVersion.checklist.name,
      insp.facility.name,
      insp.section?.name,
      insp.area?.name,
      insp.equipment?.name,
      insp.frequency,
      INSPECTION_STATUS_META[insp.status]?.label ?? insp.status,
      insp.score ?? "",
      insp.operator?.name,
      insp.supervisor?.name,
      insp.qa?.name,
      insp.findings.filter((f) => f.status !== "CLOSED").length,
      insp.findings.filter((f) => f.severity === "CRITICAL" && f.status !== "CLOSED").length,
      format(insp.createdAt, "yyyy-MM-dd HH:mm"),
      insp.submittedAt ? format(insp.submittedAt, "yyyy-MM-dd HH:mm") : "",
    ])
  );

  const csv = [toRow(header), ...rows].join("\r\n");
  const filename = `webops-report_${filters.from ?? "start"}_${filters.to ?? "end"}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
