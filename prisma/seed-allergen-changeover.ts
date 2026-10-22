import "dotenv/config";
import { PrismaClient, type ItemType } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Adds the "Allergen Changeover Clean & Verification" checklist (URS-04c)
// WITHOUT touching any other data, unlike prisma/seed.ts which wipes the
// database. Safe against a live database: does nothing if it already exists.
//   npm run seed:allergen-changeover
//
// The ranges and limits below are PLACEHOLDERS drawn from typical practice.
// QA must replace them with the validated figures for the chemicals, swab kits
// and ATP meter actually in use (Admin -> Checklist Builder publishes a new
// version) before this checklist is used for real records.
const NAME = "Allergen Changeover Clean & Verification";

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
  required?: boolean;
};

const ITEMS: Item[] = [
  // --- Preparation ------------------------------------------------------
  { group: "PREPARATION", prompt: "Allergens declared for the PREVIOUS product have been identified and recorded", type: "YES_NO" },
  { group: "PREPARATION", prompt: "Allergens declared for the NEXT product have been identified and recorded", type: "YES_NO" },
  { group: "PREPARATION", prompt: "Previous product, packaging and labels fully removed from the line", type: "YES_NO", critical: true, photoOnFail: true },
  { group: "PREPARATION", prompt: "Dedicated allergen cleaning tools used (colour-coded, not shared with other areas)", type: "YES_NO" },

  // --- Dry clean --------------------------------------------------------
  { group: "DRY CLEAN", prompt: "Gross product residue removed from hoppers, conveyors, chutes and contact surfaces", type: "ACKNOWLEDGEMENT" },
  { group: "DRY CLEAN", prompt: "Equipment dismantled to the level required by the cleaning SOP", type: "ACKNOWLEDGEMENT" },

  // --- Wet clean --------------------------------------------------------
  { group: "WET CLEAN", prompt: "Detergent concentration (ppm)", type: "NUMERIC", min: 500, max: 2000, critical: true, photoOnFail: true, help: "Placeholder range -- QA to set the acceptable range from the chemical's label / validated SOP." },
  { group: "WET CLEAN", prompt: "Wash water temperature (°C)", type: "NUMERIC", min: 40, max: 60, help: "Placeholder range -- QA to confirm against the validated cleaning procedure." },
  { group: "WET CLEAN", prompt: "Detergent contact time met per SOP", type: "YES_NO" },
  { group: "WET CLEAN", prompt: "Sanitiser concentration (ppm)", type: "NUMERIC", min: 200, max: 400, critical: true, photoOnFail: true, help: "Placeholder range for a quaternary ammonium sanitiser -- QA to set per the chemical in use." },
  { group: "WET CLEAN", prompt: "Final rinse completed; no detergent or sanitiser residue visible", type: "YES_NO" },
  { group: "WET CLEAN", prompt: "Equipment dried and reassembled; hard-to-clean points (seams, screws, bearings, conveyor ends) cleaned", type: "ACKNOWLEDGEMENT" },

  // --- Verification -----------------------------------------------------
  { group: "VERIFICATION", prompt: "Visual inspection: no visible residue on any product-contact surface", type: "PASS_FAIL", critical: true, photoOnFail: true },
  { group: "VERIFICATION", prompt: "Allergen swab test for the previous product's allergen(s): result negative", type: "PASS_FAIL", critical: true, photoOnFail: true, help: "Record the kit, lot and swab location in the remarks field of this record." },
  { group: "VERIFICATION", prompt: "ATP swab reading (RLU)", type: "NUMERIC", min: 0, max: 150, photoOnFail: true, help: "Placeholder limit -- QA to set the pass limit for the ATP meter in use." },
  { group: "VERIFICATION", prompt: "Surrounding floor, walls and overhead areas free of previous-product residue", type: "PASS_FAIL" },

  // --- Labels & ingredients --------------------------------------------
  { group: "LABELS & INGREDIENTS", prompt: "Only labels and packaging for the NEXT product are on or near the line", type: "YES_NO", critical: true, photoOnFail: true },
  { group: "LABELS & INGREDIENTS", prompt: "Label ingredient and allergen declaration matches the NEXT product's specification", type: "PASS_FAIL", critical: true, photoOnFail: true },
  { group: "LABELS & INGREDIENTS", prompt: "Operators have changed gloves, aprons and sleeves before restart", type: "YES_NO" },

  // --- Release ----------------------------------------------------------
  { group: "RELEASE", prompt: "Notes (swab kit and lot, swab locations, anything unusual)", type: "TEXT", required: false },
];

async function main() {
  if (await db.checklist.findFirst({ where: { name: NAME } })) {
    console.log(`"${NAME}" already exists -- nothing to do.`);
    return;
  }
  const creator = await db.user.findFirst({ where: { role: "SUPER_ADMIN", active: true }, orderBy: { createdAt: "asc" } });
  if (!creator) throw new Error("No active SUPER_ADMIN user to attribute the new checklist version to.");

  // Three-step workflow with area release: QA approval is what releases the line.
  const workflow = await db.verificationWorkflow.findFirst({ where: { name: "Operator → Supervisor → QA" } });
  if (!workflow) console.warn('Workflow "Operator → Supervisor → QA" not found -- created with no workflow; assign one in Admin → Checklists.');

  const checklist = await db.checklist.create({
    data: {
      name: NAME,
      category: "ALLERGEN_CHANGEOVER",
      workflowId: workflow?.id,
      description: "Clean and verify the line between products with different allergen profiles. Failures need a corrective action; QA approval releases the line.",
    },
  });
  const version = await db.checklistVersion.create({ data: { checklistId: checklist.id, versionNumber: "1.0", createdById: creator.id } });
  await db.checklistItem.createMany({
    data: ITEMS.map((it, i) => ({
      checklistVersionId: version.id,
      groupLabel: it.group,
      sortOrder: i,
      prompt: it.prompt,
      helpText: it.help,
      type: it.type,
      required: it.required ?? true,
      minValue: it.type === "NUMERIC" ? it.min : undefined,
      maxValue: it.type === "NUMERIC" ? it.max : undefined,
      requiresPhotoOnFail: it.photoOnFail ?? false,
      criticalFailure: it.critical ?? false,
    })),
  });
  console.log(`Created "${NAME}" v1.0 with ${ITEMS.length} items. Add a schedule in Admin → Checklists so it appears under Allergen Changeover.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
