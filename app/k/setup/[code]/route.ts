import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { KIOSK_COOKIE, KIOSK_COOKIE_MAX_AGE_SECONDS, newToken, sha256 } from "@/lib/kiosk-token";

// Registers the device that opens this one-time link: it receives a random token in a cookie (only the hash is
// stored), and the link stops working. Without a valid, unexpired link nothing is registered.
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const home = (query: string) => NextResponse.redirect(new URL(`/k${query}`, request.url));

  const device = await db.kioskDevice.findUnique({ where: { setupCodeHash: sha256(code) } });
  if (!device || device.revokedAt || !device.setupExpiresAt || device.setupExpiresAt.getTime() < Date.now()) return home("?setup=invalid");

  const token = newToken(32);
  await db.kioskDevice.update({
    where: { id: device.id },
    data: { tokenHash: sha256(token), setupCodeHash: null, setupExpiresAt: null, lastSeenAt: new Date() },
  });
  await logAudit({
    entityType: "KioskDevice",
    entityId: device.id,
    action: "EDITED",
    userId: device.createdById,
    fieldName: "registered",
    reason: `Shop-floor iPad "${device.name}" registered with its setup link`,
  });

  const response = home("?ready=1");
  response.cookies.set(KIOSK_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: KIOSK_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
