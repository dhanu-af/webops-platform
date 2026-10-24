import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
const userFindUniqueOrThrow = vi.fn();
const userUpdate = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => auth() }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: { user: { findUniqueOrThrow: (...a: unknown[]) => userFindUniqueOrThrow(...a), update: (...a: unknown[]) => userUpdate(...a), findUnique: vi.fn() } },
  withDbRetry: <T,>(fn: () => Promise<T>) => fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import bcrypt from "bcryptjs";
import { changePassword } from "@/lib/actions/users";

describe("changePassword returns readable errors instead of throwing", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ user: { id: "u1" } });
    userFindUniqueOrThrow.mockResolvedValue({
      id: "u1",
      name: "Dhanu",
      loginId: "dhanu",
      email: null,
      active: true,
      mustChangePassword: true,
      passwordHash: await bcrypt.hash("Dhanu123", 4),
    });
  });

  it("rejects a weak new password with the reason, instead of throwing", async () => {
    const r = await changePassword({ currentPassword: "Dhanu123", newPassword: "short" });
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/at least 10 characters/) });
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("allows a new password that contains the user's name", async () => {
    const r = await changePassword({ currentPassword: "Dhanu123", newPassword: "Dhanu12345" });
    expect(r).toEqual({ ok: true });
  });

  it("rejects a wrong current password", async () => {
    const r = await changePassword({ currentPassword: "nope", newPassword: "Crimson-Harbor-2026" });
    expect(r).toEqual({ ok: false, error: "Current password is incorrect." });
  });

  it("accepts a valid change and clears the temporary-password flag", async () => {
    const r = await changePassword({ currentPassword: "Dhanu123", newPassword: "Crimson-Harbor-2026" });
    expect(r).toEqual({ ok: true });
    expect(userUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ mustChangePassword: false }) }));
  });
});
