// Generated wrappers: see unwrap.ts. Import these (not lib/actions) from client components.
import { unwrapAction } from "./unwrap";
import {
  createBatch as createBatchRaw,
  createBay as createBayRaw,
  deleteBatch as deleteBatchRaw,
  deleteMiscStorageItem as deleteMiscStorageItemRaw,
  moveBatchToBay as moveBatchToBayRaw,
  updateBatchPriority as updateBatchPriorityRaw,
  updateBatchRemarks as updateBatchRemarksRaw,
  updateBatchStage as updateBatchStageRaw,
  updateBayPurpose as updateBayPurposeRaw,
  updateTrolley as updateTrolleyRaw,
  upsertMiscStorageItem as upsertMiscStorageItemRaw,
} from "@/lib/actions/drying-room-actions";

export const createBatch = unwrapAction(createBatchRaw);
export const createBay = unwrapAction(createBayRaw);
export const deleteBatch = unwrapAction(deleteBatchRaw);
export const deleteMiscStorageItem = unwrapAction(deleteMiscStorageItemRaw);
export const moveBatchToBay = unwrapAction(moveBatchToBayRaw);
export const updateBatchPriority = unwrapAction(updateBatchPriorityRaw);
export const updateBatchRemarks = unwrapAction(updateBatchRemarksRaw);
export const updateBatchStage = unwrapAction(updateBatchStageRaw);
export const updateBayPurpose = unwrapAction(updateBayPurposeRaw);
export const updateTrolley = unwrapAction(updateTrolleyRaw);
export const upsertMiscStorageItem = unwrapAction(upsertMiscStorageItemRaw);
