import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFacilityTimezone, formatDayInTimeZone } from "@/lib/timezone";

export default async function EvidenceGalleryPage() {
  const session = await auth();
  const scope = getUserScope(session!.user);

  // PhotoEvidence only ever carries a specific areaId (copied from its
  // inspection at upload time) - no section/facility-wide variant - so an
  // exact match is the whole scope rule, same as Findings/CorrectiveActions.
  const [photos, timeZone] = await Promise.all([
    db.photoEvidence.findMany({
      where: scope.scoped ? { areaId: scope.areaId } : undefined,
      include: { area: true, inspection: { include: { checklistVersion: { include: { checklist: true } } } }, uploadedBy: true, finding: true },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    getFacilityTimezone(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Photo Evidence Gallery</h1>
        <p className="text-sm text-muted">Every photo, linked to its area, inspection, finding and uploader.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Evidence</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {photos.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No photo evidence uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {photos.map((p) => {
                const media = (
                  <>
                    <div className="relative aspect-square overflow-hidden rounded-[var(--radius)] border border-border bg-surface-sunken">
                      <Image src={p.storagePath} alt={p.caption ?? "Evidence"} fill sizes="200px" className="object-cover transition-transform group-hover:scale-105" unoptimized />
                      {p.finding && (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-status-critical-soft px-1.5 py-0.5 text-[9px] font-semibold text-status-critical">
                          FINDING
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs font-medium text-foreground">{p.area?.name ?? "—"}</p>
                    <p className="truncate text-[11px] text-muted">
                      {p.uploadedBy.name} · {formatDayInTimeZone(p.createdAt, timeZone, false)}
                    </p>
                  </>
                );
                return p.inspectionId ? (
                  <Link key={p.id} href={`/inspections/${p.inspectionId}`} className="group">
                    {media}
                  </Link>
                ) : (
                  <div key={p.id} className="group">
                    {media}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
