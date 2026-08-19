import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AreasAdminPage() {
  const facilities = await db.facility.findMany({
    where: { archived: false },
    include: {
      sections: {
        where: { archived: false },
        orderBy: { sortOrder: "asc" },
        include: { areas: { where: { archived: false }, orderBy: { sortOrder: "asc" }, include: { equipment: { where: { archived: false } } } } },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Areas &amp; Equipment</h1>
        <p className="text-sm text-muted">Facility → Section → Area → Equipment. Configurable, not hard-coded.</p>
      </div>

      {facilities.map((facility) => (
        <Card key={facility.id}>
          <CardHeader>
            <CardTitle>{facility.name}</CardTitle>
            <Badge tone="neutral">{facility.code}</Badge>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-5">
              {facility.sections.map((section) => (
                <div key={section.id}>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{section.name}</p>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {section.areas.map((area) => (
                      <div key={area.id} className="rounded-lg border border-border bg-surface-sunken p-3">
                        <p className="text-sm font-medium text-foreground">{area.name}</p>
                        <p className="mt-0.5 font-mono-tabular text-[11px] text-muted">{area.code} · QR {area.qrToken.slice(0, 8)}</p>
                        {area.equipment.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {area.equipment.map((eq) => (
                              <li key={eq.id} className="text-xs text-muted-strong">
                                · {eq.name}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
