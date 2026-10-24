import "dotenv/config";
import { PrismaClient, type ItemType } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Adds the four "Facility & Generator" checklists WITHOUT touching any other
// data, unlike prisma/seed.ts which wipes the database. Safe against a live
// database: each checklist is skipped if one with that name already exists.
//   npm run seed:facility-generator
//
// The items and the ranges below are STARTING POINTS drawn from typical
// practice. Maintenance / QA must confirm them against the generator's manual
// and the site's opening and closing procedure (Admin -> Checklist Builder
// publishes a new version) before the checklists are used for real records.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

type Item = {
  group: string;
  prompt: string;
  type: ItemType;
  help?: string;
  min?: number;
  max?: number;
  choices?: string[];
  critical?: boolean;
  photoOnFail?: boolean;
  required?: boolean;
};

const CONFIRM = "Placeholder range -- Maintenance to confirm against the generator manual.";

const GENERATOR_ON: Item[] = [
  { group: "REASON", prompt: "Reason for starting the generator", type: "MULTIPLE_CHOICE", choices: ["Mains power failure", "Scheduled test run", "Planned maintenance / shutdown"] },
  { group: "PRE-START CHECKS", prompt: "Fuel level (%)", type: "NUMERIC", min: 25, max: 100, help: `${CONFIRM} Refuel before starting if below the minimum.` },
  { group: "PRE-START CHECKS", prompt: "Engine oil level is within the marked range", type: "PASS_FAIL" },
  { group: "PRE-START CHECKS", prompt: "Coolant level is within the marked range", type: "PASS_FAIL" },
  { group: "PRE-START CHECKS", prompt: "No fuel, oil or coolant leaks under or around the generator", type: "PASS_FAIL", critical: true, photoOnFail: true },
  { group: "PRE-START CHECKS", prompt: "Battery and starter OK; control panel shows no alarms or warnings", type: "PASS_FAIL" },
  { group: "PRE-START CHECKS", prompt: "Exhaust and ventilation openings are clear; area around the generator is free of stored items", type: "PASS_FAIL", critical: true },
  { group: "PRE-START CHECKS", prompt: "Emergency stop is released and a fire extinguisher is accessible", type: "YES_NO", critical: true },
  { group: "START-UP", prompt: "Generator started and running smoothly (no unusual noise, vibration or smoke)", type: "PASS_FAIL", critical: true, photoOnFail: true },
  { group: "START-UP", prompt: "Output voltage (V)", type: "NUMERIC", min: 216, max: 253, help: `${CONFIRM} Nominal 230 V, +10% / -6%.` },
  { group: "START-UP", prompt: "Output frequency (Hz)", type: "NUMERIC", min: 49, max: 51, help: CONFIRM },
  { group: "LOAD TRANSFER", prompt: "Load transferred from mains to generator (changeover switch / ATS)", type: "ACKNOWLEDGEMENT" },
  { group: "LOAD TRANSFER", prompt: "Critical services confirmed running (lighting, alarms, refrigeration / cold storage, network)", type: "YES_NO", critical: true },
  { group: "LOAD TRANSFER", prompt: "Supervisor and QA informed that the site is on generator power", type: "YES_NO" },
  { group: "NOTES", prompt: "Notes (time started, equipment affected, anything unusual)", type: "TEXT", required: false },
];

const GENERATOR_OFF: Item[] = [
  { group: "RETURN TO MAINS", prompt: "Mains power has been restored and is stable", type: "YES_NO", critical: true },
  { group: "RETURN TO MAINS", prompt: "Load transferred back from generator to mains (changeover switch / ATS)", type: "ACKNOWLEDGEMENT" },
  { group: "SHUTDOWN", prompt: "Generator ran off-load for the cool-down period before stopping", type: "YES_NO", help: "Cool-down time per the generator manual." },
  { group: "SHUTDOWN", prompt: "Generator switched off and control panel returned to AUTO / standby", type: "ACKNOWLEDGEMENT" },
  { group: "POST-RUN CHECKS", prompt: "Fuel level after the run (%)", type: "NUMERIC", min: 25, max: 100, help: `${CONFIRM} Refuel if below the minimum.` },
  { group: "POST-RUN CHECKS", prompt: "Run-hours meter reading (h)", type: "NUMERIC", help: "Write the reading shown on the meter." },
  { group: "POST-RUN CHECKS", prompt: "No leaks, abnormal smells or damage found after the run", type: "PASS_FAIL", critical: true, photoOnFail: true },
  { group: "POST-RUN CHECKS", prompt: "Refuelling is needed", type: "YES_NO", help: "If yes, tell the maintenance supervisor." },
  { group: "SITE IMPACT", prompt: "Production equipment and cold storage restarted correctly after the changeover", type: "YES_NO", critical: true },
  { group: "SITE IMPACT", prompt: "Any product or process affected by the power interruption has been reported to QA", type: "YES_NO", critical: true },
  { group: "NOTES", prompt: "Notes (time stopped, total run time, anything unusual)", type: "TEXT", required: false },
];

const FACILITY_OPEN: Item[] = [
  { group: "SECURITY & ACCESS", prompt: "Facility is secure: no sign of forced entry; alarm disarmed", type: "PASS_FAIL", critical: true, photoOnFail: true },
  { group: "SECURITY & ACCESS", prompt: "Emergency exits and fire equipment are clear and accessible", type: "PASS_FAIL", critical: true },
  { group: "SECURITY & ACCESS", prompt: "Lighting is working throughout production areas", type: "PASS_FAIL" },
  { group: "UTILITIES", prompt: "Power, water and compressed air are available", type: "YES_NO" },
  { group: "UTILITIES", prompt: "Any overnight alarm, power failure or incident (e.g. generator run) has been checked", type: "YES_NO", help: "If there was a power failure, check the Generator OFF record." },
  { group: "UTILITIES", prompt: "Production room temperature (°C)", type: "NUMERIC", min: 15, max: 25, help: "Placeholder range -- QA to confirm against the room specification." },
  { group: "UTILITIES", prompt: "Production room relative humidity (%)", type: "NUMERIC", min: 30, max: 60, help: "Placeholder range -- QA to confirm against the room specification." },
  { group: "HYGIENE & PEST", prompt: "No signs of pest activity (droppings, gnawing, live or dead insects)", type: "PASS_FAIL", critical: true, photoOnFail: true },
  { group: "HYGIENE & PEST", prompt: "Floors, walls and work surfaces are clean and dry", type: "PASS_FAIL", photoOnFail: true },
  { group: "HYGIENE & PEST", prompt: "Handwash stations stocked (soap, sanitiser, paper towel); PPE available (hairnets, gloves, gowns)", type: "PASS_FAIL" },
  { group: "HYGIENE & PEST", prompt: "Change rooms and toilets are clean and stocked", type: "PASS_FAIL" },
  { group: "HYGIENE & PEST", prompt: "Waste bins are empty and clean", type: "PASS_FAIL" },
  { group: "NOTES", prompt: "Notes (time opened, anything unusual)", type: "TEXT", required: false },
];

const FACILITY_CLOSE: Item[] = [
  { group: "PRODUCTION", prompt: "Post-operation cleaning is complete and recorded for every area used", type: "YES_NO", critical: true },
  { group: "PRODUCTION", prompt: "All production equipment is switched off and isolated", type: "YES_NO", critical: true },
  { group: "PRODUCTION", prompt: "Materials and product are stored correctly: labelled, covered, no open containers", type: "PASS_FAIL", photoOnFail: true },
  { group: "PRODUCTION", prompt: "Waste has been removed and bins emptied", type: "YES_NO" },
  { group: "UTILITIES & STORAGE", prompt: "Compressed air, water and gas isolated where required", type: "YES_NO" },
  { group: "UTILITIES & STORAGE", prompt: "Cold storage temperature (°C)", type: "NUMERIC", min: 2, max: 8, required: false, help: "Placeholder range -- QA to confirm. Leave blank if there is no cold storage." },
  { group: "UTILITIES & STORAGE", prompt: "Chemicals returned to the chemical store and the store is locked", type: "PASS_FAIL", critical: true, photoOnFail: true },
  { group: "SECURITY", prompt: "Doors, windows and dock doors are closed and locked; pest-proofing seals intact", type: "PASS_FAIL", critical: true, photoOnFail: true },
  { group: "SECURITY", prompt: "Lights off except safety and emergency lighting", type: "YES_NO" },
  { group: "SECURITY", prompt: "Alarm armed; last person out has signed off", type: "ACKNOWLEDGEMENT" },
  { group: "NOTES", prompt: "Notes (time closed, anything unusual)", type: "TEXT", required: false },
];

const CHECKLISTS: Array<{ name: string; description: string; items: Item[] }> = [
  { name: "Generator ON — Start-up & Load Transfer", description: "Pre-start checks, start-up readings and load transfer when the generator is started.", items: GENERATOR_ON },
  { name: "Generator OFF — Shutdown & Return to Mains", description: "Return to mains power, shutdown and post-run checks when the generator is stopped.", items: GENERATOR_OFF },
  { name: "Production Facility — Opening", description: "Start-of-day checks before the production facility opens.", items: FACILITY_OPEN },
  { name: "Production Facility — Closing", description: "End-of-day checks before the production facility is locked up.", items: FACILITY_CLOSE },
];

async function main() {
  const creator = await db.user.findFirst({ where: { role: "SUPER_ADMIN", active: true }, orderBy: { createdAt: "asc" } });
  if (!creator) throw new Error("No active SUPER_ADMIN user to attribute the new checklist versions to.");

  // Operator -> Supervisor verification. The generator and facility checks
  // don't release a production line, so no QA step or area release is needed.
  const workflow = await db.verificationWorkflow.findFirst({ where: { name: "Operator → Supervisor" } });
  if (!workflow) console.warn('Workflow "Operator → Supervisor" not found -- created with no workflow; assign one in Admin → Checklists.');

  for (const def of CHECKLISTS) {
    if (await db.checklist.findFirst({ where: { name: def.name } })) {
      console.log(`"${def.name}" already exists -- skipped.`);
      continue;
    }
    const checklist = await db.checklist.create({
      data: { name: def.name, category: "FACILITY_GENERATOR", workflowId: workflow?.id, description: def.description },
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
        choices: it.choices,
        required: it.required ?? true,
        minValue: it.type === "NUMERIC" ? it.min : undefined,
        maxValue: it.type === "NUMERIC" ? it.max : undefined,
        requiresPhotoOnFail: it.photoOnFail ?? false,
        criticalFailure: it.critical ?? false,
      })),
    });
    console.log(`Created "${def.name}" v1.0 with ${def.items.length} items.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
