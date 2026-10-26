// Cache tag names, kept apart from the caches themselves (lib/cached-config.ts) so an action can clear a cache
// without importing it.
export const SETTINGS_TAG = "system-settings";
export const FACILITY_TAG = "facility-config";
export const PRODUCTION_CALENDAR_TAG = "production-calendar";
export const KIOSK_POLICY_TAG = "kiosk-policy";
