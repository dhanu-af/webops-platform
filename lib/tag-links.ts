import { headers } from "next/headers";
import { db } from "@/lib/db";

/** The address printed on tags: the one asked for if it is a real web address, otherwise the address being used right now. */
export async function resolveTagBase(requested: string | undefined): Promise<string> {
  if (requested) {
    try {
      const url = new URL(requested);
      if (url.protocol === "https:" || url.protocol === "http:") return url.origin;
    } catch {
      // fall through to the current address
    }
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export type TagRow = { kind: "Area" | "Machine"; name: string; area: string; code: string; url: string };

/** Every area and machine with the address its tag opens. */
export async function listTagRows(base: string): Promise<TagRow[]> {
  const areas = await db.area.findMany({
    where: { archived: false },
    select: {
      name: true,
      code: true,
      qrToken: true,
      section: { select: { name: true } },
      equipment: { where: { archived: false }, select: { name: true, code: true, qrToken: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
    },
    orderBy: [{ section: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });
  const rows: TagRow[] = [];
  for (const a of areas) {
    rows.push({ kind: "Area", name: a.name, area: a.section.name, code: a.code, url: `${base}/k/t/${a.qrToken}` });
    for (const e of a.equipment) rows.push({ kind: "Machine", name: e.name, area: a.name, code: e.code, url: `${base}/k/t/${e.qrToken}` });
  }
  return rows;
}
