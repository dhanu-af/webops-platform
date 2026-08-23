import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { getFormulationDetail } from "@/lib/data/formulations";
import { canConvertUnit } from "@/lib/formulation-calc";
import { FormulationDocument } from "@/lib/pdf/formulation-document";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { id } = await params;
  const formulation = await getFormulationDetail(id);
  if (!formulation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const search = request.nextUrl.searchParams;
  const batchSize = Number(search.get("batchSize") ?? formulation.baseBatchSize);
  const batchNumber = search.get("batchNumber") ?? "";
  const enteredBy = search.get("enteredBy") ?? "";
  const checkedBy = search.get("checkedBy") ?? "";
  const calcDate = search.get("calcDate") ?? "";

  const requestedUnit = (search.get("unit") ?? formulation.baseUnit).trim().toLowerCase();
  const calcUnit = canConvertUnit(formulation.baseUnit) && canConvertUnit(requestedUnit) ? requestedUnit : formulation.baseUnit;

  const buffer = await renderToBuffer(
    FormulationDocument({ formulation, batchSize, calcUnit, batchNumber, enteredBy, checkedBy, calcDate })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${formulation.productName.replace(/[^a-z0-9]/gi, "_")}_formulation.pdf"`,
    },
  });
}
