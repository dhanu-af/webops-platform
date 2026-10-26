import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";

// These run the real kiosk actions against an in-memory stand-in for the database.
const m = vi.hoisted(() => ({
  device: { current: null as null | { id: string; name: string } },
  phonesAllowed: { current: false },
  db: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn(), count: vi.fn() },
  },
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: m.db }));
vi.mock("@/lib/kiosk", () => ({
  getKioskAccess: vi.fn(async () => ({ device: m.device.current, allowed: !!m.device.current || m.phonesAllowed.current })),
}));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })) }));
vi.mock("@/lib/auth", () => ({ signIn: m.signIn, signOut: m.signOut }));

import { kioskSignIn } from "./kiosk";
import { hashPin, PIN_LOCK_MINUTES, PIN_MAX_FAILED } from "@/lib/pin";
import { verifyKioskTicket } from "@/lib/kiosk-token";

let pinHash: string;
const user = (over: Record<string, unknown> = {}) => ({
  id: "u1",
  name: "Olive Operator",
  role: "OPERATOR",
  active: true,
  pinHash,
  pinMustChange: false,
  pinFailedAttempts: 0,
  pinLockedUntil: null,
  ...over,
});

beforeAll(async () => {
  process.env.AUTH_SECRET = "test-secret-for-unit-tests";
  pinHash = await hashPin("u1", "4827");
});

beforeEach(() => {
  vi.clearAllMocks();
  m.device.current = { id: "dev1", name: "Bottling iPad" };
  m.phonesAllowed.current = false;
  m.db.auditLog.count.mockResolvedValue(0);
  m.db.user.findUnique.mockResolvedValue(user());
  m.signIn.mockResolvedValue("ok");
});

const actions = () => m.db.auditLog.create.mock.calls.map((c) => c[0].data.action);

describe("shop-floor PIN sign-in", () => {
  it("signs in with the right PIN on a registered iPad, audits it, and hands the sign-in a signed ticket", async () => {
    expect(await kioskSignIn({ userId: "u1", pin: "4827" })).toEqual({ ok: true, data: { status: "signed-in" } });
    expect(actions()).toEqual(["LOGIN"]);
    expect(m.db.auditLog.create.mock.calls[0][0].data.reason).toContain("Bottling iPad");
    const [provider, args] = m.signIn.mock.calls[0];
    expect(provider).toBe("pin");
    expect(args.redirect).toBe(false);
    expect(verifyKioskTicket(args.ticket)).toEqual({ userId: "u1", deviceId: "dev1" });
  });

  it("refuses everything on a device that is not registered when phones are switched off", async () => {
    m.device.current = null;
    expect(await kioskSignIn({ userId: "u1", pin: "4827" })).toEqual({ ok: false, error: expect.stringContaining("not set up") });
    expect(m.signIn).not.toHaveBeenCalled();
  });

  it("lets a staff phone sign in when phones are allowed, recorded as a phone", async () => {
    m.device.current = null;
    m.phonesAllowed.current = true;
    expect(await kioskSignIn({ userId: "u1", pin: "4827" })).toEqual({ ok: true, data: { status: "signed-in" } });
    expect(m.db.auditLog.create.mock.calls[0][0].data.reason).toContain("a staff phone");
    expect(verifyKioskTicket(m.signIn.mock.calls[0][1].ticket)).toEqual({ userId: "u1", deviceId: "phone" });
  });

  it("turns a phone away after 20 wrong phone PINs from the same network, even with the right PIN", async () => {
    m.device.current = null;
    m.phonesAllowed.current = true;
    m.db.auditLog.count.mockResolvedValue(20);
    expect(await kioskSignIn({ userId: "u1", pin: "4827" })).toEqual({ ok: false, error: expect.stringContaining("Too many wrong PINs from this phone") });
    expect(m.signIn).not.toHaveBeenCalled();
    // the count is of recent wrong PINs carrying this network's tag, never the address itself
    const where = m.db.auditLog.count.mock.calls[0][0].where;
    expect(where.action).toBe("LOGIN_FAILED");
    expect(where.AND[0].reason.contains).toBe("a staff phone");
    expect(where.AND[1].reason.contains).toMatch(/^\[net [0-9a-f]{12}\]$/);
    expect(JSON.stringify(where)).not.toContain("203.0.113.7");
  });

  it("a registered iPad is not subject to the per-network limit", async () => {
    m.db.auditLog.count.mockResolvedValue(50);
    expect(await kioskSignIn({ userId: "u1", pin: "4827" })).toMatchObject({ ok: true });
    expect(m.db.auditLog.count).not.toHaveBeenCalled();
  });

  it("wrong PINs are tagged with the network so they can be counted", async () => {
    m.device.current = null;
    m.phonesAllowed.current = true;
    await kioskSignIn({ userId: "u1", pin: "1357" });
    expect(m.db.auditLog.create.mock.calls[0][0].data.reason).toMatch(/Wrong PIN on a staff phone \[net [0-9a-f]{12}\]/);
  });

  it("refuses roles that sign in with a password, deactivated people and people with no PIN", async () => {
    for (const over of [{ role: "SUPERVISOR" }, { role: "QA" }, { role: "ADMIN" }, { active: false }, { pinHash: null }]) {
      m.db.user.findUnique.mockResolvedValue(user(over));
      expect(await kioskSignIn({ userId: "u1", pin: "4827" })).toEqual({ ok: false, error: expect.stringContaining("cannot sign in with a PIN") });
    }
    m.db.user.findUnique.mockResolvedValue(null);
    expect(await kioskSignIn({ userId: "nobody", pin: "4827" })).toMatchObject({ ok: false });
    expect(m.signIn).not.toHaveBeenCalled();
  });

  it("counts a wrong PIN, audits it and says how many tries are left", async () => {
    const r = await kioskSignIn({ userId: "u1", pin: "1357" });
    expect(r).toEqual({ ok: false, error: `Wrong PIN. ${PIN_MAX_FAILED - 1} tries left.` });
    expect(m.db.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { pinFailedAttempts: 1, pinLockedUntil: null } });
    expect(actions()).toEqual(["LOGIN_FAILED"]);
    expect(m.signIn).not.toHaveBeenCalled();
  });

  it("locks the PIN on the fifth wrong try", async () => {
    m.db.user.findUnique.mockResolvedValue(user({ pinFailedAttempts: PIN_MAX_FAILED - 1 }));
    const r = await kioskSignIn({ userId: "u1", pin: "1357" });
    expect(r).toEqual({ ok: false, error: expect.stringContaining(`locked for ${PIN_LOCK_MINUTES} minutes`) });
    expect(m.db.user.update.mock.calls[0][0].data.pinLockedUntil).toBeInstanceOf(Date);
  });

  it("will not accept even the right PIN while locked", async () => {
    m.db.user.findUnique.mockResolvedValue(user({ pinLockedUntil: new Date(Date.now() + 5 * 60_000) }));
    const r = await kioskSignIn({ userId: "u1", pin: "4827" });
    expect(r).toEqual({ ok: false, error: expect.stringContaining("Too many wrong PINs") });
    expect(m.signIn).not.toHaveBeenCalled();
  });

  it("treats anything that is not 4 digits as a wrong PIN", async () => {
    for (const pin of ["", "482", "48271", "abcd"]) expect(await kioskSignIn({ userId: "u1", pin })).toMatchObject({ ok: false });
    expect(m.signIn).not.toHaveBeenCalled();
  });

  it("clears the wrong-PIN counter after a correct PIN", async () => {
    m.db.user.findUnique.mockResolvedValue(user({ pinFailedAttempts: 3 }));
    await kioskSignIn({ userId: "u1", pin: "4827" });
    expect(m.db.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { pinFailedAttempts: 0, pinLockedUntil: null } });
  });
});

describe("temporary PIN (first use)", () => {
  beforeEach(async () => {
    m.db.user.findUnique.mockResolvedValue(user({ pinMustChange: true, pinHash: await hashPin("u1", "4827") }));
  });

  it("asks the person to choose their own PIN and does not sign in yet", async () => {
    expect(await kioskSignIn({ userId: "u1", pin: "4827" })).toEqual({ ok: true, data: { status: "choose-new-pin" } });
    expect(m.signIn).not.toHaveBeenCalled();
    expect(m.db.user.update).not.toHaveBeenCalled();
  });

  it("rejects a weak new PIN and the temporary PIN again", async () => {
    expect(await kioskSignIn({ userId: "u1", pin: "4827", newPin: "1234" })).toMatchObject({ ok: false });
    expect(await kioskSignIn({ userId: "u1", pin: "4827", newPin: "4827" })).toEqual({ ok: false, error: expect.stringContaining("different from the temporary one") });
    expect(m.signIn).not.toHaveBeenCalled();
  });

  it("stores the new PIN (hashed), ends the temporary state, audits it and signs in", async () => {
    expect(await kioskSignIn({ userId: "u1", pin: "4827", newPin: "7391" })).toEqual({ ok: true, data: { status: "signed-in" } });
    const data = m.db.user.update.mock.calls[0][0].data;
    expect(data.pinMustChange).toBe(false);
    expect(data.pinHash).not.toContain("7391");
    expect(await bcrypt.compare("not-the-hash", data.pinHash)).toBe(false);
    expect(actions()).toEqual(["EDITED", "LOGIN"]);
    expect(m.signIn).toHaveBeenCalledTimes(1);
  });

  it("a wrong temporary PIN counts as a wrong PIN", async () => {
    expect(await kioskSignIn({ userId: "u1", pin: "9999", newPin: "7391" })).toMatchObject({ ok: false, error: expect.stringContaining("Wrong PIN") });
    expect(m.signIn).not.toHaveBeenCalled();
  });
});
