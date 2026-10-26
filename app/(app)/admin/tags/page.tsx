import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { listTagRows, resolveTagBase } from "@/lib/tag-links";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function TagsAdminPage({ searchParams }: { searchParams: Promise<{ base?: string }> }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "areas.manage")) notFound();

  const { base: requested } = await searchParams;
  const base = await resolveTagBase(requested);
  const rows = await listTagRows(base);
  const query = `?base=${encodeURIComponent(base)}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Machine tags</h1>
        <p className="text-sm text-muted">One tag per machine and area. Scanning it opens that machine&apos;s checks on a registered shop-floor iPad.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Address on the tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <p className="text-sm text-muted">
            Every tag carries a web address. Use the address you will keep using for good (your own domain, not a temporary one), because a printed tag cannot be changed and an iPad is
            registered for one address. Tags themselves contain only a random code, no names or other details.
          </p>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="min-w-[16rem] flex-1">
              <label className="text-xs font-medium text-muted-strong">Address</label>
              <input name="base" defaultValue={base} className="mt-1.5 block w-full rounded-lg border border-border-strong bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-accent" />
            </div>
            <Button size="sm" variant="secondary" type="submit">
              Update
            </Button>
          </form>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" href={`/admin/tags/print${query}`}>
              Print QR codes
            </Button>
            <a
              href={`/api/admin/tags/csv${query}`}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border-strong bg-surface px-3 text-xs font-medium text-foreground shadow-[var(--shadow-xs)] hover:bg-surface-sunken pointer-coarse:h-11"
            >
              Download list for NFC tags (CSV)
            </a>
          </div>
          <p className="text-xs text-muted">
            NFC: with a free app such as &ldquo;NFC Tools&rdquo; on a phone, write the address as a URL record onto each tag, then stick it on the machine (metal-mount tags if the surface is steel).
            iPads cannot read NFC tags, so put the printed QR code next to every tag as well. iPhones and Android phones can tap the tag directly. Stuck tags can be covered with clear tape or a label.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{rows.length} tags</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="divide-y divide-border">
            {rows.map((r) => (
              <div key={r.url} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div>
                  <span className="font-medium text-foreground">{r.name}</span> <span className="text-xs text-muted">· {r.kind} · {r.area} · {r.code}</span>
                </div>
                <span className="font-mono text-xs text-muted">{r.url.replace(base, "")}</span>
              </div>
            ))}
            {rows.length === 0 && <p className="py-4 text-sm text-muted">No areas or machines yet. Add them under <Link className="text-accent hover:underline" href="/admin/areas">Areas &amp; Equipment</Link>.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
