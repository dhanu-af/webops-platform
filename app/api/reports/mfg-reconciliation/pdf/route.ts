import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { getMfgBatchDetail } from "@/lib/data/mfg-reconciliation";
import { MfgReconciliationDocument } from "@/lib/pdf/mfg-reconciliation-document";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const batch = await getMfgBatchDetail(id);
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  const buffer = await renderToBuffer(MfgReconciliationDocument({ batch, generatedAt: new Date() }));

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${batch.batchNumber}-reconciliation.pdf"`,
    },
  });
}
