import type { InspectionStatus } from "@/app/generated/prisma/client";
import type { StatusTone } from "@/lib/status";

// The four record states the SQF validation documents use (URS-10), derived
// from the finer-grained workflow status so nothing in the workflow changes.
export type RecordStatus = "Draft" | "Submitted" | "Verified" | "Rejected" | "No production";

export function recordStatus(status: InspectionStatus): RecordStatus {
  switch (status) {
    case "SUBMITTED":
    case "AWAITING_SUPERVISOR":
    case "SUPERVISOR_APPROVED":
    case "AWAITING_QA":
      return "Submitted";
    case "QA_APPROVED":
    case "CLOSED":
      return "Verified";
    case "REJECTED":
      return "Rejected";
    case "NO_PRODUCTION":
      return "No production";
    default:
      // NOT_STARTED, IN_PROGRESS, OVERDUE, and RETURNED (back with the operator to correct).
      return "Draft";
  }
}

export const RECORD_STATUS_TONE: Record<RecordStatus, StatusTone> = {
  Draft: "neutral",
  Submitted: "accent",
  Verified: "pass",
  Rejected: "critical",
  "No production": "neutral",
};

/** Workflow statuses that make up one record status, for filtering lists (URS-14). */
export function statusesForRecordStatus(rs: string): InspectionStatus[] | undefined {
  switch (rs) {
    case "Draft":
      return ["NOT_STARTED", "IN_PROGRESS", "OVERDUE", "RETURNED"];
    case "Submitted":
      return ["SUBMITTED", "AWAITING_SUPERVISOR", "SUPERVISOR_APPROVED", "AWAITING_QA"];
    case "Verified":
      return ["QA_APPROVED", "CLOSED"];
    case "Rejected":
      return ["REJECTED"];
    case "No production":
      return ["NO_PRODUCTION"];
    default:
      return undefined;
  }
}
