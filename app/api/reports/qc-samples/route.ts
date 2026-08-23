import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SAMPLE_TYPE_LABEL, IN_LAB_STATUSES } from "@/lib/qc-sample-defaults";
import { QC_SAMPLE_STATUS_META } from "@/lib/status";
import type { Prisma } from "@/app/generated/prisma/client";

function csvEscape(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toRow(values: (string | number | null | undefined)[]): string {
  return values.map(csvEscape).join(",");
}

const SAMPLE_INCLUDE = {
  collectedBy: { select: { name: true } },
  receivedByQc: { select: { name: true } },
  retentionRecord: true,
  labTest: { include: { testedBy: { select: { name: true } }, items: true } },
} satisfies Prisma.QcSampleInclude;

type SampleRow = Prisma.QcSampleGetPayload<{ include: typeof SAMPLE_INCLUDE }>;

const SAMPLE_HEADER = ["Sample ID", "Product", "Batch", "Type", "Status", "Collected By", "Collection Date", "Production Room / Bay", "Quantity"];

function isoDate(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

function baseRow(s: SampleRow): (string | number | null)[] {
  return [
    s.sampleId,
    s.productName,
    s.batchNumber,
    SAMPLE_TYPE_LABEL[s.sampleType],
    QC_SAMPLE_STATUS_META[s.status]?.label ?? s.status,
    s.collectedBy?.name ?? "",
    isoDate(s.collectionDate),
    s.productionRoom ?? "",
    `${s.quantity} ${s.unit}`,
  ];
}

function csvResponse(filenameSuffix: string, rows: string[]): NextResponse {
  const csv = rows.join("\r\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="qc-samples-${filenameSuffix}.csv"`,
    },
  });
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const type = request.nextUrl.searchParams.get("type");

  if (type === "filtered") {
    const ids = (request.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean);
    const rows = await db.qcSample.findMany({ where: { id: { in: ids } }, include: SAMPLE_INCLUDE, orderBy: { createdAt: "desc" } });
    return csvResponse("filtered", [toRow(SAMPLE_HEADER), ...rows.map((r) => toRow(baseRow(r)))]);
  }

  if (type === "daily-collection") {
    const dateParam = request.nextUrl.searchParams.get("date");
    const day = dateParam ? new Date(dateParam) : new Date();
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const end = new Date(start.getTime() + 86_400_000);
    const rows = await db.qcSample.findMany({ where: { collectionDate: { gte: start, lt: end } }, include: SAMPLE_INCLUDE, orderBy: { collectionDate: "asc" } });
    return csvResponse("daily-collection", [toRow(SAMPLE_HEADER), ...rows.map((r) => toRow(baseRow(r)))]);
  }

  if (type === "pending-testing") {
    const rows = await db.qcSample.findMany({ where: { status: { in: [...IN_LAB_STATUSES] } }, include: SAMPLE_INCLUDE, orderBy: { receivedDate: "asc" } });
    return csvResponse("pending-testing", [toRow(SAMPLE_HEADER), ...rows.map((r) => toRow(baseRow(r)))]);
  }

  if (type === "approved") {
    const rows = await db.qcSample.findMany({ where: { status: { in: ["APPROVED", "RETENTION"] } }, include: SAMPLE_INCLUDE, orderBy: { createdAt: "desc" } });
    return csvResponse("approved", [toRow(SAMPLE_HEADER), ...rows.map((r) => toRow(baseRow(r)))]);
  }

  if (type === "failed") {
    const rows = await db.qcSample.findMany({ where: { status: "REJECTED" }, include: SAMPLE_INCLUDE, orderBy: { createdAt: "desc" } });
    const header = [...SAMPLE_HEADER, "Remarks"];
    return csvResponse("failed", [toRow(header), ...rows.map((r) => toRow([...baseRow(r), r.remarks ?? ""]))]);
  }

  if (type === "retention-inventory") {
    const rows = await db.qcSample.findMany({ where: { status: "RETENTION" }, include: SAMPLE_INCLUDE, orderBy: { createdAt: "desc" } });
    const header = [...SAMPLE_HEADER, "Shelf", "Cabinet", "Box", "Qty Remaining", "Expiry"];
    return csvResponse(
      "retention-inventory",
      [
        toRow(header),
        ...rows.map((r) =>
          toRow([
            ...baseRow(r),
            r.retentionRecord?.shelf ?? "",
            r.retentionRecord?.cabinet ?? "",
            r.retentionRecord?.boxNumber ?? "",
            r.retentionRecord?.quantityRemaining ?? "",
            isoDate(r.retentionRecord?.expiryDate),
          ])
        ),
      ]
    );
  }

  if (type === "retention-expiry") {
    const rows = await db.qcSample.findMany({ where: { retentionRecord: { isNot: null } }, include: SAMPLE_INCLUDE, orderBy: { retentionRecord: { expiryDate: "asc" } } });
    const header = [...SAMPLE_HEADER, "Expiry", "Destroy Date"];
    return csvResponse(
      "retention-expiry",
      [
        toRow(header),
        ...rows.map((r) => toRow([...baseRow(r), isoDate(r.retentionRecord?.expiryDate), isoDate(r.retentionRecord?.destroyDate)])),
      ]
    );
  }

  if (type === "coa") {
    const rows = await db.qcSample.findMany({ where: { labTest: { isNot: null } }, include: SAMPLE_INCLUDE, orderBy: { createdAt: "desc" } });
    const header = [...SAMPLE_HEADER, "COA Upload", "Tested By"];
    return csvResponse(
      "coa",
      [
        toRow(header),
        ...rows.map((r) => {
          const coaItem = r.labTest?.items.find((it) => it.parameter === "COA Upload");
          return toRow([...baseRow(r), coaItem?.details ?? coaItem?.result ?? "", r.labTest?.testedBy?.name ?? ""]);
        }),
      ]
    );
  }

  if (type === "history-by-batch") {
    const rows = await db.qcSample.findMany({ include: SAMPLE_INCLUDE, orderBy: [{ batchNumber: "asc" }, { createdAt: "asc" }] });
    return csvResponse("history-by-batch", [toRow(SAMPLE_HEADER), ...rows.map((r) => toRow(baseRow(r)))]);
  }

  if (type === "qc-performance") {
    const rows = await db.qcSample.findMany({ where: { labTest: { isNot: null } }, include: SAMPLE_INCLUDE, orderBy: { createdAt: "desc" } });
    const header = [...SAMPLE_HEADER, "Received At Lab", "Tested At", "Turnaround (days)"];
    return csvResponse(
      "qc-performance",
      [
        toRow(header),
        ...rows.map((r) => {
          const turnaround =
            r.receivedDate && r.labTest?.testedAt ? Math.round((r.labTest.testedAt.getTime() - r.receivedDate.getTime()) / 86_400_000) : "";
          return toRow([...baseRow(r), isoDate(r.receivedDate), r.labTest?.testedAt ? r.labTest.testedAt.toLocaleString("en-AU") : "", turnaround]);
        }),
      ]
    );
  }

  if (type === "monthly-summary") {
    const rows = await db.qcSample.findMany({ orderBy: { createdAt: "asc" }, select: { createdAt: true, status: true } });
    const counts = new Map<string, number>();
    for (const r of rows) {
      const month = r.createdAt.toISOString().slice(0, 7);
      const key = `${month}|${QC_SAMPLE_STATUS_META[r.status]?.label ?? r.status}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const header = ["Month", "Status", "Count"];
    const dataRows = [...counts.entries()].sort().map(([key, count]) => {
      const [month, status] = key.split("|");
      return toRow([month, status, count]);
    });
    return csvResponse("monthly-summary", [toRow(header), ...dataRows]);
  }

  return NextResponse.json({ error: "Unknown export type" }, { status: 400 });
}
