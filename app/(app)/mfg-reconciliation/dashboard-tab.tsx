import Link from "next/link";
import { PackageCheck, Boxes, ShieldCheck, TriangleAlert } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { capsulesFromKg, computeYieldPct } from "@/lib/mfg-reconciliation";
import type { MfgBatchRow } from "./mfg-reconciliation-client";

// Flag a stage's yield when it drops below this -- a simple starting
// heuristic, tune once there's real usage data.
const LOW_YIELD_WARNING_PCT = 95;

type Alert = { text: string; batchId: string };

export function DashboardTab({ batches }: { batches: MfgBatchRow[] }) {
  const inProgress = batches.filter((b) => b.status === "IN_PROGRESS").length;
  const completed = batches.filter((b) => b.status === "COMPLETED").length;
  const qaReleased = batches.filter((b) => b.qaReleased).length;

  const alerts: Alert[] = [];
  for (const b of batches) {
    const blendYield = b.blending ? computeYieldPct(b.blending.totalBlendProducedKg, b.blending.totalTheoreticalWeightKg) : null;
    if (blendYield !== null && blendYield < LOW_YIELD_WARNING_PCT) {
      alerts.push({ text: `${b.batchNumber} — Blend Yield ${blendYield.toFixed(1)}%`, batchId: b.id });
    }
    const theoreticalCapsules = b.encapsulation ? capsulesFromKg(b.encapsulation.issuedBulkBlendKg, b.encapsulation.targetCapsuleFillWeightMg) : null;
    const capsulesProduced = b.encapsulation ? capsulesFromKg(b.encapsulation.capsulesProducedKg, b.encapsulation.avgCapsuleFullWeightMg) : null;
    const capsuleYield = computeYieldPct(capsulesProduced, theoreticalCapsules);
    if (capsuleYield !== null && capsuleYield < LOW_YIELD_WARNING_PCT) {
      alerts.push({ text: `${b.batchNumber} — Capsule Process Yield ${capsuleYield.toFixed(1)}%`, batchId: b.id });
    }
    const theoreticalCapsulesForBottling = b.bottling ? capsulesFromKg(b.bottling.capsuleReceivedKg, b.bottling.avgCapsuleFullWeightMg) : null;
    const theoreticalBottles = theoreticalCapsulesForBottling !== null && b.bottling?.targetCapsulesPerBottle ? theoreticalCapsulesForBottling / b.bottling.targetCapsulesPerBottle : null;
    const bottlingYield = computeYieldPct(b.bottling?.bottlesProduced, theoreticalBottles);
    if (bottlingYield !== null && bottlingYield < LOW_YIELD_WARNING_PCT) {
      alerts.push({ text: `${b.batchNumber} — Bottling Process Yield ${bottlingYield.toFixed(1)}%`, batchId: b.id });
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <KpiCard label="Batches In Progress" value={inProgress} icon={Boxes} tone="accent" />
        <KpiCard label="Completed" value={completed} icon={PackageCheck} tone="pass" />
        <KpiCard label="QA Released" value={qaReleased} icon={ShieldCheck} tone="neutral" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Yield Alerts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {alerts.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No alerts right now.</p>
          ) : (
            <div className="divide-y divide-border">
              {alerts.map((a, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="flex items-center gap-2 text-sm text-foreground">
                    <TriangleAlert className="size-4 shrink-0 text-status-warn" />
                    {a.text}
                  </span>
                  <Link href={`/mfg-reconciliation/${a.batchId}`} className="shrink-0 text-xs font-medium text-accent hover:text-accent-strong">
                    View
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
