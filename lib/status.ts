// Central label/tone mapping so every badge, dot and chip in the app reads
// the same status the same way — dashboard, history table, evidence gallery.

export type StatusTone = "pass" | "warn" | "attention" | "critical" | "neutral" | "accent";

export const INSPECTION_STATUS_META: Record<
  string,
  { label: string; tone: StatusTone }
> = {
  NOT_STARTED: { label: "Not Started", tone: "neutral" },
  IN_PROGRESS: { label: "In Progress", tone: "accent" },
  SUBMITTED: { label: "Submitted", tone: "accent" },
  AWAITING_SUPERVISOR: { label: "Awaiting Supervisor", tone: "warn" },
  SUPERVISOR_APPROVED: { label: "Supervisor Approved", tone: "accent" },
  AWAITING_QA: { label: "Awaiting QA", tone: "attention" },
  QA_APPROVED: { label: "QA Approved", tone: "pass" },
  CLOSED: { label: "Closed", tone: "pass" },
  RETURNED: { label: "Returned", tone: "critical" },
  REJECTED: { label: "Rejected", tone: "critical" },
  OVERDUE: { label: "Overdue", tone: "critical" },
};

export const AREA_RELEASE_STATUS_META: Record<string, { label: string; tone: StatusTone }> = {
  NOT_RELEASED: { label: "Not Released", tone: "critical" },
  AWAITING_SUPERVISOR: { label: "Awaiting Supervisor", tone: "warn" },
  AWAITING_QA: { label: "Awaiting QA", tone: "attention" },
  QA_RELEASED: { label: "QA Released", tone: "pass" },
};

export const SEVERITY_META: Record<string, { label: string; tone: StatusTone }> = {
  CRITICAL: { label: "Critical", tone: "critical" },
  MAJOR: { label: "Major", tone: "attention" },
  MINOR: { label: "Minor", tone: "warn" },
};

export const CORRECTIVE_ACTION_STATUS_META: Record<string, { label: string; tone: StatusTone }> = {
  OPEN: { label: "Open", tone: "critical" },
  IN_PROGRESS: { label: "In Progress", tone: "warn" },
  AWAITING_VERIFICATION: { label: "Awaiting Verification", tone: "attention" },
  CLOSED: { label: "Closed", tone: "pass" },
  OVERDUE: { label: "Overdue", tone: "critical" },
};

export const CALIBRATION_STATUS_META: Record<string, { label: string; tone: StatusTone }> = {
  CURRENT: { label: "Current", tone: "pass" },
  DUE_SOON: { label: "Due Soon", tone: "warn" },
  OVERDUE: { label: "Overdue", tone: "critical" },
  NEVER_CALIBRATED: { label: "Never Calibrated", tone: "attention" },
};

export const RESPONSE_VALUE_META: Record<string, { label: string; tone: StatusTone }> = {
  PASS: { label: "Pass", tone: "pass" },
  FAIL: { label: "Fail", tone: "critical" },
  NA: { label: "N/A", tone: "neutral" },
};

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  CHECK_DUE: "Check due",
  CHECK_OVERDUE: "Check overdue",
  SUPERVISOR_VERIFICATION_REQUIRED: "Supervisor verification required",
  QA_VERIFICATION_REQUIRED: "QA verification required",
  CORRECTIVE_ACTION_DUE: "Corrective action assigned",
  CORRECTIVE_ACTION_OVERDUE: "Corrective action overdue",
  RETURNED: "Inspection returned",
  REJECTED: "Inspection rejected",
  AREA_RELEASED: "Inspection closed / area released",
};

export const AUDIT_ACTION_META: Record<string, { label: string; tone: StatusTone }> = {
  CREATED: { label: "Created", tone: "accent" },
  STARTED: { label: "Started", tone: "accent" },
  EDITED: { label: "Edited", tone: "neutral" },
  SUBMITTED: { label: "Submitted", tone: "accent" },
  ITEM_FAILED: { label: "Item Failed", tone: "critical" },
  PHOTO_UPLOADED: { label: "Photo Uploaded", tone: "neutral" },
  FINDING_CREATED: { label: "Finding Created", tone: "attention" },
  CORRECTIVE_ACTION_CREATED: { label: "Corrective Action Created", tone: "attention" },
  SUPERVISOR_APPROVED: { label: "Supervisor Approved", tone: "pass" },
  RETURNED: { label: "Returned", tone: "critical" },
  REJECTED: { label: "Rejected", tone: "critical" },
  QA_APPROVED: { label: "QA Approved", tone: "pass" },
  CLOSED: { label: "Closed", tone: "pass" },
  LOGIN: { label: "Login", tone: "neutral" },
  AREA_RELEASED: { label: "Area Released", tone: "pass" },
};
