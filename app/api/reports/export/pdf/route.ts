import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getUserScope } from "@/lib/scope";
import { getReportInspections, getReportSummary, resolveReportRange, type ReportFilters } from "@/lib/data/reports";
import { getFacilityTimezone } from "@/lib/timezone";
import { ReportDocument } from "@/lib/pdf/report-document";

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
  const { from, to } = await resolveReportRange(filters);
  const [summary, inspections, timeZone] = await Promise.all([
    getReportSummary(filters, scope),
    getReportInspections(filters, scope, 500),
    getFacilityTimezone(),
  ]);

  const buffer = await renderToBuffer(
    ReportDocument({ from, to, summary, inspections, generatedAt: new Date(), generatedBy: session.user.name ?? session.user.email ?? "", timeZone })
  );

  const filename = `webops-report_${filters.from ?? "start"}_${filters.to ?? "end"}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
