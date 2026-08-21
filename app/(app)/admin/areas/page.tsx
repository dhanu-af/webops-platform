import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddAreaForm } from "@/components/admin/add-area-form";
import { AddEquipmentForm } from "@/components/admin/add-equipment-form";
import { AddFacilityForm } from "@/components/admin/add-facility-form";
import { AddSectionForm } from "@/components/admin/add-section-form";
import { ArchiveToggleButton } from "@/components/admin/archive-toggle-button";

export default async function AreasAdminPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "areas.manage")) notFound();

  const facilities = await db.facility.findMany({
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: { areas: { orderBy: { sortOrder: "asc" }, include: { equipment: true } } },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Areas &amp; Equipment</h1>
          <p className="text-sm text-muted">Facility → Section → Area → Equipment. Configurable, not hard-coded.</p>
        </div>
        <AddFacilityForm />
      </div>

      {facilities.map((facility) => (
        <Card key={facility.id}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>{facility.name}</CardTitle>
              <Badge tone="neutral">{facility.code}</Badge>
              {facility.archived && <Badge tone="neutral">Archived</Badge>}
            </div>
            <ArchiveToggleButton kind="facility" id={facility.id} archived={facility.archived} />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-5">
              {facility.sections.map((section) => (
                <div key={section.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{section.name}</p>
                      {section.archived && <Badge tone="neutral">Archived</Badge>}
                    </div>
                    <div className="flex items-center gap-3">
                      <AddAreaForm sectionId={section.id} />
                      <ArchiveToggleButton kind="section" id={section.id} archived={section.archived} />
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {section.areas.map((area) => (
                      <div key={area.id} className="rounded-lg border border-border bg-surface-sunken p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-foreground">{area.name}</p>
                            <p className="mt-0.5 font-mono-tabular text-[11px] text-muted">{area.code} · QR {area.qrToken.slice(0, 8)}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {area.archived && <Badge tone="neutral">Archived</Badge>}
                            <ArchiveToggleButton kind="area" id={area.id} archived={area.archived} />
                          </div>
                        </div>
                        {area.equipment.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {area.equipment.map((eq) => (
                              <li key={eq.id} className="flex items-center justify-between gap-2 text-xs text-muted-strong">
                                <span>
                                  · {eq.name}
                                  {eq.archived && <span className="ml-1.5 text-[10px] text-muted">(archived)</span>}
                                </span>
                                <ArchiveToggleButton kind="equipment" id={eq.id} archived={eq.archived} />
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="mt-2">
                          <AddEquipmentForm areaId={area.id} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <AddSectionForm facilityId={facility.id} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
