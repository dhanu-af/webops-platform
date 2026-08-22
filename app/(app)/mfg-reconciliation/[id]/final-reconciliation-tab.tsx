import { computeFinalReconciliationChecks } from "@/lib/mfg-reconciliation";
import { ReconciliationCheckRow } from "@/components/mfg/reconciliation-check-row";
import { Badge } from "@/components/ui/badge";
import type { BlendingData } from "./blending-section";
import type { EncapsulationData } from "./encapsulation-section";
import type { BottlingData } from "./bottling-section";

// Read-only cross-stage summary combining Blending + Encapsulation +
// Bottling data via the single shared computeFinalReconciliationChecks
// helper -- also used identically by the PDF export, so the two can never
// drift apart.
export function FinalReconciliationTab({ blending, encapsulation, bottling }: { blending: BlendingData | null; encapsulation: EncapsulationData | null; bottling: BottlingData | null }) {
  const checks = computeFinalReconciliationChecks(blending, encapsulation, bottling);

  if (checks.length === 0) {
    return <p className="py-10 text-center text-sm text-muted">No reconciliation checks available yet — fill in Blending, Encapsulation, and/or Bottling first.</p>;
  }

  const scored = checks.filter((c) => c.pass !== null);
  const failing = scored.filter((c) => !c.pass);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Every reconciliation check recorded so far for this batch</p>
        {scored.length > 0 &&
          (failing.length === 0 ? (
            <Badge tone="pass">All {scored.length} checks passing</Badge>
          ) : (
            <Badge tone="critical">
              {failing.length} of {scored.length} checks failing
            </Badge>
          ))}
      </div>
      <div className="rounded-lg border border-border bg-surface-sunken/40 px-4">
        {checks.map((c, i) => (
          <ReconciliationCheckRow key={i} check={c} />
        ))}
      </div>
    </div>
  );
}
