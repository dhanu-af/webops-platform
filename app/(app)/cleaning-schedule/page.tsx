import { CleaningScheduleView } from "@/components/cleaning-schedule/cleaning-schedule-view";

// Read-only reference: the facility cleaning schedule (C-FORM-002) for every
// area, open to every signed-in role. The content lives in
// lib/data/cleaning-schedule.json, generated from the controlled spreadsheet.
export default function CleaningSchedulePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Cleaning Schedule</h1>
        <p className="text-sm text-muted">What to clean, how often, who is responsible and with which approved agent — every area (C-FORM-002).</p>
      </div>
      <CleaningScheduleView />
    </div>
  );
}
