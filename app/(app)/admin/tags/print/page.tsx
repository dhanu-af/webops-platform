import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { listTagRows, resolveTagBase } from "@/lib/tag-links";
import { PrintButton } from "@/components/admin/print-button";

export const dynamic = "force-dynamic";

// A sheet of QR codes, one label per area and machine, to print and stick next to each NFC tag.
export default async function PrintTagsPage({ searchParams }: { searchParams: Promise<{ base?: string }> }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "areas.manage")) notFound();

  const { base: requested } = await searchParams;
  const rows = await listTagRows(await resolveTagBase(requested));
  const labels = await Promise.all(rows.map(async (r) => ({ ...r, svg: await QRCode.toString(r.url, { type: "svg", margin: 1, errorCorrectionLevel: "M" }) })));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">QR codes for machine tags</h1>
          <p className="text-sm text-muted">{labels.length} labels. Print on A4 (Ctrl/Cmd + P). Cut along the lines.</p>
        </div>
        <PrintButton />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3 print:gap-0">
        {labels.map((l) => (
          <div key={l.url} className="break-inside-avoid border border-dashed border-border-strong p-3 text-center print:border-gray-400">
            <div className="mx-auto size-36 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: l.svg }} />
            <p className="mt-2 text-sm font-semibold leading-tight text-foreground">{l.name}</p>
            <p className="text-[11px] leading-tight text-muted">{l.kind === "Document" ? "Document" : l.kind === "Area" ? `Area · ${l.area}` : l.area}{l.code ? ` · ${l.code}` : ""}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
