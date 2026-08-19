import { ComingSoon } from "@/components/ui/coming-soon";
import { FileBarChart } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Reports</h1>
        <p className="text-sm text-muted">Daily operations, cleaning, 5S, compliance, corrective action and audit evidence reports.</p>
      </div>
      <ComingSoon icon={FileBarChart} title="Report generation in progress" description="Exportable, audit-ready PDF/CSV reports pulling every score, finding, photo and sign-off for a chosen date range and area." />
    </div>
  );
}
