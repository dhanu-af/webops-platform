import QRCode from "qrcode";
import { db } from "@/lib/db";
import { resolveTagBase } from "@/lib/tag-links";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyLinkButton, TagWrittenButton } from "@/components/admin/tag-actions";

/** The NFC tag link and QR code for one document, with a way to mark its tag as written. */
export async function ChecklistTagCard({ checklistId }: { checklistId: string }) {
  const checklist = await db.checklist.findUnique({ where: { id: checklistId }, select: { qrToken: true, tagWrittenAt: true } });
  if (!checklist) return null;
  const url = `${await resolveTagBase(undefined)}/k/t/${checklist.qrToken}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });

  return (
    <Card>
      <CardHeader>
        <CardTitle>NFC tag and QR code</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-start gap-5 pt-2">
        <div className="size-32 shrink-0 rounded-md bg-white p-1 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm text-muted">
            Write this link onto an NFC tag (an NFC writer app on a phone, record type URL), or print the QR code. Tapping or scanning it opens this document on the shop floor.
            This link stays the same when you edit the document and publish new versions.
          </p>
          <p className="break-all rounded-md bg-surface-sunken px-3 py-2 font-mono text-xs text-foreground">{url}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={checklist.tagWrittenAt ? "pass" : "warn"}>{checklist.tagWrittenAt ? "Tag written" : "Needs a tag"}</Badge>
            <CopyLinkButton url={url} />
            <TagWrittenButton checklistId={checklistId} written={!!checklist.tagWrittenAt} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
