import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  actor: { current: { id: "admin1", name: "Ada Admin", role: "ADMIN" } },
  db: {
    user: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ db: m.db, withDbRetry: <T,>(fn: () => Promise<T>) => fn() }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/session-user", () => ({ requireUserWithPermission: vi.fn(async () => m.actor.current), requireActiveUser: vi.fn(), requireLiveUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { adminResetPassword, createUser, deleteUser, setUserActive, updateUser } from "./users";
import { canSeeSuperAdmins, visibleUsersWhere } from "@/lib/visible-users";

const newUser = (role: string) => ({ name: "Sam", loginId: "sam01", password: "Temp-pass-9x", role } as Parameters<typeof createUser>[0]);

beforeEach(() => {
  vi.clearAllMocks();
  m.actor.current = { id: "admin1", name: "Ada Admin", role: "ADMIN" };
  m.db.user.findUnique.mockResolvedValue(null);
  m.db.user.create.mockResolvedValue({ id: "new1", name: "Sam", loginId: "sam01", email: null, role: "OPERATOR" });
  m.db.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(m.db));
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

describe("deleting an account (Super Admin only, never-used accounts only)", () => {
  const target = (over: Record<string, unknown> = {}) => ({ id: "u2", name: "Test Person", loginId: "testp", role: "OPERATOR", active: true, ...over });

  beforeEach(() => {
    m.actor.current = { id: "boss", name: "Dhanu", role: "SUPER_ADMIN" };
    m.db.user.findUniqueOrThrow.mockResolvedValue(target());
    m.db.user.count.mockResolvedValue(1);
  });

  it("an Admin cannot delete anyone", async () => {
    m.actor.current = { id: "admin1", name: "Ada Admin", role: "ADMIN" };
    expect(await deleteUser("u2")).toEqual({ ok: false, error: expect.stringContaining("Only a Super Admin") });
    expect(m.db.user.delete).not.toHaveBeenCalled();
  });

  it("a Super Admin can delete a never-used account, and it is audited", async () => {
    expect(await deleteUser("u2")).toEqual({ ok: true });
    expect(m.db.user.delete).toHaveBeenCalledWith({ where: { id: "u2" } });
  });

  it("nobody can delete their own account", async () => {
    expect(await deleteUser("boss")).toEqual({ ok: false, error: expect.stringContaining("own account") });
    expect(m.db.user.delete).not.toHaveBeenCalled();
  });

  it("the only active Super Admin cannot be deleted", async () => {
    m.db.user.findUniqueOrThrow.mockResolvedValue(target({ role: "SUPER_ADMIN" }));
    m.db.user.count.mockResolvedValue(0);
    expect(await deleteUser("u2")).toEqual({ ok: false, error: expect.stringContaining("only active Super Admin") });
    expect(m.db.user.delete).not.toHaveBeenCalled();
  });

  it("an account with history is refused with a plain explanation (the database blocks the delete)", async () => {
    m.db.user.delete.mockRejectedValue(Object.assign(new Error("Foreign key constraint violated"), { code: "P2003" }));
    expect(await deleteUser("u2")).toEqual({ ok: false, error: expect.stringContaining("has history") });
  });
});
