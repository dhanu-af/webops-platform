import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  db: {
    user: { findUniqueOrThrow: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    kioskDevice: { create: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ db: m.db }));
const actor = vi.hoisted(() => ({ current: { id: "boss1", name: "Dhanu", role: "SUPER_ADMIN" } }));
vi.mock("@/lib/session-user", () => ({ requireLiveUser: vi.fn(async () => actor.current) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { clearUserPin, createKioskDevice, issueUserPin, markChecklistTagWritten, revokeKioskDevice, setKioskAllowAnyPhone } from "./kiosk-admin";
import { pinLookup, pinProblem } from "@/lib/pin";
import { sha256 } from "@/lib/kiosk-token";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-for-unit-tests";
});

beforeEach(() => {
  vi.clearAllMocks();
  actor.current = { id: "boss1", name: "Dhanu", role: "SUPER_ADMIN" };
  m.db.user.findUniqueOrThrow.mockResolvedValue({ id: "u1", name: "Olive Operator", role: "OPERATOR", active: true });
  m.db.user.findUnique.mockResolvedValue(null);
  m.db.kioskDevice.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "dev1", ...data }));
  m.db.kioskDevice.findUniqueOrThrow.mockResolvedValue({ id: "dev1", name: "Bottling iPad", revokedAt: null });
});

describe("temporary PINs", () => {
  it("issues a valid random PIN, stores only a hash, forces a change, and never writes the PIN to the audit trail", async () => {
    const r = await issueUserPin("u1");
    if (!r.ok) throw new Error(r.error);
    expect(pinProblem(r.data.pin)).toBeNull();
    const data = m.db.user.update.mock.calls[0][0].data;
    expect(data).toMatchObject({ pinMustChange: true, pinFailedAttempts: 0, pinLockedUntil: null });
    expect(data.pinHash).not.toContain(r.data.pin);
    expect(data.pinLookup).toBe(pinLookup(r.data.pin));
    expect(data.passwordHash).toBeUndefined();
    expect(JSON.stringify(m.db.auditLog.create.mock.calls)).not.toContain(r.data.pin);
  });

  it("never hands out a PIN that another person already has", async () => {
    // the first two draws collide with someone else's PIN, the third is free
    m.db.user.findUnique.mockResolvedValueOnce({ id: "other" }).mockResolvedValueOnce({ id: "other" }).mockResolvedValue(null);
    const r = await issueUserPin("u1");
    if (!r.ok) throw new Error(r.error);
    expect(m.db.user.findUnique).toHaveBeenCalledTimes(3);
    expect(m.db.user.update.mock.calls[0][0].data.pinLookup).toBe(pinLookup(r.data.pin));
  });

  it("PIN only: replaces the password with one nobody knows", async () => {
    const r = await issueUserPin("u1", { pinOnly: true });
    expect(r.ok).toBe(true);
    const data = m.db.user.update.mock.calls[0][0].data;
    expect(data.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(data.mustChangePassword).toBe(false);
    expect(m.db.auditLog.create.mock.calls[0][0].data.reason).toContain("PIN only");
  });

  it("only Operators and Team Leaders can have a PIN", async () => {
    for (const role of ["SUPERVISOR", "QA", "ADMIN", "SUPER_ADMIN", "MANAGEMENT", "VIEWER"]) {
      m.db.user.findUniqueOrThrow.mockResolvedValue({ id: "u1", name: "X", role, active: true });
      expect(await issueUserPin("u1")).toMatchObject({ ok: false, error: expect.stringContaining("Operators and Team Leaders") });
    }
    expect(m.db.user.update).not.toHaveBeenCalled();
  });

  it("refuses a deactivated account", async () => {
    m.db.user.findUniqueOrThrow.mockResolvedValue({ id: "u1", name: "X", role: "OPERATOR", active: false });
    expect(await issueUserPin("u1")).toMatchObject({ ok: false });
  });

  it("removing a PIN is audited, frees the PIN, and ends running sessions (the PIN timestamp moves)", async () => {
    await clearUserPin("u1");
    expect(m.db.user.update.mock.calls[0][0].data).toMatchObject({ pinHash: null, pinLookup: null, pinMustChange: false });
    expect(m.db.user.update.mock.calls[0][0].data.pinSetAt).toBeInstanceOf(Date);
    expect(m.db.auditLog.create).toHaveBeenCalledTimes(1);
  });
});

describe("registering iPads", () => {
  it("stores only the hash of the one-time setup code and gives it a 24-hour life", async () => {
    const r = await createKioskDevice("Bottling iPad");
    if (!r.ok) throw new Error(r.error);
    const data = m.db.kioskDevice.create.mock.calls[0][0].data;
    expect(data.setupCodeHash).toBe(sha256(r.data.code));
    expect(JSON.stringify(data)).not.toContain(r.data.code);
    expect(data.setupExpiresAt.getTime() - Date.now()).toBeGreaterThan(23 * 60 * 60_000);
    expect(data.setupExpiresAt.getTime() - Date.now()).toBeLessThan(25 * 60 * 60_000);
  });

  it("needs a sensible name", async () => {
    expect(await createKioskDevice("x")).toMatchObject({ ok: false });
    expect(await createKioskDevice("   ")).toMatchObject({ ok: false });
  });

  it("revoking clears its token so it stops working at once, and is audited", async () => {
    await revokeKioskDevice("dev1");
    expect(m.db.kioskDevice.update.mock.calls[0][0].data).toMatchObject({ tokenHash: null, setupCodeHash: null });
    expect(m.db.kioskDevice.update.mock.calls[0][0].data.revokedAt).toBeInstanceOf(Date);
    expect(m.db.auditLog.create).toHaveBeenCalledTimes(1);
  });
});

describe("PIN sign-in and NFC tags are for a Super Admin only", () => {
  it("an Admin (or anyone else) is refused every action", async () => {
    for (const role of ["ADMIN", "SUPERVISOR", "QA", "MANAGEMENT"]) {
      actor.current = { id: "x", name: "X", role };
      const refused = { ok: false, error: expect.stringContaining("Only a Super Admin") };
      expect(await issueUserPin("u1")).toEqual(refused);
      expect(await clearUserPin("u1")).toEqual(refused);
      expect(await createKioskDevice("Bottling iPad")).toEqual(refused);
      expect(await revokeKioskDevice("dev1")).toEqual(refused);
      expect(await setKioskAllowAnyPhone(false)).toEqual(refused);
      expect(await markChecklistTagWritten("c1", true)).toEqual(refused);
    }
    expect(m.db.user.update).not.toHaveBeenCalled();
    expect(m.db.kioskDevice.create).not.toHaveBeenCalled();
  });
});
