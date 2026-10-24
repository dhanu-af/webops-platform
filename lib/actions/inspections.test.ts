import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import bcrypt from "bcryptjs";

// These run the real server actions against an in-memory stand-in for the
// database, so the rules enforced in lib/actions/inspections.ts are what's
// being tested -- not a re-implementation of them.
const m = vi.hoisted(() => ({
  session: { current: null as null | { user: { id: string } } },
  db: {
    user: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), findMany: vi.fn() },
    inspection: { findUniqueOrThrow: vi.fn(), findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), findFirst: vi.fn() },
    checklistItem: { findUniqueOrThrow: vi.fn() },
    inspectionResponse: { findUnique: vi.fn(), upsert: vi.fn(), count: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    photoEvidence: { findUnique: vi.fn(), delete: vi.fn() },
    checklistSchedule: { findUniqueOrThrow: vi.fn() },
    finding: { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn(), delete: vi.fn(), update: vi.fn(), findUniqueOrThrow: vi.fn() },
    correctiveAction: { create: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
    verificationRecord: { create: vi.fn() },
    areaRelease: { upsert: vi.fn() },
    auditLog: { create: vi.fn() },
    checklist: { findUnique: vi.fn() },
    area: { findUnique: vi.fn() },
    facility: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ db: m.db, withDbRetry: (f: () => unknown) => f() }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => m.session.current) }));
vi.mock("@/lib/notifications", () => ({ notify: vi.fn().mockResolvedValue(undefined), notifyUsers: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/storage", () => ({ storePhoto: vi.fn(), getMaxPhotoBytes: vi.fn(), isAllowedPhotoFile: vi.fn(), deletePhotoFile: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/timezone", () => ({ getFacilityTimezone: vi.fn(), startOfDayInTimeZone: vi.fn(), endOfDayInTimeZone: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  saveResponse,
  submitInspection,
  verifyInspection,
  resubmitReturnedInspection,
  closeCorrectiveAction,
  startAdHocInspection,
  markNoProduction,
  clearResponse,
  deletePhoto,
} from "./inspections";

type Role = "OPERATOR" | "SUPERVISOR" | "QA" | "VIEWER" | "ADMIN" | "SUPER_ADMIN";

function signIn(role: Role, id: string, opts: { active?: boolean; name?: string; areas?: Array<{ id: string; sectionId: string; facilityId: string }> } = {}) {
  m.session.current = { user: { id } };
  m.db.user.findUnique.mockResolvedValue({
    id,
    name: opts.name ?? "Test User",
    email: `${id}@example.com`,
    role,
    active: opts.active ?? true,
    assignedAreas: (opts.areas ?? []).map((a) => ({ id: a.id, sectionId: a.sectionId, section: { facilityId: a.facilityId } })),
  });
}

const FIXED_NOW = new Date("2026-10-23T01:02:03.000Z");

const checklistItem = (over: Record<string, unknown> = {}) => ({
  id: "item1",
  prompt: "Floor clean",
  type: "PASS_FAIL",
  required: true,
  requiresPhotoOnFail: false,
  criticalFailure: false,
  minValue: null,
  maxValue: null,
  ...over,
});

const workflow = (roles: string[] = ["OPERATOR", "SUPERVISOR", "QA"]) => ({
  requiresAreaRelease: false,
  steps: roles.map((role, i) => ({ order: i + 1, role })),
});

const openInspection = (over: Record<string, unknown> = {}) => ({
  id: "insp1",
  status: "IN_PROGRESS",
  operatorId: "op1",
  areaId: "area1",
  sectionId: "sec1",
  facilityId: "fac1",
  equipmentId: null,
  submittedAt: null,
  reopenReason: null,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
  m.db.inspectionResponse.upsert.mockResolvedValue({ id: "resp1" });
  m.db.inspectionResponse.findUnique.mockResolvedValue(null);
  m.db.finding.findUnique.mockResolvedValue(null);
  m.db.finding.create.mockResolvedValue({ id: "find1" });
  m.db.checklistItem.findUniqueOrThrow.mockResolvedValue(checklistItem());
  m.db.user.findMany.mockResolvedValue([]);
});
afterEach(() => vi.useRealTimers());

describe("URS-06 server-generated timestamp and user", () => {
  it("takes the user from the session and never from the request, and sends no timestamps of its own", async () => {
    signIn("OPERATOR", "op1");
    m.db.inspection.findUniqueOrThrow.mockResolvedValue(openInspection());

    await saveResponse({
      inspectionId: "insp1",
      checklistItemId: "item1",
      passFail: "PASS",
      // A tampered client trying to claim another user and a back-dated time:
      ...({ respondedById: "someone-else", createdAt: new Date(0), updatedAt: new Date(0) } as object),
    } as never);

    const { create, update } = m.db.inspectionResponse.upsert.mock.calls[0][0];
    expect(create.respondedById).toBe("op1");
    expect(update.respondedById).toBe("op1");
    for (const data of [create, update]) {
      expect(data).not.toHaveProperty("createdAt");
      expect(data).not.toHaveProperty("updatedAt");
    }
  });

  it("stamps submission with the server clock", async () => {
    signIn("OPERATOR", "op1");
    m.db.inspection.findUniqueOrThrow.mockResolvedValue({
      ...openInspection(),
      product: null,
      batchNumber: null,
      previousProduct: null,
      previousBatchNumber: null,
      area: { name: "Line 1" },
      checklistVersion: { items: [checklistItem()], checklist: { name: "Daily", category: "POST_OPERATION_CLEANING", workflow: workflow(["OPERATOR", "SUPERVISOR"]) } },
      responses: [{ checklistItemId: "item1", passFail: "PASS", numericValue: null, textValue: null, choiceValue: null, id: "resp1", finding: null }],
      photoEvidence: [],
    });

    const result = await submitInspection("insp1");

    expect(result).toEqual({ ok: true });
    expect(m.db.inspection.update.mock.calls[0][0].data.submittedAt).toEqual(FIXED_NOW);
  });
});

describe("URS-05 required fields", () => {
  const submittable = (over: Record<string, unknown>) => {
    m.db.inspection.findUniqueOrThrow.mockResolvedValue({
      ...openInspection(),
      product: null,
      batchNumber: null,
      previousProduct: null,
      previousBatchNumber: null,
      area: { name: "Line 1" },
      checklistVersion: { items: [checklistItem({ type: "TEXT" })], checklist: { name: "Daily", category: "POST_OPERATION_CLEANING", workflow: workflow(["OPERATOR", "SUPERVISOR"]) } },
      responses: [],
      photoEvidence: [],
      ...over,
    });
  };

  it("refuses to submit while a required answer is missing", async () => {
    signIn("OPERATOR", "op1");
    submittable({});
    const result = await submitInspection("insp1");
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('"Floor clean" is required') });
    expect(m.db.inspection.update).not.toHaveBeenCalled();
  });

  it("refuses to submit when the saved answer is blank", async () => {
    signIn("OPERATOR", "op1");
    submittable({ responses: [{ checklistItemId: "item1", passFail: null, numericValue: null, textValue: "  ", choiceValue: null, id: "r", finding: null }] });
    expect(await submitInspection("insp1")).toMatchObject({ ok: false });
  });

  it("refuses to submit a line clearance without previous and next product/batch", async () => {
    signIn("OPERATOR", "op1");
    submittable({
      checklistVersion: { items: [], checklist: { name: "Line Clearance", category: "LINE_CLEARANCE", workflow: workflow(["OPERATOR", "SUPERVISOR"]) } },
    });
    const result = await submitInspection("insp1");
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("Previous product") });
  });
});

describe("URS-07 failures require corrective action and block release", () => {
  const failedRecord = (correctiveAction: { status: string } | null) => ({
    ...openInspection(),
    product: null,
    batchNumber: null,
    previousProduct: null,
    previousBatchNumber: null,
    area: { name: "Line 1" },
    checklistVersion: { items: [checklistItem()], checklist: { name: "Daily", category: "POST_OPERATION_CLEANING", workflow: workflow(["OPERATOR", "SUPERVISOR"]) } },
    responses: [{ checklistItemId: "item1", passFail: "FAIL", numericValue: null, textValue: null, choiceValue: null, id: "resp1", finding: { photoEvidence: [], correctiveAction } }],
    photoEvidence: [],
  });

  it("will not submit a failed item that has no corrective action", async () => {
    signIn("OPERATOR", "op1");
    m.db.inspection.findUniqueOrThrow.mockResolvedValue(failedRecord(null));
    expect(await submitInspection("insp1")).toMatchObject({ ok: false, error: expect.stringContaining("corrective action is required") });
    expect(m.db.inspection.update).not.toHaveBeenCalled();
  });

  it("submits once the corrective action is recorded", async () => {
    signIn("OPERATOR", "op1");
    m.db.inspection.findUniqueOrThrow.mockResolvedValue(failedRecord({ status: "OPEN" }));
    expect(await submitInspection("insp1")).toEqual({ ok: true });
  });

  it("opens a finding for any FAIL, including an out-of-range measurement", async () => {
    signIn("OPERATOR", "op1");
    m.db.inspection.findUniqueOrThrow.mockResolvedValue(openInspection());
    m.db.checklistItem.findUniqueOrThrow.mockResolvedValue(checklistItem({ type: "NUMERIC", prompt: "Sanitiser ppm", minValue: 200, maxValue: 400 }));

    // The browser claims PASS; the server decides from the reading (URS-08).
    await saveResponse({ inspectionId: "insp1", checklistItemId: "item1", numericValue: 150, passFail: "PASS" });

    expect(m.db.inspectionResponse.upsert.mock.calls[0][0].create.passFail).toBe("FAIL");
    expect(m.db.finding.create).toHaveBeenCalledTimes(1);
  });

  const awaitingSupervisor = () => ({
    ...openInspection({ status: "AWAITING_SUPERVISOR" }),
    checklistVersion: { checklist: { name: "Daily", workflow: workflow() }, items: [] },
    responses: [{ respondedById: "op1" }],
    area: { name: "Line 1" },
  });

  it("will not approve while a corrective action is unsigned, so the line stays unreleased", async () => {
    signIn("SUPERVISOR", "sup1");
    m.db.inspection.findUniqueOrThrow.mockResolvedValue(awaitingSupervisor());
    m.db.finding.findMany.mockResolvedValue([{ correctiveAction: { status: "OPEN", verifiedById: null } }]);

    const result = await verifyInspection({ inspectionId: "insp1", action: "APPROVE", password: "whatever" });

    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("not signed off") });
    expect(m.db.verificationRecord.create).not.toHaveBeenCalled();
    expect(m.db.inspection.update).not.toHaveBeenCalled();
  });
});

describe("URS-09 electronic signature", () => {
  const hash = bcrypt.hashSync("Correct-horse-9", 4);
  const awaiting = (status: string) => ({
    ...openInspection({ status }),
    checklistVersion: { checklist: { name: "Daily", workflow: workflow() }, items: [] },
    responses: [{ respondedById: "op1" }],
    area: { name: "Line 1" },
  });

  beforeEach(() => {
    m.db.finding.findMany.mockResolvedValue([]);
    m.db.user.findUniqueOrThrow.mockResolvedValue({ passwordHash: hash });
  });

  it("refuses to sign without a password, and logs a wrong password as a failed signature", async () => {
    signIn("SUPERVISOR", "sup1");
    m.db.inspection.findUniqueOrThrow.mockResolvedValue(awaiting("AWAITING_SUPERVISOR"));

    expect(await verifyInspection({ inspectionId: "insp1", action: "APPROVE" })).toMatchObject({ ok: false, error: expect.stringContaining("Re-enter your password") });

    const wrong = await verifyInspection({ inspectionId: "insp1", action: "APPROVE", password: "not-my-password" });
    expect(wrong).toMatchObject({ ok: false, error: expect.stringContaining("Password incorrect") });
    expect(m.db.verificationRecord.create).not.toHaveBeenCalled();
    expect(m.db.auditLog.create.mock.calls.map((c) => c[0].data.action)).toContain("SIGNATURE_FAILED");
  });

  it("stores signer name, role, meaning and time basis when the password is right", async () => {
    signIn("SUPERVISOR", "sup1", { name: "Sam Supervisor" });
    m.db.inspection.findUniqueOrThrow.mockResolvedValue(awaiting("AWAITING_SUPERVISOR"));

    expect(await verifyInspection({ inspectionId: "insp1", action: "APPROVE", password: "Correct-horse-9" })).toEqual({ ok: true });

    expect(m.db.verificationRecord.create.mock.calls[0][0].data).toMatchObject({
      actorId: "sup1",
      signerName: "Sam Supervisor",
      signerRole: "SUPERVISOR",
      meaning: "Verified",
      passwordReverified: true,
      appVersion: expect.any(String),
    });
    // The signing time is the database's createdAt default: the app never sends one.
    expect(m.db.verificationRecord.create.mock.calls[0][0].data).not.toHaveProperty("createdAt");
  });

  it("records the final QA signature as Approved", async () => {
    signIn("QA", "qa1", { name: "Quinn QA" });
    m.db.inspection.findUniqueOrThrow.mockResolvedValue(awaiting("AWAITING_QA"));

    expect(await verifyInspection({ inspectionId: "insp1", action: "APPROVE", password: "Correct-horse-9" })).toEqual({ ok: true });
    expect(m.db.verificationRecord.create.mock.calls[0][0].data).toMatchObject({ signerRole: "QA", meaning: "Approved" });
  });
});

describe("URS-02 nobody verifies their own work, and roles are enforced on the server", () => {
  const awaiting = (responses: Array<{ respondedById: string }>) => ({
    ...openInspection({ status: "AWAITING_SUPERVISOR" }),
    checklistVersion: { checklist: { name: "Daily", workflow: workflow() }, items: [] },
    responses,
    area: { name: "Line 1" },
  });

  it("blocks the operator from verifying their own record", async () => {
    signIn("SUPERVISOR", "op1"); // a supervisor who is also the operator of record
    m.db.inspection.findUniqueOrThrow.mockResolvedValue(awaiting([{ respondedById: "op1" }]));
    expect(await verifyInspection({ inspectionId: "insp1", action: "APPROVE", password: "x" })).toMatchObject({ ok: false, error: expect.stringContaining("performed yourself") });
  });

  it("blocks a supervisor who entered any answer on the record", async () => {
    signIn("SUPERVISOR", "sup1");
    m.db.inspection.findUniqueOrThrow.mockResolvedValue(awaiting([{ respondedById: "op1" }, { respondedById: "sup1" }]));
    expect(await verifyInspection({ inspectionId: "insp1", action: "APPROVE", password: "x" })).toMatchObject({ ok: false, error: expect.stringContaining("entered answers") });
  });

  it("blocks an Operator from verifying at all", async () => {
    signIn("OPERATOR", "op2");
    m.db.inspection.findUniqueOrThrow.mockResolvedValue(awaiting([{ respondedById: "op1" }]));
    expect(await verifyInspection({ inspectionId: "insp1", action: "APPROVE", password: "x" })).toMatchObject({ ok: false, error: expect.stringContaining("Only a Supervisor") });
  });

  it("blocks a Supervisor or Viewer from entering record answers", async () => {
    for (const role of ["SUPERVISOR", "VIEWER", "ADMIN"] as Role[]) {
      signIn(role, "x1");
      await expect(saveResponse({ inspectionId: "insp1", checklistItemId: "item1", passFail: "PASS" })).resolves.toEqual({ ok: false, error: expect.stringMatching(/Forbidden/) });
    }
    expect(m.db.inspectionResponse.upsert).not.toHaveBeenCalled();
  });

  it("blocks a corrective-action sign-off by the operator of the record", async () => {
    signIn("SUPERVISOR", "op1");
    m.db.correctiveAction.findUniqueOrThrow.mockResolvedValue({
      id: "ca1",
      finding: { inspection: { operatorId: "op1", responses: [{ respondedById: "op1" }] } },
    });
    expect(await closeCorrectiveAction("ca1", "x")).toMatchObject({ ok: false, error: expect.stringContaining("performed yourself") });
  });

  it("rejects a deactivated account even while its session token is still valid (URS-03)", async () => {
    signIn("OPERATOR", "op1", { active: false });
    await expect(saveResponse({ inspectionId: "insp1", checklistItemId: "item1", passFail: "PASS" })).resolves.toEqual({ ok: false, error: expect.stringMatching(/deactivated/) });
  });
});

describe("URS-11 / URS-12 edits after submission keep the original and are fully audited", () => {
  it("refuses any edit to a submitted or verified record", async () => {
    signIn("OPERATOR", "op1");
    for (const status of ["AWAITING_SUPERVISOR", "AWAITING_QA", "CLOSED", "REJECTED"]) {
      m.db.inspection.findUniqueOrThrow.mockResolvedValue(openInspection({ status, submittedAt: FIXED_NOW }));
      await expect(saveResponse({ inspectionId: "insp1", checklistItemId: "item1", passFail: "FAIL" })).resolves.toEqual({ ok: false, error: expect.stringMatching(/not open for editing/) });
    }
    expect(m.db.inspectionResponse.upsert).not.toHaveBeenCalled();
  });

  it("will not reopen a returned record without a reason, or a record that wasn't returned", async () => {
    signIn("OPERATOR", "op1");
    m.db.inspection.findUniqueOrThrow.mockResolvedValue(openInspection({ status: "RETURNED" }));
    expect(await resubmitReturnedInspection("insp1", "")).toMatchObject({ ok: false });
    expect(await resubmitReturnedInspection("insp1", "ok")).toMatchObject({ ok: false });

    m.db.inspection.findUniqueOrThrow.mockResolvedValue(openInspection({ status: "CLOSED" }));
    expect(await resubmitReturnedInspection("insp1", "Trying to reopen a closed record")).toMatchObject({ ok: false, error: expect.stringContaining("returned") });
    expect(m.db.inspection.update).not.toHaveBeenCalled();
  });

  it("reopens with a reason and writes it to the audit trail", async () => {
    signIn("OPERATOR", "op1");
    m.db.inspection.findUniqueOrThrow.mockResolvedValue(openInspection({ status: "RETURNED", submittedAt: FIXED_NOW }));

    expect(await resubmitReturnedInspection("insp1", "Wrong chemical dilution recorded")).toEqual({ ok: true });

    expect(m.db.inspection.update.mock.calls[0][0].data).toMatchObject({ status: "IN_PROGRESS", reopenReason: "Wrong chemical dilution recorded" });
    expect(m.db.auditLog.create.mock.calls[0][0].data).toMatchObject({
      action: "EDITED",
      userId: "op1",
      fieldName: "status",
      oldValue: { value: "RETURNED" },
      newValue: { value: "IN_PROGRESS" },
      reason: "Wrong chemical dilution recorded",
    });
  });

  it("records who changed which field, from what, to what, and why -- and never deletes the finding", async () => {
    signIn("OPERATOR", "op1");
    m.db.inspection.findUniqueOrThrow.mockResolvedValue(openInspection({ submittedAt: FIXED_NOW, reopenReason: "Wrong chemical dilution recorded" }));
    m.db.inspectionResponse.findUnique.mockResolvedValue({ passFail: "FAIL", numericValue: null, textValue: null, choiceValue: null, comment: null });

    // Correcting FAIL back to PASS after the record was submitted:
    await saveResponse({ inspectionId: "insp1", checklistItemId: "item1", passFail: "PASS", comment: "Re-measured, within limits" });

    const entries = m.db.auditLog.create.mock.calls.map((c) => c[0].data).filter((d) => d.action === "EDITED");
    expect(entries).toHaveLength(2);
    expect(entries).toContainEqual(
      expect.objectContaining({
        userId: "op1",
        entityType: "InspectionResponse",
        entityId: "resp1",
        fieldName: "passFail",
        oldValue: { item: "Floor clean", value: "FAIL" },
        newValue: { item: "Floor clean", value: "PASS" },
        reason: "Wrong chemical dilution recorded",
        appVersion: expect.any(String),
      })
    );
    expect(entries.map((e) => e.fieldName).sort()).toEqual(["comment", "passFail"]);
    expect(m.db.finding.delete).not.toHaveBeenCalled();
    // The "when" is the database's createdAt default -- the app never supplies it.
    for (const e of entries) expect(e).not.toHaveProperty("createdAt");
  });
});

describe("startAdHocInspection (start any checklist without a schedule)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signIn("OPERATOR", "op1");
    m.db.checklist.findUnique.mockResolvedValue({ id: "ck1", active: true, category: "POST_OPERATION_CLEANING", versions: [{ id: "ver1" }] });
    m.db.area.findUnique.mockResolvedValue({ id: "area1", sectionId: "sec1", section: { facilityId: "fac1" } });
    m.db.facility.findFirst.mockResolvedValue({ id: "fac1" });
    m.db.inspection.findFirst.mockResolvedValue(null);
    m.db.inspection.create.mockResolvedValue({ id: "new1" });
  });

  it("creates a draft for the chosen checklist and area, with no schedule", async () => {
    const r = await startAdHocInspection({ checklistId: "ck1", areaId: "area1" });
    expect(r).toEqual({ ok: true, inspectionId: "new1" });
    expect(m.db.inspection.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ checklistVersionId: "ver1", facilityId: "fac1", sectionId: "sec1", areaId: "area1", frequency: "AD_HOC", status: "NOT_STARTED", operatorId: "op1" }),
    });
    expect(m.db.inspection.create.mock.calls[0][0].data.scheduleId).toBeUndefined();
  });

  it("supports facility-level checklists (generator, facility open/close) with no area", async () => {
    m.db.checklist.findUnique.mockResolvedValue({ id: "ck1", active: true, category: "FACILITY_GENERATOR", versions: [{ id: "ver1" }] });
    const r = await startAdHocInspection({ checklistId: "ck1", areaId: null });
    expect(r).toEqual({ ok: true, inspectionId: "new1" });
    expect(m.db.inspection.create).toHaveBeenCalledWith({ data: expect.objectContaining({ facilityId: "fac1", sectionId: null, areaId: null }) });
  });

  it("reopens the person's unfinished record instead of creating a duplicate", async () => {
    m.db.inspection.findFirst.mockResolvedValue({ id: "open1" });
    const r = await startAdHocInspection({ checklistId: "ck1", areaId: "area1" });
    expect(r).toEqual({ ok: true, inspectionId: "open1" });
    expect(m.db.inspection.create).not.toHaveBeenCalled();
  });

  it("refuses a role that cannot create inspections, with a readable message", async () => {
    signIn("VIEWER", "v1");
    const r = await startAdHocInspection({ checklistId: "ck1", areaId: "area1" });
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/cannot perform/i) });
    expect(m.db.inspection.create).not.toHaveBeenCalled();
  });

  it("requires an area for area-based checklists", async () => {
    const r = await startAdHocInspection({ checklistId: "ck1", areaId: null });
    expect(r).toEqual({ ok: false, error: "Select the area or line this checklist is for." });
    expect(m.db.inspection.create).not.toHaveBeenCalled();
  });

  it("refuses an inactive checklist", async () => {
    m.db.checklist.findUnique.mockResolvedValue({ id: "ck1", active: false, category: "FACILITY_GENERATOR", versions: [{ id: "ver1" }] });
    const r = await startAdHocInspection({ checklistId: "ck1", areaId: null });
    expect(r).toEqual({ ok: false, error: "That checklist is not available." });
  });
});

describe("markNoProduction (close a scheduled task when nothing was produced)", () => {
  const schedule = {
    id: "sch1",
    facilityId: "fac1",
    sectionId: "sec1",
    areaId: "area1",
    equipmentId: null,
    frequency: "DAILY",
    priority: "NORMAL",
    checklist: { versions: [{ id: "ver1" }] },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    signIn("OPERATOR", "op1");
    m.db.checklistSchedule.findUniqueOrThrow.mockResolvedValue(schedule);
    m.db.inspection.findFirst.mockResolvedValue(null);
    m.db.inspection.create.mockResolvedValue({ id: "new1" });
    m.db.inspectionResponse.findMany.mockResolvedValue([]);
  });

  it("creates a closed NO_PRODUCTION record with the reason, who and an audit entry", async () => {
    const r = await markNoProduction({ scheduleId: "sch1", reason: "  Machine under maintenance " });
    expect(r).toEqual({ ok: true });
    expect(m.db.inspection.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ scheduleId: "sch1", status: "NO_PRODUCTION", noProductionReason: "Machine under maintenance", operatorId: "op1", areaId: "area1" }),
    });
    expect(m.db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "CLOSED", reason: "No production: Machine under maintenance", userId: "op1" }) })
    );
  });

  it("defaults the reason to 'No production'", async () => {
    await markNoProduction({ scheduleId: "sch1" });
    expect(m.db.inspection.create.mock.calls[0][0].data.noProductionReason).toBe("No production");
  });

  it("closes an existing untouched draft instead of creating a second record", async () => {
    m.db.inspection.findFirst.mockResolvedValue({ id: "draft1", status: "NOT_STARTED", operatorId: null, startedAt: null });
    const r = await markNoProduction({ scheduleId: "sch1" });
    expect(r).toEqual({ ok: true });
    expect(m.db.inspection.create).not.toHaveBeenCalled();
    expect(m.db.inspection.update).toHaveBeenCalledWith({ where: { id: "draft1" }, data: expect.objectContaining({ status: "NO_PRODUCTION", operatorId: "op1" }) });
  });

  it("refuses when the checklist already has answers", async () => {
    m.db.inspection.findFirst.mockResolvedValue({ id: "draft1", status: "IN_PROGRESS", operatorId: "op1", startedAt: FIXED_NOW });
    m.db.inspectionResponse.findMany.mockResolvedValue([
      { passFail: "PASS", numericValue: null, textValue: null, choiceValue: null },
      { passFail: null, numericValue: 5, textValue: null, choiceValue: null },
      { passFail: null, numericValue: null, textValue: null, choiceValue: null },
    ]);
    const r = await markNoProduction({ scheduleId: "sch1" });
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/has 2 answers/) });
    expect(m.db.inspection.update).not.toHaveBeenCalled();
  });

  it("ignores answers that were cleared with Undo (empty rows are not answers)", async () => {
    m.db.inspection.findFirst.mockResolvedValue({ id: "draft1", status: "IN_PROGRESS", operatorId: "op1", startedAt: FIXED_NOW });
    m.db.inspectionResponse.findMany.mockResolvedValue([
      { passFail: null, numericValue: null, textValue: null, choiceValue: null },
      { passFail: null, numericValue: null, textValue: "  ", choiceValue: "" },
    ]);
    const r = await markNoProduction({ scheduleId: "sch1" });
    expect(r).toEqual({ ok: true });
    expect(m.db.inspection.update).toHaveBeenCalledWith({ where: { id: "draft1" }, data: expect.objectContaining({ status: "NO_PRODUCTION" }) });
  });

  it("refuses when the checklist was already submitted", async () => {
    m.db.inspection.findFirst.mockResolvedValue({ id: "done1", status: "AWAITING_SUPERVISOR", operatorId: "op1", startedAt: FIXED_NOW });
    const r = await markNoProduction({ scheduleId: "sch1" });
    expect(r).toEqual({ ok: false, error: "This checklist has already been completed." });
  });

  it("does nothing if it is already marked no production", async () => {
    m.db.inspection.findFirst.mockResolvedValue({ id: "np1", status: "NO_PRODUCTION", operatorId: "op1", startedAt: FIXED_NOW });
    const r = await markNoProduction({ scheduleId: "sch1" });
    expect(r).toEqual({ ok: true });
    expect(m.db.inspection.update).not.toHaveBeenCalled();
    expect(m.db.auditLog.create).not.toHaveBeenCalled();
  });

  it("refuses a role that cannot create inspections", async () => {
    signIn("VIEWER", "v1");
    const r = await markNoProduction({ scheduleId: "sch1" });
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/cannot perform/i) });
    expect(m.db.inspection.create).not.toHaveBeenCalled();
  });
});

describe("clearResponse / deletePhoto (undo before submit)", () => {
  const draft = () => openInspection({ submittedAt: null, status: "IN_PROGRESS", operatorId: "op1" });
  const answered = (over: Record<string, unknown> = {}) => ({ id: "resp1", passFail: "PASS", numericValue: null, textValue: null, choiceValue: null, finding: null, ...over });

  beforeEach(() => {
    vi.clearAllMocks();
    signIn("OPERATOR", "op1");
    m.db.inspection.findUniqueOrThrow.mockResolvedValue(draft());
    m.db.checklistItem.findUniqueOrThrow.mockResolvedValue(checklistItem());
    m.db.inspectionResponse.findUnique.mockResolvedValue(answered());
  });

  it("empties the answer (row kept) and audits the old value", async () => {
    const r = await clearResponse({ inspectionId: "insp1", checklistItemId: "item1" });
    expect(r).toEqual({ ok: true });
    expect(m.db.inspectionResponse.update).toHaveBeenCalledWith({
      where: { id: "resp1" },
      data: { passFail: null, numericValue: null, textValue: null, choiceValue: null, comment: null },
    });
    expect(m.db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "EDITED", fieldName: "answer", reason: "Answer cleared (undo)", userId: "op1" }) })
    );
  });

  it("removes a bare finding left behind by an undone FAIL", async () => {
    m.db.inspectionResponse.findUnique.mockResolvedValue(answered({ passFail: "FAIL", finding: { id: "f1", correctiveAction: null, photoEvidence: [] } }));
    await clearResponse({ inspectionId: "insp1", checklistItemId: "item1" });
    expect(m.db.finding.delete).toHaveBeenCalledWith({ where: { id: "f1" } });
  });

  it("refuses to undo a failure that already has a corrective action", async () => {
    m.db.inspectionResponse.findUnique.mockResolvedValue(answered({ passFail: "FAIL", finding: { id: "f1", correctiveAction: { id: "ca1" }, photoEvidence: [] } }));
    const r = await clearResponse({ inspectionId: "insp1", checklistItemId: "item1" });
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/corrective action/) });
    expect(m.db.inspectionResponse.update).not.toHaveBeenCalled();
  });

  it("refuses to undo once the record has been submitted", async () => {
    m.db.inspection.findUniqueOrThrow.mockResolvedValue(openInspection({ status: "RETURNED", submittedAt: FIXED_NOW }));
    const r = await clearResponse({ inspectionId: "insp1", checklistItemId: "item1" });
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/submitted/) });
    expect(m.db.inspectionResponse.update).not.toHaveBeenCalled();
  });

  it("an operator with no assigned area cannot work on someone else's record", async () => {
    signIn("OPERATOR", "op2");
    const r = await clearResponse({ inspectionId: "insp1", checklistItemId: "item1" });
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/another section or operator/) });
  });

  it("deletes a photo from a draft and audits who removed it", async () => {
    m.db.photoEvidence.findUnique.mockResolvedValue({ id: "ph1", filename: "a.jpg", storagePath: "https://blob/a.jpg", createdAt: FIXED_NOW, inspection: draft() });
    const r = await deletePhoto({ photoId: "ph1" });
    expect(r).toEqual({ ok: true });
    expect(m.db.photoEvidence.delete).toHaveBeenCalledWith({ where: { id: "ph1" } });
    expect(m.db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "DELETED", entityType: "PhotoEvidence", userId: "op1" }) })
    );
  });

  it("will not delete a photo from a submitted record", async () => {
    m.db.photoEvidence.findUnique.mockResolvedValue({
      id: "ph1",
      filename: "a.jpg",
      storagePath: "https://blob/a.jpg",
      createdAt: FIXED_NOW,
      inspection: openInspection({ status: "RETURNED", submittedAt: FIXED_NOW }),
    });
    const r = await deletePhoto({ photoId: "ph1" });
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/submitted/) });
    expect(m.db.photoEvidence.delete).not.toHaveBeenCalled();
  });
});

describe("operators in the same section can work on each other's records", () => {
  const record = (over: Record<string, unknown> = {}) => ({ id: "insp1", status: "IN_PROGRESS", operatorId: "dhanu", areaId: "bottling", sectionId: "prod", facilityId: "fac1", equipmentId: null, submittedAt: null, reopenReason: null, ...over });
  const bottlingArea = { id: "bottling", sectionId: "prod", facilityId: "fac1" };
  const capsuleArea = { id: "capsule", sectionId: "prod", facilityId: "fac1" };

  beforeEach(() => {
    vi.clearAllMocks();
    m.db.inspectionResponse.upsert.mockResolvedValue({ id: "resp1" });
    m.db.inspectionResponse.findUnique.mockResolvedValue(null);
    m.db.finding.findUnique.mockResolvedValue(null);
    m.db.checklistItem.findUniqueOrThrow.mockResolvedValue(checklistItem());
    m.db.inspection.findUniqueOrThrow.mockResolvedValue(record());
  });

  it("an operator assigned to the record's area can add answers to a record another operator started", async () => {
    signIn("OPERATOR", "bottling-op", { areas: [bottlingArea] });
    await saveResponse({ inspectionId: "insp1", checklistItemId: "item1", passFail: "PASS" });
    expect(m.db.inspectionResponse.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ respondedById: "bottling-op" }) }));
  });

  it("an operator assigned to a different area cannot", async () => {
    signIn("OPERATOR", "capsule-op", { areas: [capsuleArea] });
    await expect(saveResponse({ inspectionId: "insp1", checklistItemId: "item1", passFail: "PASS" })).resolves.toEqual({ ok: false, error: expect.stringMatching(/another section or operator/) });
    expect(m.db.inspectionResponse.upsert).not.toHaveBeenCalled();
  });

  it("the original operator stays the operator of record", async () => {
    signIn("OPERATOR", "bottling-op", { areas: [bottlingArea] });
    await saveResponse({ inspectionId: "insp1", checklistItemId: "item1", passFail: "PASS" });
    expect(m.db.inspection.update).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ operatorId: "bottling-op" }) }));
  });

  it("an in-area operator who entered an answer still cannot verify the record", async () => {
    // Verification conflict rules are unchanged: see the URS-02 tests above.
    signIn("OPERATOR", "bottling-op", { areas: [bottlingArea] });
    await expect(verifyInspection({ inspectionId: "insp1", action: "APPROVE", password: "x" })).resolves.toEqual({ ok: false, error: expect.any(String) });
  });
});

describe("facility-level checklists (generator, facility open/close) are open to every employee", () => {
  const record = (over: Record<string, unknown> = {}) => ({ id: "insp1", status: "IN_PROGRESS", operatorId: "bottling-op", areaId: null, sectionId: null, facilityId: "fac1", equipmentId: null, submittedAt: null, reopenReason: null, ...over });

  beforeEach(() => {
    vi.clearAllMocks();
    m.db.inspectionResponse.upsert.mockResolvedValue({ id: "resp1" });
    m.db.inspectionResponse.findUnique.mockResolvedValue(null);
    m.db.finding.findUnique.mockResolvedValue(null);
    m.db.checklistItem.findUniqueOrThrow.mockResolvedValue(checklistItem());
    m.db.inspection.findUniqueOrThrow.mockResolvedValue(record());
  });

  it("any employee can answer a facility-level record another employee started", async () => {
    m.db.inspection.findUnique.mockResolvedValue({ checklistVersion: { checklist: { category: "FACILITY_GENERATOR" } } });
    signIn("SUPER_ADMIN", "dhanu");
    await saveResponse({ inspectionId: "insp1", checklistItemId: "item1", passFail: "PASS" });
    expect(m.db.inspectionResponse.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ respondedById: "dhanu" }) }));
  });

  it("an operator assigned to a different area can too", async () => {
    m.db.inspection.findUnique.mockResolvedValue({ checklistVersion: { checklist: { category: "FACILITY_GENERATOR" } } });
    signIn("OPERATOR", "capsule-op", { areas: [{ id: "capsule", sectionId: "prod", facilityId: "fac1" }] });
    await saveResponse({ inspectionId: "insp1", checklistItemId: "item1", passFail: "PASS" });
    expect(m.db.inspectionResponse.upsert).toHaveBeenCalled();
  });

  it("an ordinary area checklist stays limited", async () => {
    m.db.inspection.findUnique.mockResolvedValue({ checklistVersion: { checklist: { category: "POST_OPERATION_CLEANING" } } });
    m.db.inspection.findUniqueOrThrow.mockResolvedValue(record({ areaId: "bottling", sectionId: "prod" }));
    signIn("SUPER_ADMIN", "dhanu");
    await expect(saveResponse({ inspectionId: "insp1", checklistItemId: "item1", passFail: "PASS" })).resolves.toEqual({ ok: false, error: expect.stringMatching(/another section or operator/) });
  });

  it("still enforces the role: a viewer cannot fill it in", async () => {
    m.db.inspection.findUnique.mockResolvedValue({ checklistVersion: { checklist: { category: "FACILITY_GENERATOR" } } });
    signIn("VIEWER", "v1");
    await expect(saveResponse({ inspectionId: "insp1", checklistItemId: "item1", passFail: "PASS" })).resolves.toEqual({ ok: false, error: expect.stringMatching(/Forbidden/) });
  });
});
