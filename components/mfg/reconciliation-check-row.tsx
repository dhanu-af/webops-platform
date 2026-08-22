import { cn } from "@/lib/utils";
import type { ReconciliationCheck } from "@/lib/mfg-reconciliation";

// One row of a reconciliation check: label, its spec limit, the computed %,
// and a Pass/Fail badge -- shown only once the % is actually computable
// (pass === null means a required input is still missing, not a failure).
export function ReconciliationCheckRow({ check }: { check: ReconciliationCheck }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border py-2.5 first:border-0">
      <div className="min-w-0">
        <p className="text-sm text-foreground">{check.label}</p>
        {check.limitLabel && <p className="text-xs text-muted">{check.limitLabel}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="font-mono-tabular text-sm text-foreground">{check.pct !== null ? `${check.pct.toFixed(1)}%` : "—"}</span>
        {check.pass !== null && (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              check.pass ? "bg-status-pass-soft text-status-pass" : "bg-status-critical-soft text-status-critical"
            )}
          >
            {check.pass ? "Pass" : "Fail"}
          </span>
        )}
      </div>
    </div>
  );
}
