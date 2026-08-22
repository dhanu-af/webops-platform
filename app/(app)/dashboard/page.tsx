import { auth } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { getDashboardKpis, getFacilityStatusMap } from "@/lib/data/dashboard";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { FacilityStatusMap } from "@/components/dashboard/facility-status-map";
import {
  CheckCircle2,
  ClipboardList,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  FlagTriangleRight,
  LayoutGrid,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const scope = getUserScope(session!.user);
  const [kpis, areas] = await Promise.all([
    getDashboardKpis(scope),
    getFacilityStatusMap(scope),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted">
          What is happening in your facility right now.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
        <KpiCard
          label="Compliance"
          value={kpis.compliance ?? "—"}
          suffix={kpis.compliance !== null ? "%" : undefined}
          helpText="Last 30 days"
          icon={ShieldCheck}
          tone="pass"
          progress={kpis.compliance ?? undefined}
        />
        <KpiCard
          label="Today's Checks"
          value={kpis.todayTotal}
          helpText="Scheduled for today"
          icon={ClipboardList}
        />
        <KpiCard
          label="Completed"
          value={kpis.todayCompleted}
          helpText="Of today's checks"
          icon={CheckCircle2}
          tone="pass"
        />
        <KpiCard
          label="Overdue"
          value={kpis.overdue}
          helpText={kpis.overdue > 0 ? "Needs attention" : "All on schedule"}
          icon={AlertTriangle}
          tone={kpis.overdue > 0 ? "critical" : "neutral"}
        />
        <KpiCard
          label="Awaiting Supervisor"
          value={kpis.awaitingSupervisor}
          helpText="Pending sign-off"
          icon={UserCheck}
          tone={kpis.awaitingSupervisor > 0 ? "warn" : "neutral"}
        />
        <KpiCard
          label="Awaiting QA"
          value={kpis.awaitingQa}
          helpText="Pending QA review"
          icon={ShieldCheck}
          tone={kpis.awaitingQa > 0 ? "attention" : "neutral"}
        />
        <KpiCard
          label="Open Findings"
          value={kpis.openFindings}
          helpText={kpis.openFindings > 0 ? "Not yet closed" : "None open"}
          icon={FlagTriangleRight}
          tone={kpis.openFindings > 0 ? "critical" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="5S Score"
          value={kpis.fiveSScore ?? "—"}
          suffix={kpis.fiveSScore !== null ? "%" : undefined}
          helpText="Workplace organisation"
          icon={LayoutGrid}
          tone="accent"
          progress={kpis.fiveSScore ?? undefined}
        />
      </div>

      <FacilityStatusMap areas={areas} />
    </div>
  );
}
