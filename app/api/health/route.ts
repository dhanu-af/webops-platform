import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { APP_VERSION_STAMP } from "@/lib/app-version";

// Public, no data: used by the uptime monitor (.github/workflows/uptime-check.yml).
// Plain GET answers "is the app up"; ?deep=1 also proves the database answers.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const base = { version: APP_VERSION_STAMP, time: new Date().toISOString() };

  if (new URL(request.url).searchParams.get("deep") !== "1") {
    return NextResponse.json({ status: "ok", ...base }, { headers });
  }

  const started = Date.now();
  try {
    await db.$queryRaw`select 1`;
    return NextResponse.json({ status: "ok", database: "ok", dbMs: Date.now() - started, ...base }, { headers });
  } catch {
    return NextResponse.json({ status: "degraded", database: "unreachable", ...base }, { status: 503, headers });
  }
}
