import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { listDryingBays, listMiscStorageItems } from "@/lib/data/drying-room";
import { DryingRoomReportDocument } from "@/lib/pdf/drying-room-report-document";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const [bays, misc] = await Promise.all([listDryingBays(), listMiscStorageItems()]);

  const buffer = await renderToBuffer(DryingRoomReportDocument({ bays, misc, generatedAt: new Date() }));

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Production_Staging_Report_${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
