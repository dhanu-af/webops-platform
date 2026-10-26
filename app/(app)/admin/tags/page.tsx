import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { listTagRows, resolveTagBase, type TagRow } from "@/lib/tag-links";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyLinkButton, TagWrittenButton } from "@/components/admin/tag-actions";

export const dynamic = "force-dynamic";

function TagList({ rows, base, documents }: { rows: TagRow[]; base: string; documents?: boolean }) {
  if (rows.length === 0) return <p className="py-4 text-sm text-muted">None yet.</p>;
  return (
    <div className="divide-y divide-border">
      {rows.map((r) => (
        <div key={r.url} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
          <div className="min-w-0">
            <span className="font-medium text-foreground">{r.name}</span>{" "}
            <span className="text-xs text-muted">· {r.area}{r.code ? ` · ${r.code}` : ""}</span>
            <p className="font-mono text-xs text-muted">{r.url.replace(base, "")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {documents && <Badge tone={r.written ? "pass" : "warn"}>{r.written ? "Tag written" : "Needs a tag"}</Badge>}
            <CopyLinkButton url={r.url} />
            <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-lg px-2 text-xs font-medium text-accent hover:underline pointer-coarse:h-11">
              Open
            </a>
            {documents && r.checklistId && <TagWrittenButton checklistId={r.checklistId} written={!!r.written} />}
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function TagsAdminPage({ searchParams }: { searchParams: Promise<{ base?: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") notFound();

  const { base: requested } = await searchParams;
  const base = await resolveTagBase(requested);
  const rows = await listTagRows(base);
  const query = `?base=${encodeURIComponent(base)}`;
  const documents = rows.filter((r) => r.kind === "Document");
  const needTag = documents.filter((d) => !d.written).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">NFC tags and QR codes</h1>
        <p className="text-sm text-muted">One tag per document (checklist), machine and area. Tapping or scanning it opens that document or machine on the shop floor.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How to get a tag link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-2 text-sm text-muted">
          <p>1. Find the document below and press <span className="font-medium text-foreground">Copy link</span> (or download all links as a CSV).</p>
          <p>2. On a phone, open an NFC writer app (for example &ldquo;NFC Tools&rdquo;): Write &rarr; Add a record &rarr; URL/URI &rarr; paste the link &rarr; Write, then hold the phone on the blank tag.</p>
          <p>3. Stick the tag on the document or its folder, then press <span className="font-medium text-foreground">Mark tag as written</span> so nobody forgets it.</p>
          <p>
            <span className="font-medium text-foreground">New documents get a tag link automatically</span> the moment you create them in the Checklist Builder. They appear at the top of the list below
            as &ldquo;Needs a tag&rdquo;. Each document&apos;s own page in the Checklist Builder also shows its link and QR code.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Documents ({documents.length}){needTag > 0 && <span className="ml-2 text-sm font-medium text-status-warn">{needTag} need a tag</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <TagList rows={documents} base={base} documents />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address on the tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <p className="text-sm text-muted">
            Every tag carries a web address. Use the address you will keep using for good (your own domain, not a temporary one), because a written tag cannot be changed. Tags contain only a random
            code, no names or other details.
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
              Download all links (CSV)
            </a>
          </div>
          <p className="text-xs text-muted">
            iPads cannot read NFC tags, so put the printed QR code next to every tag as well. iPhones and Android phones tap the tag directly. Use metal-mount tags on steel, and cover a tag with
            clear tape or a label if it is in a wet area.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Areas ({rows.filter((r) => r.kind === "Area").length})</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <TagList rows={rows.filter((r) => r.kind === "Area")} base={base} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Machines ({rows.filter((r) => r.kind === "Machine").length})</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <TagList rows={rows.filter((r) => r.kind === "Machine")} base={base} />
          {rows.length === 0 && (
            <p className="py-4 text-sm text-muted">
              Nothing yet. Add areas and machines under <Link className="text-accent hover:underline" href="/admin/areas">Areas &amp; Equipment</Link>.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
