// Generated wrappers: see unwrap.ts. Import these (not lib/actions) from client components.
import { unwrapAction } from "./unwrap";
import {
  addDispatchEvent as addDispatchEventRaw,
  createMfgBatch as createMfgBatchRaw,
  deleteDispatchEvent as deleteDispatchEventRaw,
  deleteMfgBatch as deleteMfgBatchRaw,
  markMfgBatchCompleted as markMfgBatchCompletedRaw,
  saveBlending as saveBlendingRaw,
  saveBottling as saveBottlingRaw,
  saveEncapsulation as saveEncapsulationRaw,
  saveFinishedGoodsWarehouse as saveFinishedGoodsWarehouseRaw,
  savePackaging as savePackagingRaw,
  saveWarehouseIssue as saveWarehouseIssueRaw,
  saveXrayInspection as saveXrayInspectionRaw,
} from "@/lib/actions/mfg-reconciliation";

export const addDispatchEvent = unwrapAction(addDispatchEventRaw);
export const createMfgBatch = unwrapAction(createMfgBatchRaw);
export const deleteDispatchEvent = unwrapAction(deleteDispatchEventRaw);
export const deleteMfgBatch = unwrapAction(deleteMfgBatchRaw);
export const markMfgBatchCompleted = unwrapAction(markMfgBatchCompletedRaw);
export const saveBlending = unwrapAction(saveBlendingRaw);
export const saveBottling = unwrapAction(saveBottlingRaw);
export const saveEncapsulation = unwrapAction(saveEncapsulationRaw);
export const saveFinishedGoodsWarehouse = unwrapAction(saveFinishedGoodsWarehouseRaw);
export const savePackaging = unwrapAction(savePackagingRaw);
export const saveWarehouseIssue = unwrapAction(saveWarehouseIssueRaw);
export const saveXrayInspection = unwrapAction(saveXrayInspectionRaw);
