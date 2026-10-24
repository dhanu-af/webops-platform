import { describe, expect, it } from "vitest";
import { canWorkOnRecord, type UserScope } from "@/lib/scope";

const scoped = (areaIds: string[], sectionIds: string[] = ["prod"], facilityId = "fac1"): UserScope => ({ scoped: true, facilityId, sectionIds, areaIds });
const unscoped: UserScope = { scoped: false };
const record = (over: Partial<{ operatorId: string | null; areaId: string | null; sectionId: string | null; facilityId: string }> = {}) => ({
  operatorId: "dhanu",
  areaId: "bottling",
  sectionId: "prod",
  facilityId: "fac1",
  ...over,
});

describe("canWorkOnRecord", () => {
  it("lets an operator assigned to the area work on a record someone else started", () => {
    expect(canWorkOnRecord(scoped(["bottling"]), "bottling-op", record())).toBe(true);
  });

  it("refuses an operator assigned to a different area", () => {
    expect(canWorkOnRecord(scoped(["capsule"]), "capsule-op", record())).toBe(false);
  });

  it("lets a scoped operator work on a section-wide or facility-wide record in their scope", () => {
    expect(canWorkOnRecord(scoped(["bottling"]), "u", record({ areaId: null }))).toBe(true);
    expect(canWorkOnRecord(scoped(["bottling"]), "u", record({ areaId: null, sectionId: null }))).toBe(true);
    expect(canWorkOnRecord(scoped(["bottling"], ["prod"], "fac1"), "u", record({ areaId: null, sectionId: null, facilityId: "other" }))).toBe(false);
  });

  it("without assigned areas, only unclaimed or own records", () => {
    expect(canWorkOnRecord(unscoped, "u", record({ operatorId: null }))).toBe(true);
    expect(canWorkOnRecord(unscoped, "dhanu", record())).toBe(true);
    expect(canWorkOnRecord(unscoped, "someone-else", record())).toBe(false);
  });
});
