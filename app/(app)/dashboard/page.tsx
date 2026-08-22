import { auth } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import {
  getDashboardKpis,
  getFacilityStatusMap,
  getCorrectiveActionSummary,
  getEquipmentCalibrationSummary,
  getOperationsOverviewChart,
} from "@/lib/data/dashboard";
import { getTodaySchedules } from "@/lib/data/inspections";
import { getRecentActivity } from "@/lib/data/recent-activity";
import { getFacilityTimezone } from "@/lib/timezone";
import { greetingPrefix, facilityClockParts } from "@/lib/format-clock";
import { GreetingHeader } from "@/components/dashboard/greeting-header";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { OperationsOverviewChart } from "@/components/dashboard/operations-overview-chart";
import { TodaysOperationsTable } from "@/components/dashboard/todays-operations-table";
import { QualityCompliance } from "@/components/dashboard/quality-compliance";
import { ActionRequired, type ActionItem } from "@/components/dashboard/action-required";
import { RecentActivityTimeline } from "@/components/dashboard/recent-activity-timeline";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { FacilityStatusMap } from "@/components/dashboard/facility-status-map";
import {
  CalendarCheck2,
  ClipboardList,
  Wrench,
  Gauge,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const scope = getUserScope(session!.user);
  const timeZone = await getFacilityTimezone();

  const [kpis, areas, correctiveActions, equipment, opsChart, todaySchedules, recentActivity] = await Promise.all([
    getDashboardKpis(scope),
    getFacilityStatusMap(scope),
    getCorrectiveActionSummary(scope),
    getEquipmentCalibrationSummary(scope),
    getOperationsOverviewChart(scope),
    getTodaySchedules(scope),
    getRecentActivity(scope),
  ]);

  const firstName = (session!.user.name ?? "there").split(" ")[0];
  const greeting = greetingPrefix(timeZone);
  const dateLabel = facilityClockParts(timeZone).date;

  const releasedAreas = areas.filter((a) => a.releaseStatus === "QA_RELEASED").length;
  const auditReadiness = areas.length > 0 ? Math.round((releasedAreas / areas.length) * 100) : null;
  const correctiveActionClosure =
    correctiveActions.total > 0 ? Math.round((correctiveActions.closed / correctiveActions.total) * 100) : null;

  const equipmentNeedingAttention = equipment.overdue + equipment.dueSoon + equipment.neverCalibrated;
  const todayPending = kpis.todayTotal - kpis.todayCompleted;

  const actionItems: ActionItem[] = [];
  if (equipmentNeedingAttention > 0) {
    actionItems.push({
      icon: Gauge,
      title: "Equipment calibration due",
      description: `${equipmentNeedingAttention} equipment item${equipmentNeedingAttention === 1 ? "" : "s"} require${equipmentNeedingAttention === 1 ? "s" : ""} calibration`,
      tone: equipment.overdue > 0 ? "critical" : "warn",
      href: "/calibration",
    });
  }
  if (correctiveActions.overdue > 0) {
    actionItems.push({
      icon: Wrench,
      title: "Corrective action overdue",
      description: `${correctiveActions.overdue} corrective action${correctiveActions.overdue === 1 ? "" : "s"} require${correctiveActions.overdue === 1 ? "s" : ""} attention`,
      tone: "critical",
      href: "/corrective-actions",
    });
  }
  if (todayPending > 0) {
    actionItems.push({
      icon: ClipboardList,
      title: "Inspection pending",
      description: `${todayPending} inspection${todayPending === 1 ? "" : "s"} remain outstanding today`,
      tone: "warn",
      href: "/today",
    });
  }

  return (
    <div className="space-y-6">
      <GreetingHeader greeting={greeting} name={firstName} dateLabel={dateLabel} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <SummaryCard
          label="Today's Operations"
          icon={CalendarCheck2}
          tone="accent"
          primaryValue={kpis.todayTotal}
          primaryLabel="Scheduled today"
          stats={[
            { label: "Completed", value: kpis.todayCompleted, tone: "pass" },
            { label: "Pending", value: todayPending, tone: todayPending > 0 ? "warn" : "neutral" },
          ]}
        />
        <SummaryCard
          label="Inspections"
          icon={ClipboardList}
          tone="neutral"
          primaryValue={kpis.todayCompleted}
          primaryLabel="Completed today"
          stats={[
            {
              label: "Outstanding",
              value: kpis.overdue + kpis.awaitingSupervisor + kpis.awaitingQa,
              tone: kpis.overdue > 0 ? "critical" : "warn",
            },
          ]}
        />
        <SummaryCard
          label="Corrective Actions"
          icon={Wrench}
          tone={correctiveActions.overdue > 0 ? "critical" : "neutral"}
          primaryValue={correctiveActions.open}
          primaryLabel="Open"
          stats={[
            { label: "Overdue", value: correctiveActions.overdue, tone: correctiveActions.overdue > 0 ? "critical" : "neutral" },
            { label: "Closed", value: correctiveActions.closed, tone: "pass" },
          ]}
        />
        <SummaryCard
          label="Equipment"
          icon={Gauge}
          tone={equipment.overdue > 0 ? "critical" : equipmentNeedingAttention > 0 ? "warn" : "pass"}
          primaryValue={equipmentNeedingAttention}
          primaryLabel="Due for calibration"
          stats={[
            { label: "Current", value: equipment.current, tone: "pass" },
            { label: "Overdue", value: equipment.overdue, tone: equipment.overdue > 0 ? "critical" : "neutral" },
          ]}
        />
        <SummaryCard
          label="Compliance"
          icon={ShieldCheck}
          tone="pass"
          primaryValue={kpis.compliance ?? "—"}
          primarySuffix={kpis.compliance !== null ? "%" : undefined}
          primaryLabel="Last 30 days"
          stats={[{ label: "Audit ready", value: auditReadiness !== null ? `${auditReadiness}%` : "—", tone: "accent" }]}
        />
      </div>

      <OperationsOverviewChart data={opsChart} />

      <TodaysOperationsTable schedules={todaySchedules} />

      <QualityCompliance
        inspectionCompletion={kpis.compliance}
        correctiveActionClosure={correctiveActionClosure}
        auditReadiness={auditReadiness}
        fiveSScore={kpis.fiveSScore}
      />

      <ActionRequired items={actionItems} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RecentActivityTimeline activity={recentActivity} timeZone={timeZone} />
        <QuickActions />
      </div>

      <FacilityStatusMap areas={areas} />

      {kpis.openFindings > 0 && (
        <p className="flex items-center gap-2 text-xs text-muted">
          <AlertTriangle className="size-3.5 text-status-critical" />
          {kpis.openFindings} open finding{kpis.openFindings === 1 ? "" : "s"} across the facility — see Corrective Actions for detail.
        </p>
      )}
    </div>
  );
}
