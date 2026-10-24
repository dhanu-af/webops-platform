import "dotenv/config";
import { PrismaClient, type ItemType, type Frequency, type ChecklistCategory } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Adds the two controlled gummy-line forms WITHOUT touching any other data,
// unlike prisma/seed.ts which wipes the database. Safe against a live database:
// a checklist (and its schedule) is skipped if one with that name already exists.
//   npm run seed:gummy-line-forms
//
//   C-FORM-002C1  Pre-Operational Release Check -- Gummy Line   (Pre-Start)
//   C-FORM-002C2  Post-Production Cleaning Check -- Gummy Line  (Post-Op Cleaning)
//
// Wording is taken from the controlled forms (revision V1 -- Draft). Each row of
// the paper "Area / Equipment" table is one Pass/Fail item: the area or
// equipment is the question and the cleaning requirement is the help text. The
// "Time" column is the server timestamp on each answer, "Comments" is the
// comment box, and "Cleaned by / Checked by" is the Operator -> Supervisor
// sign-off (the supervisor signs with their password).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

type Item = {
  group: string;
  prompt: string;
  type: ItemType;
  help?: string;
  min?: number;
  max?: number;
  critical?: boolean;
  photoOnFail?: boolean;
};

const A_PRE = "A. AREA / EQUIPMENT — PER-BATCH (PRE-OP)";
const B_GMP = "B. GMP INSPECTION";
const A_POST = "A. AREA / EQUIPMENT — PER-BATCH (POST-PROD)";

const pf = (group: string, prompt: string, help: string, extra: Partial<Item> = {}): Item => ({ group, prompt, type: "PASS_FAIL", help, ...extra });
const yn = (group: string, prompt: string, extra: Partial<Item> = {}): Item => ({ group, prompt, type: "YES_NO", ...extra });

const PRE_OP: Item[] = [
  pf(A_PRE, "Equipment Readiness — Kettles", "Kettles 1 & 2 clean and ready before product transfer; no residue, burn marks or gummy buildup"),
  pf(A_PRE, "Equipment Readiness — Tools, Benches, Trolley", "All tools used are cleaned and sanitised"),
  pf(A_PRE, "Foreign Matter", "No loose parts, tools, screws, brush bristles or foreign matter present on or around equipment", { critical: true, photoOnFail: true }),
  pf(A_PRE, "Mold Setup", "Correct mold installed and molds are visibly clean — no residue or gummy pieces from previous run"),
  pf(A_PRE, "Depositor", "Nozzles and manifold are visibly clean; no blockages; sanitised before start"),
  pf(A_PRE, "Hopper 1", "Hopper 1 visibly clean; no residue from previous run inside or underneath"),
  pf(A_PRE, "Hopper 2", "Hopper 2 visibly clean; no residue from previous run inside or underneath"),
  pf(A_PRE, "Conveyor / Demolding", "Conveyor surface, demolding roller, bars and supporting structures clean and operational"),
  pf(A_PRE, "Oil Control", "Oil spray level / setting suitable for product; no excessive MCT oil pooling around system"),
  pf(A_PRE, "Transfer Pipes", "Transfer pipes flushed and clear; no residue from previous run"),
  pf(A_PRE, "Discharge Waste Bin", "Clean and empty; lined with clean bag and labelled for current run"),
  pf(A_PRE, "Personnel", "Operators in correct PPE per B.004; handwash and gowning verified"),
  pf(A_PRE, "Chemicals & Tools", "Approved chemicals only on site (per C-REG-001 Rev 07); colour-coded cleaning tools (GREEN) for gummy line"),
  pf(A_PRE, "Line Clearance", "Previous batch documentation closed; line clearance signed by PROD-SUP", { critical: true }),

  yn(B_GMP, "Room ready for production"),
  { group: B_GMP, prompt: "Gummy production — room temperature (°C)", type: "NUMERIC", min: 20, max: 25, help: "Form requirement: Temp 20–25 °C" },
  { group: B_GMP, prompt: "Gummy production — relative humidity (%)", type: "NUMERIC", min: 0, max: 65, help: "Form requirement: RH <65%" },
  yn(B_GMP, "Approved cleaning agents per C-REG-001 Rev 07"),
  yn(B_GMP, "Cleaning tool colour-coding verified (GREEN)"),
  yn(B_GMP, "Line clearance completed"),
  yn(B_GMP, "ATP swab per C.103 cadence completed (C-FORM-008)"),
  pf(B_GMP, "Scale verification PASS — EQ 303 (Ohaus SPX2202) + EQ 304 + EQ 305 (CAS HD-150) — Gummy Line", "Per D.103 § 7. Record operator initials in Comments."),
];

const POST_PROD: Item[] = [
  pf(A_POST, "Bench 1, 3, 4, 5, 7 & Gummy Line Trolley", "Clean — no residues on bench, surrounding area or underneath"),
  pf(A_POST, "Kettle 1", "No residue, burnt mark or gummy buildup; clean water flush completed; clean water remaining after rinse is clear and free of debris"),
  pf(A_POST, "Kettle 2", "No residue, burnt mark or gummy buildup; clean water flush completed; clean water remaining after rinse is clear and free of debris"),
  pf(A_POST, "Transfer Pipes", "Lines flushed with clean hot potable water until run-off is clear"),
  pf(A_POST, "Oil Spray Tank", "Tank exterior clean and free of oil residue / drips"),
  pf(A_POST, "Oil Spray Nozzles", "Nozzles clean and not blocked"),
  pf(A_POST, "MCT Oil Accumulation", "No excessive MCT oil accumulation on machine surfaces or surrounding floor"),
  pf(A_POST, "Discharge Waste Bin", "Clean and emptied; clean liner installed for next run"),
  pf(A_POST, "Hopper 1", "No residue from previous run inside; lower hopper area free from gummy buildup"),
  pf(A_POST, "Hopper 2", "No residue from previous run inside; lower hopper area free from gummy buildup"),
  pf(A_POST, "Depositor Nozzles", "Depositing nozzles brushed and visibly clean"),
  pf(A_POST, "Depositor Manifold", "Manifold flushed and cleaned; sanitised with CHM-021 (Pure IPA) where dry application, otherwise per SOP"),
  pf(A_POST, "Molds", "Molds are free from gummy pieces"),
  pf(A_POST, "Conveyor", "Conveyor surface free from excess oil and gummy residue; no residue along conveyor sides"),
  pf(A_POST, "Demolding Area", "No residue from previous run"),
  pf(A_POST, "Gummy Collecting Area", "No gummy residue around area"),
  pf(A_POST, "Around Machine", "No loose parts, tools, screws, bolts or brush bristles found around machine; floor cleaned and free of excess oil; gummy scrap and waste removed", { critical: true, photoOnFail: true }),
  pf(A_POST, "Control Panels", "Control panels (Kettles, PLC, depositor) wiped clean — damp wipe only, no chemical spray"),
  pf(A_POST, "Water Hose", "Hose stored back to designated location"),
  pf(A_POST, "Tables & Benches", "No dirty spoons, containers or residue left on tables / benches"),
  pf(A_POST, "Cleaning Tools & Sanitiser", "Mops removed from production floor; all cleaning tools and sanitiser stored in designated GREEN-zone cleaning storage"),
  pf(A_POST, "Scales (2 bulk + 1 bench)", "All scales turned OFF, cleaned and free from gummy / sugar residue"),

  yn(B_GMP, "Cleaning chemicals returned to designated storage"),
  yn(B_GMP, "Cleaning tools (GREEN-coded) returned to storage"),
  yn(B_GMP, "Waste bins emptied; clean liners installed"),
  yn(B_GMP, "Floor mopped and free from oil / sugar / gummy residue"),
  yn(B_GMP, "Line clearance documentation completed"),
];

const REFERENCE =
  "Zone: GREEN — Gummy Line. Per C.101 § 9.1 (Per-Batch). Series C — Plant, Premises & Grounds; parent schedule C-FORM-002 Facility Cleaning Schedule. " +
  "Cleaning agents per C-REG-001 Rev 07: CHM-011 detergent + CHM-021 Pure IPA sanitiser; CHM-022 Sledge for monthly kettle CIP. " +
  "Verification: ATP swab per C.103 — QA-MGR risk-based spot check. Controlled form revision V1 — Draft.";

const FORMS: Array<{ name: string; category: ChecklistCategory; frequency: Frequency; description: string; items: Item[] }> = [
  {
    name: "C-FORM-002C1 Pre-Operational Release Check — Gummy Line 1",
    category: "PRE_START",
    frequency: "BEFORE_PRODUCTION",
    description:
      "Completed at the start of each production batch / product changeover on the gummy line. The line is NOT released for production until signed off by both the Operator and PROD-SUP. " +
      REFERENCE,
    items: PRE_OP,
  },
  {
    name: "C-FORM-002C2 Post-Production Cleaning Check — Gummy Line 1",
    category: "POST_OPERATION_CLEANING",
    frequency: "AFTER_PRODUCTION",
    description: "Completed at the end of each production batch / end of shift on the gummy line. " + REFERENCE,
    items: POST_PROD,
  },
];

async function main() {
  const creator = await db.user.findFirst({ where: { role: "SUPER_ADMIN", active: true }, orderBy: { createdAt: "asc" } });
  if (!creator) throw new Error("No active SUPER_ADMIN user to attribute the new checklist versions to.");

  const area = await db.area.findFirst({ where: { code: "GUMMY" }, include: { section: true } });
  if (!area) console.warn('Area "Gummy Production" (code GUMMY) not found -- checklists created without a schedule; add one in Admin → Checklists.');

  // Cleaned by (Operator) -> Checked by (PROD-SUP / PROD-TL).
  const workflow = await db.verificationWorkflow.findFirst({ where: { name: "Operator → Supervisor" } });
  if (!workflow) console.warn('Workflow "Operator → Supervisor" not found -- created with no workflow; assign one in Admin → Checklists.');

  for (const def of FORMS) {
    if (await db.checklist.findFirst({ where: { name: def.name } })) {
      console.log(`"${def.name}" already exists -- skipped.`);
      continue;
    }
    const checklist = await db.checklist.create({
      data: { name: def.name, category: def.category, workflowId: workflow?.id, description: def.description },
    });
    const version = await db.checklistVersion.create({ data: { checklistId: checklist.id, versionNumber: "1.0", createdById: creator.id } });
    await db.checklistItem.createMany({
      data: def.items.map((it, i) => ({
        checklistVersionId: version.id,
        groupLabel: it.group,
        sortOrder: i,
        prompt: it.prompt,
        helpText: it.help,
        type: it.type,
        required: true,
        minValue: it.type === "NUMERIC" ? it.min : undefined,
        maxValue: it.type === "NUMERIC" ? it.max : undefined,
        requiresPhotoOnFail: it.photoOnFail ?? false,
        criticalFailure: it.critical ?? false,
      })),
    });
    if (area) {
      // Per-batch (before / after production) schedules have no fixed calendar
      // day, so they show every day; use "No production" on days the line is idle.
      await db.checklistSchedule.create({
        data: {
          checklistId: checklist.id,
          frequency: def.frequency,
          startDate: new Date(),
          facilityId: area.section.facilityId,
          sectionId: area.sectionId,
          areaId: area.id,
        },
      });
    }
    console.log(`Created "${def.name}" v1.0 with ${def.items.length} items${area ? ` for ${area.name}` : ""}.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
