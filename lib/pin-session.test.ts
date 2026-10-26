import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ db: { kioskDevice: { findUnique: vi.fn() } }, phones: { allowed: true } }));
vi.mock("@/lib/db", () => ({ db: m.db }));
vi.mock("@/lib/cached-config", () => ({ getCachedKioskAllowAnyPhone: vi.fn(async () => m.phones.allowed) }));

import { pinSessionProblem } from "./pin-session";

const NOW = Date.now();
const live = (over: Record<string, unknown> = {}) => ({ role: "OPERATOR", active: true, pinSetAt: new Date(NOW - 60 * 60_000), ...over });
const pinSession = (over: Record<string, unknown> = {}) => ({ authMethod: "pin" as const, authAt: NOW - 60_000, kioskDeviceId: "dev1", ...over });

beforeEach(() => {
  vi.clearAllMocks();
  m.phones.allowed = true;
  m.db.kioskDevice.findUnique.mockResolvedValue({ revokedAt: null });
});

describe("a shop-floor PIN session is only valid while its conditions hold", () => {
  it("a password session is not affected", async () => {
    expect(await pinSessionProblem({ authMethod: "password" }, live({ role: "SUPERVISOR" }))).toBeNull();
    expect(await pinSessionProblem({}, live())).toBeNull();
  });

  it("is fine for a recent session of an active operator on a registered device", async () => {
    expect(await pinSessionProblem(pinSession(), live())).toBeNull();
  });

  it("ends 30 minutes after the PIN was entered", async () => {
    expect(await pinSessionProblem(pinSession({ authAt: NOW - 31 * 60_000 }), live())).toMatch(/session ended/);
    expect(await pinSessionProblem(pinSession({ authAt: NOW - 29 * 60_000 }), live())).toBeNull();
  });

  it("ends when the PIN was changed or reset after it started", async () => {
    expect(await pinSessionProblem(pinSession(), live({ pinSetAt: new Date(NOW - 10_000) }))).toMatch(/PIN was changed/);
  });

  it("ends when the iPad is revoked, or the session has no device", async () => {
    m.db.kioskDevice.findUnique.mockResolvedValue({ revokedAt: new Date() });
    expect(await pinSessionProblem(pinSession(), live())).toMatch(/no longer set up/);
    m.db.kioskDevice.findUnique.mockResolvedValue(null);
    expect(await pinSessionProblem(pinSession(), live())).toMatch(/no longer set up/);
  });

  it("a staff-phone session (no device) lasts only while phones are allowed", async () => {
    expect(await pinSessionProblem(pinSession({ kioskDeviceId: null }), live())).toBeNull();
    m.phones.allowed = false;
    expect(await pinSessionProblem(pinSession({ kioskDeviceId: null }), live())).toMatch(/switched off/);
    expect(m.db.kioskDevice.findUnique).not.toHaveBeenCalled();
  });

  it("ends when the person is deactivated or is no longer an operator or team leader", async () => {
    expect(await pinSessionProblem(pinSession(), live({ active: false }))).toMatch(/deactivated/);
    expect(await pinSessionProblem(pinSession(), live({ role: "SUPERVISOR" }))).toMatch(/not available for your role/);
  });
});
