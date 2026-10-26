import { createHmac, randomInt } from "node:crypto";
import bcrypt from "bcryptjs";

// Shop-floor PIN rules. A 4-digit PIN is weak by nature, so the protection is around it, not in it:
// the PIN only works on a registered iPad, after the person picks their own name, with a short lockout
// (5 wrong tries = 15 minutes) and a session that ends after a few idle minutes.
export const PIN_LENGTH = 4;
export const PIN_MAX_FAILED = 5;
export const PIN_LOCK_MINUTES = 15;
/** Wrong PINs one network may type in PIN_WINDOW_MINUTES before it must wait, and the same for the system as a whole. */
export const PIN_WINDOW_MINUTES = 15;
export const PIN_MAX_WRONG_PER_NETWORK = 5;
export const PIN_MAX_WRONG_OVERALL = 25;
/** A shop-floor session is cut off this long after the PIN was entered, however busy the screen is. */
export const PIN_SESSION_MAX_MINUTES = 30;
/** The shop-floor screen signs itself out after this long with no touch. */
export const KIOSK_IDLE_MINUTES = 3;

const SEQUENCES = ["0123", "1234", "2345", "3456", "4567", "5678", "6789", "9876", "8765", "7654", "6543", "5432", "4321", "3210"];
const COMMON = ["1212", "2121", "1122", "2211", "1004", "2000", "2580", "0852", "1357", "2468", "6969", "1010", "2020"];

/** Why a PIN is not allowed, or null when it is fine. */
export function pinProblem(pin: string): string | null {
  if (!/^[0-9]{4}$/.test(pin)) return "A PIN is exactly 4 digits.";
  if (/^([0-9])\1{3}$/.test(pin)) return "Choose a PIN that is not the same digit four times.";
  if (SEQUENCES.includes(pin)) return "Choose a PIN that is not a run of numbers like 1234.";
  if (COMMON.includes(pin)) return "That PIN is too easy to guess. Choose another.";
  return null;
}

/** A random 4-digit PIN that passes pinProblem, for an admin to hand over as a temporary PIN. */
export function generateTemporaryPin(): string {
  for (;;) {
    const pin = String(randomInt(0, 10_000)).padStart(PIN_LENGTH, "0");
    if (!pinProblem(pin)) return pin;
  }
}

// bcrypt over an HMAC keyed with the server secret and the user id: a stolen database alone cannot be
// used to brute-force the 10,000 possible PINs, and two people with the same PIN get different hashes.
function pepper(userId: string, pin: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(`${userId}:${pin}`).digest("base64");
}

/**
 * What is stored so a typed PIN can be matched to a person without trying everyone's bcrypt hash. Keyed with the
 * server secret, so the 10,000 possible PINs cannot be worked out from a copy of the database alone.
 */
export function pinLookup(pin: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(`pin-lookup:${pin}`).digest("hex");
}

export async function hashPin(userId: string, pin: string): Promise<string> {
  return bcrypt.hash(pepper(userId, pin), 10);
}

export async function checkPin(userId: string, pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pepper(userId, pin), hash);
}

export function isPinLocked(lockedUntil: Date | null | undefined, now: Date = new Date()): boolean {
  return !!lockedUntil && lockedUntil.getTime() > now.getTime();
}

/** The counters after one more wrong PIN. */
export function afterWrongPin(failed: number, now: Date = new Date()): { pinFailedAttempts: number; pinLockedUntil: Date | null } {
  const next = failed + 1;
  if (next >= PIN_MAX_FAILED) return { pinFailedAttempts: 0, pinLockedUntil: new Date(now.getTime() + PIN_LOCK_MINUTES * 60_000) };
  return { pinFailedAttempts: next, pinLockedUntil: null };
}

/** Roles that may use the shop-floor PIN. Supervisors, QA and admins sign in with their password. */
export const PIN_ROLES = ["OPERATOR", "TEAM_LEADER"] as const;
export function canUsePin(role: string): boolean {
  return (PIN_ROLES as readonly string[]).includes(role);
}
