// Generated wrappers: see unwrap.ts. Import these (not lib/actions) from client components.
import { unwrapAction } from "./unwrap";
import {
  cloneChecklist as cloneChecklistRaw,
  createChecklist as createChecklistRaw,
  createSchedule as createScheduleRaw,
  deleteChecklist as deleteChecklistRaw,
  saveChecklistVersion as saveChecklistVersionRaw,
  setChecklistActive as setChecklistActiveRaw,
  setScheduleActive as setScheduleActiveRaw,
} from "@/lib/actions/checklist-builder";

export const cloneChecklist = unwrapAction(cloneChecklistRaw);
export const createChecklist = unwrapAction(createChecklistRaw);
export const createSchedule = unwrapAction(createScheduleRaw);
export const deleteChecklist = unwrapAction(deleteChecklistRaw);
export const saveChecklistVersion = unwrapAction(saveChecklistVersionRaw);
export const setChecklistActive = unwrapAction(setChecklistActiveRaw);
export const setScheduleActive = unwrapAction(setScheduleActiveRaw);
