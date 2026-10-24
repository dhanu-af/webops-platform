// Controlled-form header (document control block) for a checklist version.
// Stored on ChecklistVersion.docControl so every record keeps the exact form
// identity and revision it was filled in under (URS-13), and shown identically
// on the record screen, the paper form and the PDF.
export type DocControl = {
  organisation: string; // EAGLE LABS AUSTRALIA
  formTitle: string; // C-FORM-002C1 — Pre-Operational Release Check — Gummy Line
  subtitle: string; // Zone: GREEN — Gummy Line | Cadence: Per-Batch (Pre-Op) | Per C.101 § 9.1
  docNumber: string;
  docTitle: string;
  docType: string;
  series: string;
  parentSchedule: string;
  implementsRef: string;
  cleaningAgents: string;
  verification: string;
  revision: string; // V1 — Draft
  intro: string; // the paragraph under the Date line
  signOffRoles: string[]; // section C rows on the paper form
  note: string;
  footerNotice: string;
};

const KEYS: Array<keyof DocControl> = [
  "organisation",
  "formTitle",
  "subtitle",
  "docNumber",
  "docTitle",
  "docType",
  "series",
  "parentSchedule",
  "implementsRef",
  "cleaningAgents",
  "verification",
  "revision",
  "intro",
  "note",
  "footerNotice",
];

/** Reads the stored JSON; null when a version has no controlled-form header. */
export function parseDocControl(json: unknown): DocControl | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const o = json as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of KEYS) out[k] = typeof o[k] === "string" ? o[k] : "";
  out.signOffRoles = Array.isArray(o.signOffRoles) ? o.signOffRoles.filter((r): r is string => typeof r === "string") : [];
  if (!out.docNumber || !out.formTitle) return null;
  return out as DocControl;
}

/** The document-control table, two label/value pairs per row, as on the controlled form. */
export function docControlRows(d: DocControl): Array<[[string, string], [string, string]]> {
  return [
    [["Doc Number", d.docNumber], ["Doc Title", d.docTitle]],
    [["Doc Type", d.docType], ["Series", d.series]],
    [["Parent Schedule", d.parentSchedule], ["Implements", d.implementsRef]],
    [["Cleaning Agents", d.cleaningAgents], ["Verification", d.verification]],
    [["Revision", d.revision], ["", ""]],
  ];
}
