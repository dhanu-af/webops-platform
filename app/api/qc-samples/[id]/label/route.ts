import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { QcSampleLabelDocument } from "@/lib/pdf/qc-sample-label-document";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { id } = await params;
  const sample = await db.qcSample.findUnique({
    where: { id },
    select: { sampleId: true, productName: true, batchNumber: true },
  });
  if (!sample) return NextResponse.json({ error: "Sample not found" }, { status: 404 });

  const scanUrl = `${request.nextUrl.origin}/qc-samples?sample=${encodeURIComponent(sample.sampleId)}`;
  const qrDataUri = await QRCode.toDataURL(scanUrl, { margin: 1, width: 300 });

  const buffer = await renderToBuffer(QcSampleLabelDocument({ sample, qrDataUri }));

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${sample.sampleId}-label.pdf"`,
    },
  });
}
