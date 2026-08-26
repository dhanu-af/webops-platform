"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBay } from "@/lib/actions/drying-room-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PURPOSE_LABEL, PRIORITY_BADGE, BAY_STATUS_LABEL, BAY_STATUS_CLASS, computeBayStatus, daysSinceProduction } from "@/lib/drying-room-defaults";
import type { Bay } from "./drying-room-client";

export default function BaysTab({
  bays,
  canManage,
  onOpenBay,
}: {
  bays: Bay[];
  canManage: boolean;
  onOpenBay: (id: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function addBay() {
    startTransition(async () => {
      await createBay();
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" variant="secondary" onClick={addBay} disabled={pending}>
            {pending ? "Adding..." : "+ Add Bay"}
          </Button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {bays.map((bay) => {
          const status = computeBayStatus(bay.purpose, bay.batches);
          return (
            <Card key={bay.id} interactive className="cursor-pointer" onClick={() => onOpenBay(bay.id)}>
              <CardContent>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Bay {bay.bayNumber}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${BAY_STATUS_CLASS[status]}`}>{BAY_STATUS_LABEL[status]}</span>
                </div>
                {bay.batches.length === 0 ? (
                  <p className="text-xs text-muted">{PURPOSE_LABEL[bay.purpose]}</p>
                ) : (
                  <div className="space-y-2">
                    {[...bay.batches]
                      .sort((a, b) => (a.priorityRank ?? 99) - (b.priorityRank ?? 99))
                      .map((b) => (
                        <div key={b.id} className="rounded-md border border-border/60 bg-surface-sunken/60 px-2 py-1.5 text-xs">
                          <p className="font-medium text-foreground">
                            {b.priorityRank && `${PRIORITY_BADGE[b.priorityRank]} `}
                            {b.productName} · Batch {b.batchNumber}
                          </p>
                          <p className="text-muted">
                            {b.batchSize} {b.batchSizeUnit} · {b.trayCount} trays · {daysSinceProduction(b.dateEnteredDryingRoom)} day
                            {daysSinceProduction(b.dateEnteredDryingRoom) === 1 ? "" : "s"}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
                {bay.assignedEmployeeName && <p className="mt-1.5 text-[11px] text-muted">Operator: {bay.assignedEmployeeName}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
