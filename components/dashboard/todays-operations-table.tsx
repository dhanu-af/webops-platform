import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { INSPECTION_STATUS_META } from "@/lib/status";
import { StartScheduleButton } from "@/components/inspection/start-schedule-button";
import type { getTodaySchedules } from "@/lib/data/inspections";

type Schedule = Awaited<ReturnType<typeof getTodaySchedules>>[number];

export function TodaysOperationsTable({ schedules }: { schedules: Schedule[] }) {
  const rows = schedules.slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Today&apos;s Operations</CardTitle>
          <CardDescription>Every check scheduled for today, live status</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">Nothing scheduled for today.</p>
        ) : (
          <Table className="min-w-[720px]">
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableHeaderCell>Operation</TableHeaderCell>
                <TableHeaderCell>Area</TableHeaderCell>
                <TableHeaderCell>Assigned To</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Time</TableHeaderCell>
                <TableHeaderCell>Action</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((s) => {
                const inspection = s.inspections[0];
                const meta = inspection ? INSPECTION_STATUS_META[inspection.status] : INSPECTION_STATUS_META.NOT_STARTED;
                const label = !inspection ? "Start" : ["NOT_STARTED", "IN_PROGRESS", "RETURNED"].includes(inspection.status) ? "Continue" : "View";
                const placeName = s.area?.name ?? s.section?.name ?? s.facility.name;
                const assignee = s.assignedUser?.name ?? (s.assignedRole ? s.assignedRole.replace(/_/g, " ") : "Any role");
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-foreground">{s.checklist.name}</TableCell>
                    <TableCell className="text-muted-strong">{placeName}</TableCell>
                    <TableCell className="text-muted-strong">{assignee}</TableCell>
                    <TableCell>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </TableCell>
                    <TableCell className="font-mono-tabular text-xs text-muted">{s.dueTime ?? "—"}</TableCell>
                    <TableCell>
                      <StartScheduleButton scheduleId={s.id} label={label} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <div className="border-t border-border px-5 py-3">
        <Link href="/today" className="text-sm font-medium text-accent hover:text-accent-strong">
          View All Operations →
        </Link>
      </div>
    </Card>
  );
}
