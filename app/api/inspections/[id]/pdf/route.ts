import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { getFacilityTimezone } from "@/lib/timezone";
import { getInspectionRecord } from "@/lib/data/inspection-record";
import { InspectionRecordDocument } from "@/lib/pdf/inspection-record-document";
import { logAudit } from "@/lib/audit";
import { APP_VERSION_STAMP } from "@/lib/app-version";

export const maxDuration = 30;

// One inspection as a complete GMP record: answers, failures and corrective
// actions, electronic signatures, and the full audit trail (URS-15).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { id } = await params;
  const [record, timeZone] = await Promise.all([getInspectionRecord(id, getUserScope(session.user)), getFacilityTimezone()]);
  if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 });

  const buffer = await renderToBuffer(
    InspectionRecordDocument({ record, timeZone, generatedAt: new Date(), generatedBy: session.user.name ?? "Unknown", releaseStamp: APP_VERSION_STAMP })
  );

  // Who printed or exported a record is itself part of the trail.
  await logAudit({
    entityType: "Inspection",
    entityId: id,
    inspectionId: id,
    action: "RECORD_EXPORTED",
    userId: session.user.id,
    reason: "Record exported to PDF",
  }).catch((e) => console.error("Failed to audit PDF export:", e));

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${record.inspection.checklistVersion.checklist.name.replace(/[^A-Za-z0-9]+/g, "-")}-${id}.pdf"`,
    },
  });
}
