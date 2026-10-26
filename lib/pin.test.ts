import { beforeAll, describe, expect, it } from "vitest";
import { afterWrongPin, canUsePin, checkPin, generateTemporaryPin, hashPin, isPinLocked, PIN_LOCK_MINUTES, PIN_MAX_FAILED, pinProblem } from "./pin";
import { signKioskTicket, verifyKioskTicket } from "./kiosk-token";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-for-unit-tests";
});

describe("PIN rules", () => {
  it("accepts an ordinary 4-digit PIN", () => {
    expect(pinProblem("4827")).toBeNull();
    expect(pinProblem("0391")).toBeNull();
  });

  it("rejects anything that is not exactly 4 digits", () => {
    for (const bad of ["", "123", "12345", "abcd", "12 4"]) expect(pinProblem(bad)).not.toBeNull();
  });

  it("rejects repeated digits, runs and common PINs", () => {
    for (const weak of ["0000", "1111", "9999", "1234", "4321", "0123", "2580", "1212"]) expect(pinProblem(weak)).not.toBeNull();
  });

  it("generates temporary PINs that always pass the rules", () => {
    for (let i = 0; i < 300; i++) expect(pinProblem(generateTemporaryPin())).toBeNull();
  });

  it("only operators and team leaders can use a PIN", () => {
    expect(canUsePin("OPERATOR")).toBe(true);
    expect(canUsePin("TEAM_LEADER")).toBe(true);
    for (const role of ["SUPERVISOR", "QA", "ADMIN", "SUPER_ADMIN", "MANAGEMENT", "VIEWER"]) expect(canUsePin(role)).toBe(false);
  });
});

describe("PIN storage", () => {
  it("verifies the right PIN and rejects a wrong one", async () => {
    const hash = await hashPin("user-1", "4827");
    expect(await checkPin("user-1", "4827", hash)).toBe(true);
    expect(await checkPin("user-1", "4828", hash)).toBe(false);
  });

  it("the same PIN gives different hashes for different people, and a hash is not valid for someone else", async () => {
    const a = await hashPin("user-1", "4827");
    const b = await hashPin("user-2", "4827");
    expect(a).not.toBe(b);
    expect(await checkPin("user-2", "4827", a)).toBe(false);
  });

  it("never stores the PIN itself", async () => {
    expect(await hashPin("user-1", "4827")).not.toContain("4827");
  });
});

describe("PIN lockout", () => {
  const now = new Date("2026-10-26T01:00:00Z");

  it("counts wrong PINs without locking until the limit", () => {
    expect(afterWrongPin(0, now)).toEqual({ pinFailedAttempts: 1, pinLockedUntil: null });
    expect(afterWrongPin(PIN_MAX_FAILED - 2, now).pinLockedUntil).toBeNull();
  });

  it("locks for 15 minutes on the limit and resets the counter", () => {
    const r = afterWrongPin(PIN_MAX_FAILED - 1, now);
    expect(r.pinFailedAttempts).toBe(0);
    expect(r.pinLockedUntil?.getTime()).toBe(now.getTime() + PIN_LOCK_MINUTES * 60_000);
  });

  it("is locked only until the lock time passes", () => {
    const until = new Date(now.getTime() + 60_000);
    expect(isPinLocked(until, now)).toBe(true);
    expect(isPinLocked(until, new Date(now.getTime() + 61_000))).toBe(false);
    expect(isPinLocked(null, now)).toBe(false);
  });
});

describe("sign-in tickets", () => {
  const t0 = Date.UTC(2026, 9, 26, 1, 0, 0);

  it("round-trips a ticket made by the server", () => {
    expect(verifyKioskTicket(signKioskTicket("u1", "d1", t0), t0 + 5_000)).toEqual({ userId: "u1", deviceId: "d1" });
  });

  it("expires after 30 seconds", () => {
    expect(verifyKioskTicket(signKioskTicket("u1", "d1", t0), t0 + 31_000)).toBeNull();
  });

  it("rejects a forged or altered ticket", () => {
    const ticket = signKioskTicket("u1", "d1", t0);
    expect(verifyKioskTicket(ticket.replace("u1", "u2"), t0)).toBeNull();
    expect(verifyKioskTicket(ticket.slice(0, -2) + "xx", t0)).toBeNull();
    expect(verifyKioskTicket("u1.d1.9999999999.forged", t0)).toBeNull();
    expect(verifyKioskTicket("", t0)).toBeNull();
  });
});
