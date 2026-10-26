// Generated wrappers: see unwrap.ts. Import these (not lib/actions) from client components.
import { unwrapAction } from "./unwrap";
import {
  clearUserPin as clearUserPinRaw,
  createKioskDevice as createKioskDeviceRaw,
  issueUserPin as issueUserPinRaw,
  markChecklistTagWritten as markChecklistTagWrittenRaw,
  renewKioskSetup as renewKioskSetupRaw,
  revokeKioskDevice as revokeKioskDeviceRaw,
  setKioskAllowAnyPhone as setKioskAllowAnyPhoneRaw,
  unlockUserPin as unlockUserPinRaw,
} from "@/lib/actions/kiosk-admin";

export const clearUserPin = unwrapAction(clearUserPinRaw);
export const createKioskDevice = unwrapAction(createKioskDeviceRaw);
export const issueUserPin = unwrapAction(issueUserPinRaw);
export const markChecklistTagWritten = unwrapAction(markChecklistTagWrittenRaw);
export const renewKioskSetup = unwrapAction(renewKioskSetupRaw);
export const revokeKioskDevice = unwrapAction(revokeKioskDeviceRaw);
export const setKioskAllowAnyPhone = unwrapAction(setKioskAllowAnyPhoneRaw);
export const unlockUserPin = unwrapAction(unlockUserPinRaw);
