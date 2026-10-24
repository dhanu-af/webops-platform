import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { liveSession } from "@/lib/session-user";
import { formatDateInTimeZone, formatDateTimeInTimeZone, getFacilityTimezone } from "@/lib/timezone";
import { listDryingBays, listMiscStorageItems } from "@/lib/data/drying-room";
import { DryingRoomReportDocument } from "@/lib/pdf/drying-room-report-document";

export async function GET() {
  const session = await liveSession();
  if (!session?.user) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const [bays, misc, timeZone] = await Promise.all([listDryingBays(), listMiscStorageItems(), getFacilityTimezone()]);
  const now = new Date();

  const buffer = await renderToBuffer(DryingRoomReportDocument({ bays, misc, generatedAt: formatDateTimeInTimeZone(now, timeZone) }));

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Production_Staging_Report_${formatDateInTimeZone(now, timeZone)}.pdf"`,
    },
  });
}
