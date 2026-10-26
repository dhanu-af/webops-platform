import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { KIOSK_COOKIE, sha256 } from "@/lib/kiosk-token";
import { getCachedKioskAllowAnyPhone } from "@/lib/cached-config";

// The shop-floor screens are served only to a device an admin has registered. The device keeps a random
// token in a cookie; the database holds only its hash, so a database leak cannot be turned into a device.
const TOUCH_AFTER_MS = 10 * 60_000;

/** The registered, not-revoked device making this request, or null. */
export const getKioskDevice = cache(async () => {
  const token = (await cookies()).get(KIOSK_COOKIE)?.value;
  if (!token) return null;
  const device = await db.kioskDevice.findUnique({ where: { tokenHash: sha256(token) } });
  if (!device || device.revokedAt) return null;
  if (!device.lastSeenAt || Date.now() - device.lastSeenAt.getTime() > TOUCH_AFTER_MS) {
    await db.kioskDevice.update({ where: { id: device.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  }
  return device;
});

/**
 * Who may use the shop-floor screens on this request: a registered iPad, or (when an admin allows it) any phone.
 * `device` is set only for a registered iPad; `allowed` says whether to show the machine pages and the PIN step at all.
 */
export const getKioskAccess = cache(async () => {
  const device = await getKioskDevice();
  if (device) return { device, allowed: true as const, mode: "device" as const };
  const anyPhone = await getCachedKioskAllowAnyPhone();
  return { device: null, allowed: anyPhone, mode: "phone" as const };
});
