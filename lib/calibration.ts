// A dueDate within this many days counts as "due soon" rather than "current"
// — a heads-up window so calibration gets scheduled before equipment is
// actually out of spec, not just flagged the day it lapses.
export const CALIBRATION_DUE_SOON_DAYS = 30;

export type CalibrationStatus = "CURRENT" | "DUE_SOON" | "OVERDUE" | "NEVER_CALIBRATED";

export function getCalibrationStatus(dueDate: Date | null): CalibrationStatus {
  if (!dueDate) return "NEVER_CALIBRATED";
  const daysUntilDue = (dueDate.getTime() - Date.now()) / 86_400_000;
  if (daysUntilDue < 0) return "OVERDUE";
  if (daysUntilDue <= CALIBRATION_DUE_SOON_DAYS) return "DUE_SOON";
  return "CURRENT";
}
