// Generated wrappers: see unwrap.ts. Import these (not lib/actions) from client components.
import { unwrapAction } from "./unwrap";
import {
  addNotificationRecipient as addNotificationRecipientRaw,
  removeNotificationRecipient as removeNotificationRecipientRaw,
  setNotificationEnabled as setNotificationEnabledRaw,
  updateBranding as updateBrandingRaw,
  updateFacilityTimezone as updateFacilityTimezoneRaw,
  updatePhotoLimit as updatePhotoLimitRaw,
  updateRetentionYears as updateRetentionYearsRaw,
} from "@/lib/actions/settings";

export const addNotificationRecipient = unwrapAction(addNotificationRecipientRaw);
export const removeNotificationRecipient = unwrapAction(removeNotificationRecipientRaw);
export const setNotificationEnabled = unwrapAction(setNotificationEnabledRaw);
export const updateBranding = unwrapAction(updateBrandingRaw);
export const updateFacilityTimezone = unwrapAction(updateFacilityTimezoneRaw);
export const updatePhotoLimit = unwrapAction(updatePhotoLimitRaw);
export const updateRetentionYears = unwrapAction(updateRetentionYearsRaw);
