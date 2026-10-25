// Generated wrappers: see unwrap.ts. Import these (not lib/actions) from client components.
import { unwrapAction } from "./unwrap";
import {
  removeProductionDay as removeProductionDayRaw,
  setClosedWeekdays as setClosedWeekdaysRaw,
  setProductionDay as setProductionDayRaw,
} from "@/lib/actions/production-calendar";

export const removeProductionDay = unwrapAction(removeProductionDayRaw);
export const setClosedWeekdays = unwrapAction(setClosedWeekdaysRaw);
export const setProductionDay = unwrapAction(setProductionDayRaw);
