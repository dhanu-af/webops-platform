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

export const RESPONSE_VALUE_META: Record<string, { label: string; tone: StatusTone }> = {
  PASS: { label: "Pass", tone: "pass" },
  FAIL: { label: "Fail", tone: "critical" },
  NA: { label: "N/A", tone: "neutral" },
};
