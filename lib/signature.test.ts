import { describe, expect, it, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { MAX_FAILED_LOGINS } from "@/lib/login-throttle";

const m = vi.hoisted(() => ({
  db: { user: { findUniqueOrThrow: vi.fn(), update: vi.fn() }, auditLog: { create: vi.fn() } },
}));
vi.mock("@/lib/db", () => ({ db: m.db }));

import { verifySignaturePassword } from "./signature";

const hash = bcrypt.hashSync("Correct-horse-9", 4);

beforeEach(() => vi.clearAllMocks());

describe("e-signature password check shares the sign-in lockout", () => {
  it("counts a wrong password and audits it", async () => {
    m.db.user.findUniqueOrThrow.mockResolvedValue({ passwordHash: hash, failedLogins: 2, lockedUntil: null });
    await expect(verifySignaturePassword("u1", "wrong", "approval")).rejects.toThrow(/incorrect/);
    expect(m.db.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { failedLogins: 3, lockedUntil: null } });
    expect(m.db.auditLog.create.mock.calls[0][0].data.action).toBe("SIGNATURE_FAILED");
  });

  it("locks the account on the last allowed wrong password", async () => {
    m.db.user.findUniqueOrThrow.mockResolvedValue({ passwordHash: hash, failedLogins: MAX_FAILED_LOGINS - 1, lockedUntil: null });
    await expect(verifySignaturePassword("u1", "wrong", "approval")).rejects.toThrow(/incorrect/);
    expect(m.db.user.update.mock.calls[0][0].data.lockedUntil).toBeInstanceOf(Date);
  });

  it("refuses to sign while locked, even with the right password", async () => {
    m.db.user.findUniqueOrThrow.mockResolvedValue({ passwordHash: hash, failedLogins: 0, lockedUntil: new Date(Date.now() + 60_000) });
    await expect(verifySignaturePassword("u1", "Correct-horse-9", "approval")).rejects.toThrow(/locked/);
  });

  it("clears the counter after a correct password", async () => {
    m.db.user.findUniqueOrThrow.mockResolvedValue({ passwordHash: hash, failedLogins: 4, lockedUntil: null });
    await verifySignaturePassword("u1", "Correct-horse-9", "approval");
    expect(m.db.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { failedLogins: 0, lockedUntil: null } });
  });
});
