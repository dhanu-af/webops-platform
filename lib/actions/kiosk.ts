"use server";

import { UserFacingError, guard } from "@/lib/user-error";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { signIn, signOut } from "@/lib/auth";
import { headers } from "next/headers";
import { getKioskAccess } from "@/lib/kiosk";
import { PHONE_DEVICE, sha256, signKioskTicket } from "@/lib/kiosk-token";
import {
  canUsePin,
  checkPin,
  hashPin,
  PIN_MAX_WRONG_OVERALL,
  PIN_MAX_WRONG_PER_NETWORK,
  PIN_WINDOW_MINUTES,
  pinLookup,
  pinProblem,
} from "@/lib/pin";

// A short, non-reversible tag for the network address the request came from, so repeated guessing from one place can be
// counted without storing the address itself.
async function networkTag(): Promise<string> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "unknown").split(",")[0].trim();
  return sha256(`${process.env.AUTH_SECRET ?? ""}:${ip}`).slice(0, 12);
}

const windowStart = () => new Date(Date.now() - PIN_WINDOW_MINUTES * 60_000);

/** Refuses when this network, or the system as a whole, has had too many wrong PINs lately. */
async function assertNotThrottled(net: string) {
  const [here, overall] = await Promise.all([
    db.pinAttempt.count({ where: { net, createdAt: { gte: windowStart() } } }),
    db.pinAttempt.count({ where: { createdAt: { gte: windowStart() } } }),
  ]);
  if (here >= PIN_MAX_WRONG_PER_NETWORK) {
    throw new UserFacingError(`Too many wrong PINs from here. Wait ${PIN_WINDOW_MINUTES} minutes, or sign in with your password.`);
  }
  if (overall >= PIN_MAX_WRONG_OVERALL) {
    throw new UserFacingError(`PIN sign-in is paused for a few minutes after many wrong PINs. Try again in ${PIN_WINDOW_MINUTES} minutes, or sign in with your password.`);
  }
}

/** Records a wrong PIN and says how many tries are left from this network. */
async function wrongPin(net: string): Promise<never> {
  await db.pinAttempt.create({ data: { net } });
  // keep the table small
  await db.pinAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 2 * 24 * 60 * 60_000) } } }).catch(() => undefined);
  const used = await db.pinAttempt.count({ where: { net, createdAt: { gte: windowStart() } } });
  const left = PIN_MAX_WRONG_PER_NETWORK - used;
  if (left <= 0) throw new UserFacingError(`Wrong PIN. That was the last try from here, so wait ${PIN_WINDOW_MINUTES} minutes or sign in with your password.`);
  throw new UserFacingError(`Wrong PIN. ${left} ${left === 1 ? "try" : "tries"} left.`);
}

/**
 * PIN sign-in: the PIN alone says who you are. It works on a registered iPad or (unless an admin switched it off) any
 * phone. Wrong PINs are counted per network and for the system as a whole, and a person's first PIN is a temporary one
 * from an admin that they must replace with their own (no two people can have the same PIN).
 */
async function kioskSignIn__impl(input: { pin: string; newPin?: string }): Promise<{ status: "signed-in" | "choose-new-pin" }> {
  const access = await getKioskAccess();
  if (!access.allowed) throw new UserFacingError("PIN sign-in is not available on this device. Sign in with your password.");
  const device = access.device;
  const where = device ? `iPad "${device.name}"` : "a phone";
  const net = await networkTag();
  await assertNotThrottled(net);

  const pin = String(input.pin ?? "");
  if (!/^[0-9]{4}$/.test(pin)) return wrongPin(net);
  const user = await db.user.findUnique({ where: { pinLookup: pinLookup(pin) } });
  const verified = !!user && user.active && canUsePin(user.role) && !!user.pinHash && (await checkPin(user.id, pin, user.pinHash));
  if (!user || !verified) return wrongPin(net);

  if (user.pinMustChange) {
    if (!input.newPin) return { status: "choose-new-pin" };
    const newPin = String(input.newPin);
    const problem = pinProblem(newPin);
    if (problem) throw new UserFacingError(problem);
    if (newPin === pin) throw new UserFacingError("Choose a PIN that is different from the temporary one.");
    // Nobody else may have this PIN. The answer is deliberately vague (it also covers "too easy"), and every refusal counts
    // as a wrong try, so it cannot be used to find out which PINs are taken.
    const taken = await db.user.findUnique({ where: { pinLookup: pinLookup(newPin) }, select: { id: true } });
    if (taken && taken.id !== user.id) {
      await db.pinAttempt.create({ data: { net } });
      throw new UserFacingError("That PIN cannot be used. Choose a different one.");
    }
    try {
      await db.user.update({
        where: { id: user.id },
        data: { pinHash: await hashPin(user.id, newPin), pinLookup: pinLookup(newPin), pinMustChange: false, pinSetAt: new Date(), pinFailedAttempts: 0, pinLockedUntil: null },
      });
    } catch {
      throw new UserFacingError("That PIN cannot be used. Choose a different one.");
    }
    await logAudit({ entityType: "User", entityId: user.id, action: "EDITED", userId: user.id, fieldName: "pin", reason: "PIN chosen by the user (replaced the temporary PIN)" });
  }

  await logAudit({ entityType: "User", entityId: user.id, action: "LOGIN", userId: user.id, reason: `PIN sign-in on ${where}` });

  try {
    await signIn("pin", { ticket: signKioskTicket(user.id, device?.id ?? PHONE_DEVICE), redirect: false });
  } catch {
    throw new UserFacingError("Could not sign in. Try again.");
  }
  return { status: "signed-in" };
}

/** Ends the PIN session and returns to the start screen. */
async function kioskSignOut__impl(reason: "done" | "idle" = "done") {
  await signOut({ redirectTo: reason === "idle" ? "/k?idle=1" : "/k?done=1" });
}

// Callable from the browser forms. Returns the message of any UserFacingError as data
// (production hides the text of a thrown server-action error); see lib/actions-client/.
export async function kioskSignIn(...args: Parameters<typeof kioskSignIn__impl>) {
  return guard(() => kioskSignIn__impl(...args));
}

export async function kioskSignOut(...args: Parameters<typeof kioskSignOut__impl>) {
  return guard(() => kioskSignOut__impl(...args));
}
