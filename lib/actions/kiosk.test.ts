import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// These run the real PIN sign-in action against an in-memory stand-in for the database.
const m = vi.hoisted(() => ({
  device: { current: null as null | { id: string; name: string } },
  phonesAllowed: { current: true },
  db: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
    pinAttempt: { create: vi.fn(), count: vi.fn(), deleteMany: vi.fn() },
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
import { hashPin, pinLookup, PIN_MAX_WRONG_OVERALL, PIN_MAX_WRONG_PER_NETWORK } from "@/lib/pin";
import { verifyKioskTicket } from "@/lib/kiosk-token";

let pinHash: string;
const user = (over: Record<string, unknown> = {}) => ({
  id: "u1",
  name: "Olive Operator",
  role: "OPERATOR",
  active: true,
  pinHash,
  pinMustChange: false,
  ...over,
});

beforeAll(async () => {
  process.env.AUTH_SECRET = "test-secret-for-unit-tests";
  pinHash = await hashPin("u1", "4827");
});

// The user table knows only the PINs we say are in use: lookups by PIN find that person, nobody else.
function usersByPin(pins: Record<string, ReturnType<typeof user>>) {
  m.db.user.findUnique.mockImplementation(async ({ where }: { where: { pinLookup?: string } }) => {
    for (const [pin, u] of Object.entries(pins)) if (where.pinLookup === pinLookup(pin)) return u;
    return null;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  m.device.current = null;
  m.phonesAllowed.current = true;
  m.db.pinAttempt.count.mockResolvedValue(0);
  m.db.pinAttempt.deleteMany.mockResolvedValue({ count: 0 });
  m.signIn.mockResolvedValue("ok");
  usersByPin({ "4827": user() });
});

const actions = () => m.db.auditLog.create.mock.calls.map((c) => c[0].data.action);

describe("PIN sign-in (the PIN alone says who you are)", () => {
  it("signs in with a correct PIN, no name needed, audits it and hands the sign-in a signed ticket", async () => {
    expect(await kioskSignIn({ pin: "4827" })).toEqual({ ok: true, data: { status: "signed-in" } });
    expect(actions()).toEqual(["LOGIN"]);
    expect(m.db.auditLog.create.mock.calls[0][0].data.userId).toBe("u1");
    const [provider, args] = m.signIn.mock.calls[0];
    expect(provider).toBe("pin");
    expect(args.redirect).toBe(false);
    expect(verifyKioskTicket(args.ticket)).toEqual({ userId: "u1", deviceId: "phone" });
  });

  it("works on a registered iPad too, recorded against the iPad", async () => {
    m.device.current = { id: "dev1", name: "Bottling iPad" };
    await kioskSignIn({ pin: "4827" });
    expect(m.db.auditLog.create.mock.calls[0][0].data.reason).toContain("Bottling iPad");
    expect(verifyKioskTicket(m.signIn.mock.calls[0][1].ticket)).toEqual({ userId: "u1", deviceId: "dev1" });
  });

  it("is refused when phones are switched off and this is not a registered iPad", async () => {
    m.phonesAllowed.current = false;
    expect(await kioskSignIn({ pin: "4827" })).toEqual({ ok: false, error: expect.stringContaining("not available on this device") });
    expect(m.signIn).not.toHaveBeenCalled();
  });

  it("a wrong PIN is counted for this network and says how many tries are left", async () => {
    m.db.pinAttempt.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    const r = await kioskSignIn({ pin: "9136" });
    expect(r).toEqual({ ok: false, error: `Wrong PIN. ${PIN_MAX_WRONG_PER_NETWORK - 1} tries left.` });
    expect(m.db.pinAttempt.create).toHaveBeenCalledTimes(1);
    expect(m.db.pinAttempt.create.mock.calls[0][0].data.net).toMatch(/^[0-9a-f]{12}$/);
    expect(m.signIn).not.toHaveBeenCalled();
  });

  it("treats anything that is not 4 digits as a wrong PIN without looking anyone up", async () => {
    for (const pin of ["", "482", "48271", "abcd"]) expect(await kioskSignIn({ pin })).toMatchObject({ ok: false });
    expect(m.db.user.findUnique).not.toHaveBeenCalled();
    expect(m.signIn).not.toHaveBeenCalled();
  });

  it("a PIN that belongs to a deactivated person, or to a role that uses a password, does not sign in", async () => {
    for (const over of [{ active: false }, { role: "SUPERVISOR" }, { role: "QA" }, { role: "ADMIN" }, { pinHash: null }]) {
      usersByPin({ "4827": user(over) });
      expect(await kioskSignIn({ pin: "4827" })).toMatchObject({ ok: false, error: expect.stringContaining("Wrong PIN") });
    }
    expect(m.signIn).not.toHaveBeenCalled();
  });

  it("the stored lookup alone is not enough: the PIN must also match the person's own hash", async () => {
    usersByPin({ "4827": user({ pinHash: await hashPin("u1", "1357") }) });
    expect(await kioskSignIn({ pin: "4827" })).toMatchObject({ ok: false });
    expect(m.signIn).not.toHaveBeenCalled();
  });
});

describe("limits on guessing", () => {
  it("turns a network away after 5 wrong PINs, even with the right PIN", async () => {
    m.db.pinAttempt.count.mockResolvedValueOnce(PIN_MAX_WRONG_PER_NETWORK).mockResolvedValueOnce(PIN_MAX_WRONG_PER_NETWORK);
    expect(await kioskSignIn({ pin: "4827" })).toEqual({ ok: false, error: expect.stringContaining("Too many wrong PINs from here") });
    expect(m.signIn).not.toHaveBeenCalled();
    expect(m.db.user.findUnique).not.toHaveBeenCalled();
  });

  it("pauses PIN sign-in for everyone after 25 wrong PINs overall, and points people to their password", async () => {
    m.db.pinAttempt.count.mockResolvedValueOnce(0).mockResolvedValueOnce(PIN_MAX_WRONG_OVERALL);
    expect(await kioskSignIn({ pin: "4827" })).toEqual({ ok: false, error: expect.stringMatching(/paused.*password/) });
    expect(m.signIn).not.toHaveBeenCalled();
  });

  it("only counts recent attempts, and never stores the network address itself", async () => {
    await kioskSignIn({ pin: "4827" });
    const where = m.db.pinAttempt.count.mock.calls[0][0].where;
    expect(where.createdAt.gte.getTime()).toBeGreaterThan(Date.now() - 16 * 60_000);
    expect(JSON.stringify(m.db.pinAttempt.count.mock.calls)).not.toContain("203.0.113.7");
  });
});

describe("temporary PIN (first use)", () => {
  beforeEach(() => {
    usersByPin({ "4827": user({ pinMustChange: true }) });
  });

  it("asks the person to choose their own PIN and does not sign in yet", async () => {
    expect(await kioskSignIn({ pin: "4827" })).toEqual({ ok: true, data: { status: "choose-new-pin" } });
    expect(m.signIn).not.toHaveBeenCalled();
    expect(m.db.user.update).not.toHaveBeenCalled();
  });

  it("rejects a weak new PIN and the temporary PIN again", async () => {
    expect(await kioskSignIn({ pin: "4827", newPin: "1234" })).toMatchObject({ ok: false });
    expect(await kioskSignIn({ pin: "4827", newPin: "4827" })).toEqual({ ok: false, error: expect.stringContaining("different from the temporary one") });
    expect(m.signIn).not.toHaveBeenCalled();
  });

  it("stores the new PIN (hashed, with its lookup), ends the temporary state, audits it and signs in", async () => {
    expect(await kioskSignIn({ pin: "4827", newPin: "7391" })).toEqual({ ok: true, data: { status: "signed-in" } });
    const data = m.db.user.update.mock.calls[0][0].data;
    expect(data.pinMustChange).toBe(false);
    expect(data.pinLookup).toBe(pinLookup("7391"));
    expect(JSON.stringify(data)).not.toContain("7391");
    expect(actions()).toEqual(["EDITED", "LOGIN"]);
    expect(m.signIn).toHaveBeenCalledTimes(1);
  });

  it("refuses a PIN another person already has, vaguely, and counts it as a wrong try", async () => {
    usersByPin({ "4827": user({ pinMustChange: true }), "7391": user({ id: "u2" }) });
    const r = await kioskSignIn({ pin: "4827", newPin: "7391" });
    expect(r).toEqual({ ok: false, error: "That PIN cannot be used. Choose a different one." });
    expect(m.db.pinAttempt.create).toHaveBeenCalledTimes(1);
    expect(m.db.user.update).not.toHaveBeenCalled();
    expect(m.signIn).not.toHaveBeenCalled();
  });

  it("a wrong temporary PIN counts as a wrong PIN", async () => {
    expect(await kioskSignIn({ pin: "9999", newPin: "7391" })).toMatchObject({ ok: false, error: expect.stringContaining("Wrong PIN") });
    expect(m.signIn).not.toHaveBeenCalled();
  });
});
