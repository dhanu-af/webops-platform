import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
const findUnique = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => auth() }));
vi.mock("@/lib/db", () => ({
  db: { user: { findUnique: (...a: unknown[]) => findUnique(...a) } },
  withDbRetry: <T,>(fn: () => Promise<T>) => fn(),
}));

import { requireActiveUser } from "@/lib/session-user";

describe("requireActiveUser", () => {
  beforeEach(() => {
    auth.mockResolvedValue({ user: { id: "u1" } });
  });

  it("returns an active user", async () => {
    findUnique.mockResolvedValue({ id: "u1", role: "OPERATOR", active: true, mustChangePassword: false });
    await expect(requireActiveUser()).resolves.toMatchObject({ id: "u1" });
  });

  it("refuses a deactivated user", async () => {
    findUnique.mockResolvedValue({ id: "u1", role: "OPERATOR", active: false, mustChangePassword: false });
    await expect(requireActiveUser()).rejects.toThrow(/deactivated/);
  });

  it("refuses a user still on a temporary password", async () => {
    findUnique.mockResolvedValue({ id: "u1", role: "OPERATOR", active: true, mustChangePassword: true });
    await expect(requireActiveUser()).rejects.toThrow(/temporary password/);
  });
});
