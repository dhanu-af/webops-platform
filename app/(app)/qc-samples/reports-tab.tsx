import { Card } from "@/components/ui/card";

const REPORTS: { type: string; title: string; description: string }[] = [
  { type: "daily-collection", title: "Daily Sample Collection", description: "Samples collected today." },
  { type: "pending-testing", title: "Samples Pending Testing", description: "Currently in the laboratory phase." },
  { type: "approved", title: "Approved Samples", description: "Passed and moved to retention." },
  { type: "failed", title: "Failed Samples", description: "Rejected samples with remarks." },
  { type: "retention-inventory", title: "Retention Inventory", description: "Everything currently on the retention shelf." },
  { type: "retention-expiry", title: "Retention Expiry Report", description: "Retention samples by expiry/destroy date." },
  { type: "coa", title: "COA Report", description: "Samples with a certificate of analysis on file." },
  { type: "history-by-batch", title: "Sample History by Batch", description: "All samples, grouped by batch number." },
  { type: "qc-performance", title: "QC Performance (Turnaround)", description: "Time from lab receipt to test result." },
  { type: "monthly-summary", title: "Monthly Sample Summary", description: "Sample counts by month and status." },
];

export function ReportsTab({ sampleCount }: { sampleCount: number }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Export any report to CSV (opens in Excel). Reports run against all {sampleCount} sample record{sampleCount === 1 ? "" : "s"} currently in the system.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Card key={r.type} className="p-4">
            <p className="text-sm font-semibold text-foreground">{r.title}</p>
            <p className="mb-3 mt-0.5 text-xs text-muted">{r.description}</p>
            <a
              href={`/api/reports/qc-samples?type=${r.type}`}
              className="inline-flex rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-foreground shadow-[var(--shadow-xs)] transition-colors hover:bg-surface-sunken"
            >
              Export to CSV
            </a>
          </Card>
        ))}
      </div>
    </div>
  );
}
