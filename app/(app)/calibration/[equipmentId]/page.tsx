import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { listCalibrationHistory } from "@/lib/data/calibration";
import { getCalibrationStatus } from "@/lib/calibration";
import { FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CALIBRATION_STATUS_META } from "@/lib/status";
import { RecordCalibrationForm } from "@/components/calibration/record-calibration-form";

export default async function EquipmentCalibrationDetailPage({
  params,
}: {
  params: Promise<{ equipmentId: string }>;
}) {
  const { equipmentId } = await params;
  const session = await auth();
  const canManage = can(session!.user.role, "calibration.manage");

  const equipment = await db.equipment.findUnique({
    where: { id: equipmentId },
    include: {
      area: { select: { name: true, section: { select: { name: true } } } },
    },
  });
  if (!equipment) notFound();

  const history = await listCalibrationHistory(equipmentId);
  const status = getCalibrationStatus(history[0]?.dueDate ?? null);
  const statusMeta = CALIBRATION_STATUS_META[status];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/calibration"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> All Equipment
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {equipment.name}
          </h1>
          <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
        </div>
        <p className="text-sm text-muted">
          {equipment.area.section.name} / {equipment.area.name} ·{" "}
          {equipment.code}
          {equipment.serialNumber && <> · S/N {equipment.serialNumber}</>}
        </p>
      </div>

      {canManage && <RecordCalibrationForm equipmentId={equipment.id} />}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Calibration History</CardTitle>
            <CardDescription>
              {history.length} record{history.length === 1 ? "" : "s"}, most
              recent first
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">
              No calibration recorded yet for this equipment.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between gap-4 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      Calibrated {format(h.calibratedDate, "d MMM yyyy")} by{" "}
                      {h.performedBy}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Due {format(h.dueDate, "d MMM yyyy")} ({h.intervalDays}
                      -day interval)
                      {h.certificateNumber && (
                        <> · Cert #{h.certificateNumber}</>
                      )}{" "}
                      · logged by {h.createdBy.name}
                    </p>
                    {h.notes && (
                      <p className="mt-1 text-xs text-muted">{h.notes}</p>
                    )}
                  </div>
                  {h.certificateUrl && (
                    <a
                      href={h.certificateUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border-strong px-2.5 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent-soft hover:text-accent-strong"
                    >
                      <FileText className="size-3.5" /> Certificate
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
