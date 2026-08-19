import { ComingSoon } from "@/components/ui/coming-soon";
import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Analytics</h1>
        <p className="text-sm text-muted">Trends, recurring findings, and corrective action ageing for management.</p>
      </div>
      <ComingSoon icon={BarChart3} title="Management analytics in progress" description="Top performing areas, recurring findings, 5S/cleaning/pre-start trends and corrective action ageing, charted over time." />
    </div>
  );
}
