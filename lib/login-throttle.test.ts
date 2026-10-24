import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { afterFailedLogin, DUMMY_PASSWORD_HASH, isLocked, LOCK_MINUTES, MAX_FAILED_LOGINS } from "@/lib/login-throttle";

describe("sign-in lockout", () => {
  const now = new Date("2026-10-24T03:00:00Z");

  it("counts wrong passwords without locking until the limit", () => {
    expect(afterFailedLogin(0, now)).toEqual({ failedLogins: 1, lockedUntil: null });
    expect(afterFailedLogin(MAX_FAILED_LOGINS - 2, now)).toEqual({ failedLogins: MAX_FAILED_LOGINS - 1, lockedUntil: null });
  });

  it("locks for 15 minutes on the limit and resets the counter", () => {
    const r = afterFailedLogin(MAX_FAILED_LOGINS - 1, now);
    expect(r.failedLogins).toBe(0);
    expect(r.lockedUntil?.getTime()).toBe(now.getTime() + LOCK_MINUTES * 60_000);
  });

  it("is locked only until the lock time passes", () => {
    const until = new Date(now.getTime() + 60_000);
    expect(isLocked(until, now)).toBe(true);
    expect(isLocked(until, new Date(now.getTime() + 61_000))).toBe(false);
    expect(isLocked(null, now)).toBe(false);
  });

  it("the dummy hash is a real bcrypt hash that no ordinary password matches", async () => {
    expect(DUMMY_PASSWORD_HASH).toMatch(/^\$2[aby]\$10\$/);
    expect(await bcrypt.compare("password", DUMMY_PASSWORD_HASH)).toBe(false);
  });
});
