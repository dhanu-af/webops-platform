// Generated wrappers: see unwrap.ts. Import these (not lib/actions) from client components.
import { unwrapAction } from "./unwrap";
import {
  approveSample as approveSampleRaw,
  createQcSample as createQcSampleRaw,
  deleteQcSample as deleteQcSampleRaw,
  getQcSampleAuditTrail as getQcSampleAuditTrailRaw,
  markCollected as markCollectedRaw,
  markDisposed as markDisposedRaw,
  markExpired as markExpiredRaw,
  markLabReceived as markLabReceivedRaw,
  markSentToLab as markSentToLabRaw,
  markTestingStarted as markTestingStartedRaw,
  moveToRetention as moveToRetentionRaw,
  recordLabTestResults as recordLabTestResultsRaw,
  rejectSample as rejectSampleRaw,
  updateQcSample as updateQcSampleRaw,
  updateRetentionRecord as updateRetentionRecordRaw,
} from "@/lib/actions/qc-sample-actions";

export const approveSample = unwrapAction(approveSampleRaw);
export const createQcSample = unwrapAction(createQcSampleRaw);
export const deleteQcSample = unwrapAction(deleteQcSampleRaw);
export const getQcSampleAuditTrail = unwrapAction(getQcSampleAuditTrailRaw);
export const markCollected = unwrapAction(markCollectedRaw);
export const markDisposed = unwrapAction(markDisposedRaw);
export const markExpired = unwrapAction(markExpiredRaw);
export const markLabReceived = unwrapAction(markLabReceivedRaw);
export const markSentToLab = unwrapAction(markSentToLabRaw);
export const markTestingStarted = unwrapAction(markTestingStartedRaw);
export const moveToRetention = unwrapAction(moveToRetentionRaw);
export const recordLabTestResults = unwrapAction(recordLabTestResultsRaw);
export const rejectSample = unwrapAction(rejectSampleRaw);
export const updateQcSample = unwrapAction(updateQcSampleRaw);
export const updateRetentionRecord = unwrapAction(updateRetentionRecordRaw);
