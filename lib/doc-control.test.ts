import { describe, expect, it } from "vitest";
import { docControlRows, parseDocControl } from "@/lib/doc-control";

const full = {
  organisation: "EAGLE LABS AUSTRALIA",
  formTitle: "C-FORM-002C1 — Pre-Operational Release Check — Gummy Line",
  subtitle: "Zone: GREEN — Gummy Line",
  docNumber: "C-FORM-002C1",
  docTitle: "Pre-Operational Release Check — Gummy Line",
  docType: "Controlled Form / Cleaning Checklist",
  series: "C — Plant, Premises & Grounds",
  parentSchedule: "C-FORM-002 — Facility Cleaning Schedule",
  implementsRef: "C.101",
  cleaningAgents: "CHM-011",
  verification: "ATP swab per C.103",
  revision: "V1 — Draft",
  intro: "Completed at the start of each batch.",
  signOffRoles: ["Cleaned by (Production Operator)", "Checked by (PROD-SUP / PROD-TL)"],
  note: "Note",
  footerNotice: "Controlled document",
};

describe("controlled-form header", () => {
  it("reads a stored header", () => {
    expect(parseDocControl(full)?.docNumber).toBe("C-FORM-002C1");
  });

  it("returns null when a version has no header", () => {
    expect(parseDocControl(null)).toBeNull();
    expect(parseDocControl({})).toBeNull();
    expect(parseDocControl("text")).toBeNull();
    expect(parseDocControl([])).toBeNull();
  });

  it("tolerates missing optional fields", () => {
    const d = parseDocControl({ docNumber: "X-1", formTitle: "X-1 — Form" });
    expect(d).toMatchObject({ docNumber: "X-1", revision: "", signOffRoles: [] });
  });

  it("lays out the document-control table in the order of the controlled form", () => {
    const rows = docControlRows(parseDocControl(full)!);
    expect(rows.map((r) => [r[0][0], r[1][0]])).toEqual([
      ["Doc Number", "Doc Title"],
      ["Doc Type", "Series"],
      ["Parent Schedule", "Implements"],
      ["Cleaning Agents", "Verification"],
      ["Revision", ""],
    ]);
  });
});
