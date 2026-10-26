import { NextResponse, type NextRequest } from "next/server";
import { liveSession } from "@/lib/session-user";
import { listTagRows, resolveTagBase } from "@/lib/tag-links";

// The list of tag addresses, for writing the NFC tags with a phone app.
export async function GET(request: NextRequest) {
  const session = await liveSession("areas.manage");
  if (session?.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const rows = await listTagRows(await resolveTagBase(request.nextUrl.searchParams.get("base") ?? undefined));
  const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [["Type", "Name", "Area / Section", "Code", "Address to write on the tag"].map(cell).join(","), ...rows.map((r) => [r.kind, r.name, r.area, r.code, r.url].map(cell).join(","))].join("\r\n");

  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="machine-tags.csv"', "Cache-Control": "no-store" },
  });
}
