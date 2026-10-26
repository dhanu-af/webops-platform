import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const KIOSK_COOKIE = "webops_kiosk";
export const KIOSK_COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;
export const SETUP_LINK_HOURS = 24;
/** Stands in for a device id when someone signs in from their own phone rather than a registered iPad. */
export const PHONE_DEVICE = "phone";

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** An unguessable URL-safe token (device cookie, one-time setup link). */
export const newToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

const mac = (payload: string) => createHmac("sha256", secret()).update(`kiosk-ticket:${payload}`).digest("base64url");

/**
 * A 30-second ticket the PIN check hands to the sign-in step. The sign-in provider accepts only a ticket that
 * the server itself minted after a correct PIN on a registered device, so the PIN logic lives in one place.
 */
export function signKioskTicket(userId: string, deviceId: string, now = Date.now(), ttlSeconds = 30): string {
  const payload = `${userId}.${deviceId}.${Math.floor(now / 1000) + ttlSeconds}`;
  return `${payload}.${mac(payload)}`;
}

export function verifyKioskTicket(ticket: string, now = Date.now()): { userId: string; deviceId: string } | null {
  const parts = ticket.split(".");
  if (parts.length !== 4) return null;
  const [userId, deviceId, exp, sig] = parts;
  const payload = `${userId}.${deviceId}.${exp}`;
  const expected = Buffer.from(mac(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (!Number.isFinite(Number(exp)) || Number(exp) * 1000 < now) return null;
  return { userId, deviceId };
}
