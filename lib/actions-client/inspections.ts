// Generated wrappers: see unwrap.ts. Import these (not lib/actions) from client components.
import { unwrapAction } from "./unwrap";
import {
  attachPhoto as attachPhotoRaw,
  createFindingDetail as createFindingDetailRaw,
  getOrCreateInspectionForSchedule as getOrCreateInspectionForScheduleRaw,
  saveResponse as saveResponseRaw,
} from "@/lib/actions/inspections";

export const attachPhoto = unwrapAction(attachPhotoRaw);
export const createFindingDetail = unwrapAction(createFindingDetailRaw);
export const getOrCreateInspectionForSchedule = unwrapAction(getOrCreateInspectionForScheduleRaw);
export const saveResponse = unwrapAction(saveResponseRaw);
