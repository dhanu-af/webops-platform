import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  actor: { current: { id: "admin1", name: "Ada Admin", role: "ADMIN" } },
  db: {
    user: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ db: m.db, withDbRetry: <T,>(fn: () => Promise<T>) => fn() }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/session-user", () => ({ requireUserWithPermission: vi.fn(async () => m.actor.current), requireActiveUser: vi.fn(), requireLiveUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { adminResetPassword, createUser, setUserActive, updateUser } from "./users";
import { canSeeSuperAdmins, visibleUsersWhere } from "@/lib/visible-users";

const newUser = (role: string) => ({ name: "Sam", loginId: "sam01", password: "Temp-pass-9x", role } as Parameters<typeof createUser>[0]);

beforeEach(() => {
  vi.clearAllMocks();
  m.actor.current = { id: "admin1", name: "Ada Admin", role: "ADMIN" };
  m.db.user.findUnique.mockResolvedValue(null);
  m.db.user.create.mockResolvedValue({ id: "new1", name: "Sam", loginId: "sam01", email: null, role: "OPERATOR" });
});

describe("only a Super Admin can create or change a Super Admin", () => {
  it("an Admin cannot create a Super Admin account", async () => {
    expect(await createUser(newUser("SUPER_ADMIN"))).toEqual({ ok: false, error: expect.stringContaining("Only a Super Admin") });
    expect(m.db.user.create).not.toHaveBeenCalled();
  });

  it("an Admin can still create ordinary accounts", async () => {
    await createUser(newUser("OPERATOR")).catch(() => undefined);
    expect(m.db.user.create).toHaveBeenCalled();
  });

  it("a Super Admin can create a Super Admin", async () => {
    m.actor.current = { id: "boss", name: "Dhanu", role: "SUPER_ADMIN" };
    await createUser(newUser("SUPER_ADMIN")).catch(() => undefined);
    expect(m.db.user.create).toHaveBeenCalled();
  });

  it("an Admin cannot edit a Super Admin, or promote anyone to Super Admin", async () => {
    m.db.user.findUniqueOrThrow.mockResolvedValue({ id: "boss", role: "SUPER_ADMIN", loginId: "dhanu", assignedAreas: [] });
    expect(await updateUser("boss", { role: "ADMIN" })).toMatchObject({ ok: false, error: expect.stringContaining("Only a Super Admin") });
    m.db.user.findUniqueOrThrow.mockResolvedValue({ id: "u2", role: "OPERATOR", loginId: "op", assignedAreas: [] });
    expect(await updateUser("u2", { role: "SUPER_ADMIN" })).toMatchObject({ ok: false, error: expect.stringContaining("Only a Super Admin") });
    expect(m.db.user.update).not.toHaveBeenCalled();
  });

  it("an Admin cannot reset a Super Admin's password", async () => {
    m.db.user.findUniqueOrThrow.mockResolvedValue({ id: "boss", role: "SUPER_ADMIN" });
    expect(await adminResetPassword("boss", "Temp-pass-9x")).toMatchObject({ ok: false, error: expect.stringContaining("Only a Super Admin") });
    expect(m.db.user.update).not.toHaveBeenCalled();
  });

  it("an Admin cannot deactivate a Super Admin, but can deactivate an operator", async () => {
    m.db.user.findUniqueOrThrow.mockResolvedValue({ role: "SUPER_ADMIN" });
    expect(await setUserActive("boss", false)).toMatchObject({ ok: false, error: expect.stringContaining("Only a Super Admin") });
    expect(m.db.user.update).not.toHaveBeenCalled();
    m.db.user.findUniqueOrThrow.mockResolvedValue({ role: "OPERATOR" });
    expect(await setUserActive("u2", false)).toEqual({ ok: true });
    expect(m.db.user.update).toHaveBeenCalledTimes(1);
  });
});

describe("Super Admins are not listed for anyone else", () => {
  it("only a Super Admin sees Super Admin accounts", () => {
    expect(canSeeSuperAdmins("SUPER_ADMIN")).toBe(true);
    for (const role of ["ADMIN", "QA", "SUPERVISOR", "OPERATOR", "MANAGEMENT", "VIEWER", "TEAM_LEADER"]) expect(canSeeSuperAdmins(role)).toBe(false);
  });

  it("the list filter leaves Super Admins out for everyone but a Super Admin", () => {
    expect(visibleUsersWhere("ADMIN")).toEqual({ role: { not: "SUPER_ADMIN" } });
    expect(visibleUsersWhere("QA")).toEqual({ role: { not: "SUPER_ADMIN" } });
    expect(visibleUsersWhere("SUPER_ADMIN")).toEqual({});
  });
});
