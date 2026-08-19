import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { addDays, subDays, startOfDay } from "date-fns";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const PASSWORD = "WebOps2026!";

async function main() {
  console.log("Seeding WEB OPS demo data…");

  // ---- Wipe (dev only) ----------------------------------------------------
  await db.$transaction([
    db.auditLog.deleteMany(),
    db.notification.deleteMany(),
    db.areaRelease.deleteMany(),
    db.verificationRecord.deleteMany(),
    db.photoEvidence.deleteMany(),
    db.correctiveAction.deleteMany(),
    db.finding.deleteMany(),
    db.inspectionResponse.deleteMany(),
    db.inspection.deleteMany(),
    db.checklistSchedule.deleteMany(),
    db.checklistItem.deleteMany(),
    db.checklistVersion.deleteMany(),
    db.checklist.deleteMany(),
    db.verificationStep.deleteMany(),
    db.verificationWorkflow.deleteMany(),
    db.equipment.deleteMany(),
    db.area.deleteMany(),
    db.section.deleteMany(),
    db.facility.deleteMany(),
    db.user.deleteMany(),
  ]);

  // ---- Users ----------------------------------------------------------------
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const [superAdmin, admin, opJordan, opRiley, teamLeadCasey, supervisorMorgan, qaAvery, mgmtTaylor, viewerSam] =
    await Promise.all(
      [
        { name: "Dana Osei", email: "admin@webops.demo", role: "SUPER_ADMIN" as const, jobTitle: "Platform Administrator" },
        { name: "Priya Nathan", email: "priya.admin@webops.demo", role: "ADMIN" as const, jobTitle: "Operations Administrator" },
        { name: "Jordan Blake", email: "jordan.operator@webops.demo", role: "OPERATOR" as const, jobTitle: "Production Operator" },
        { name: "Riley Chen", email: "riley.operator@webops.demo", role: "OPERATOR" as const, jobTitle: "Production Operator" },
        { name: "Casey Mendes", email: "casey.teamlead@webops.demo", role: "TEAM_LEADER" as const, jobTitle: "Team Leader" },
        { name: "Morgan Reyes", email: "morgan.supervisor@webops.demo", role: "SUPERVISOR" as const, jobTitle: "Shift Supervisor" },
        { name: "Avery Kim", email: "avery.qa@webops.demo", role: "QA" as const, jobTitle: "QA Officer" },
        { name: "Taylor OBrien", email: "taylor.management@webops.demo", role: "MANAGEMENT" as const, jobTitle: "Operations Manager" },
        { name: "Sam Ibarra", email: "sam.viewer@webops.demo", role: "VIEWER" as const, jobTitle: "External Auditor" },
      ].map((u) => db.user.create({ data: { ...u, passwordHash, employeeId: "EMP-" + Math.random().toString(36).slice(2, 7).toUpperCase() } }))
    );

  // ---- Facility hierarchy ----------------------------------------------------
  const facility = await db.facility.create({
    data: { name: "Northgate Manufacturing Facility", code: "NGF-01", address: "14 Northgate Industrial Way" },
  });

  const production = await db.section.create({ data: { facilityId: facility.id, name: "Production", code: "PROD", sortOrder: 1 } });
  const warehouse = await db.section.create({ data: { facilityId: facility.id, name: "Warehouse", code: "WARE", sortOrder: 2 } });
  const facilitySection = await db.section.create({ data: { facilityId: facility.id, name: "Facility", code: "FAC", sortOrder: 3 } });

  const areaDefs: Array<[string, string, string]> = [
    [production.id, "Blending Room", "BLEND"],
    [production.id, "Capsule Room", "CAPS"],
    [production.id, "Bottling Area", "BOTTLE"],
    [production.id, "Gummy Production", "GUMMY"],
    [production.id, "Packaging / Pouch Area", "PACK"],
    [warehouse.id, "Raw Material Storage", "RAW"],
    [warehouse.id, "Finished Goods", "FG"],
    [warehouse.id, "Quarantine", "QTN"],
    [facilitySection.id, "Change Rooms", "CHR"],
    [facilitySection.id, "Waste Area", "WASTE"],
  ];
  const areas: Record<string, Awaited<ReturnType<typeof db.area.create>>> = {};
  let i = 0;
  for (const [sectionId, name, code] of areaDefs) {
    areas[code] = await db.area.create({ data: { sectionId, name, code, sortOrder: i++ } });
  }

  await db.equipment.createMany({
    data: [
      { areaId: areas["BLEND"].id, name: "High Shear Blender 1", code: "HSB-1" },
      { areaId: areas["CAPS"].id, name: "Capsule Filler Line A", code: "CFL-A" },
      { areaId: areas["BOTTLE"].id, name: "Bottling Line 2", code: "BL-2" },
    ],
  });

  // ---- Verification workflows -------------------------------------------
  const threeStep = await db.verificationWorkflow.create({
    data: {
      name: "Operator → Supervisor → QA",
      requiresAreaRelease: true,
      steps: { create: [{ order: 1, role: "OPERATOR" }, { order: 2, role: "SUPERVISOR" }, { order: 3, role: "QA" }] },
    },
  });
  const twoStep = await db.verificationWorkflow.create({
    data: {
      name: "Operator → Supervisor",
      steps: { create: [{ order: 1, role: "OPERATOR" }, { order: 2, role: "SUPERVISOR" }] },
    },
  });

  // ---- Checklists ---------------------------------------------------------
  async function makeChecklist(
    name: string,
    category: Parameters<typeof db.checklist.create>[0]["data"]["category"],
    workflowId: string,
    groups: Array<{
      label: string;
      items: Array<{
        prompt: string;
        type: "PASS_FAIL" | "NUMERIC" | "TEXT" | "ACKNOWLEDGEMENT";
        helpText?: string;
        requiresPhotoOnFail?: boolean;
        criticalFailure?: boolean;
        minValue?: number;
        maxValue?: number;
      }>;
    }>,
    description?: string
  ) {
    const checklist = await db.checklist.create({ data: { name, category, workflowId, description } });
    const version = await db.checklistVersion.create({
      data: { checklistId: checklist.id, versionNumber: "1.0", createdById: superAdmin.id },
    });
    let sortOrder = 0;
    for (const group of groups) {
      for (const item of group.items) {
        await db.checklistItem.create({
          data: {
            checklistVersionId: version.id,
            groupLabel: group.label,
            sortOrder: sortOrder++,
            prompt: item.prompt,
            helpText: item.helpText,
            type: item.type,
            requiresPhotoOnFail: item.requiresPhotoOnFail ?? false,
            criticalFailure: item.criticalFailure ?? false,
            // 5S-style items score 0-5 by default; items that specify their
            // own range (e.g. temperature, humidity) keep real-world units.
            minValue: item.type === "NUMERIC" ? (item.minValue ?? 0) : undefined,
            maxValue: item.type === "NUMERIC" ? (item.maxValue ?? 5) : undefined,
          },
        });
      }
    }
    return { checklist, version };
  }

  // Controlled cleaning forms (per equipment row: Clean / Sanitised / Dry
  // acknowledgement + a shared instruction, matching the paper form's C/S/D
  // columns) expand into one group of 3 ACKNOWLEDGEMENT items per equipment.
  function equipmentGroup(name: string, eqNo: string, requirement: string) {
    const label = eqNo !== "N/A" ? `${name} (${eqNo})` : name;
    return {
      label,
      items: (["Clean", "Sanitised", "Dry"] as const).map((stage) => ({
        prompt: stage,
        type: "ACKNOWLEDGEMENT" as const,
        helpText: requirement,
      })),
    };
  }

  const GMP_CRITICAL_KEYWORDS = [
    "glass",
    "light fitting",
    "rh & temperature",
    "line clearance",
    "room ready for production",
    "scale verification",
    "atp swab",
    "approved chemicals",
    "calibration label",
  ];
  function gmpCheckItem(prompt: string) {
    const critical = GMP_CRITICAL_KEYWORDS.some((k) => prompt.toLowerCase().includes(k));
    return { prompt, type: "PASS_FAIL" as const, requiresPhotoOnFail: true, criticalFailure: critical };
  }

  const preStart = await makeChecklist("Blending Room Pre-Start", "PRE_START", threeStep.id, [
    {
      label: "Area & Equipment",
      items: [
        { prompt: "Area cleanliness acceptable", type: "PASS_FAIL", requiresPhotoOnFail: true },
        { prompt: "Equipment cleanliness acceptable", type: "PASS_FAIL", requiresPhotoOnFail: true },
        { prompt: "Previous product / labels removed", type: "PASS_FAIL", criticalFailure: true, requiresPhotoOnFail: true },
        { prompt: "Correct materials staged", type: "PASS_FAIL" },
        { prompt: "PPE available and worn", type: "PASS_FAIL" },
      ],
    },
    {
      label: "Environment",
      items: [
        { prompt: "Temperature (°C)", type: "NUMERIC", minValue: 15, maxValue: 30 },
        { prompt: "Relative humidity (%)", type: "NUMERIC", minValue: 0, maxValue: 100 },
        { prompt: "Comments", type: "TEXT" },
      ],
    },
  ]);

  const postOp = await makeChecklist("Blending Room Post-Operation Cleaning", "POST_OPERATION_CLEANING", threeStep.id, [
    {
      label: "Product Clearance",
      items: [
        { prompt: "Previous product removed", type: "PASS_FAIL", criticalFailure: true, requiresPhotoOnFail: true },
        { prompt: "Waste removed", type: "PASS_FAIL" },
      ],
    },
    {
      label: "Equipment",
      items: [
        { prompt: "Product-contact surfaces clean", type: "PASS_FAIL", requiresPhotoOnFail: true },
        { prompt: "External surfaces clean", type: "PASS_FAIL" },
      ],
    },
    {
      label: "Final Release Condition",
      items: [
        { prompt: "Area ready for next operation", type: "PASS_FAIL", requiresPhotoOnFail: true },
      ],
    },
    {
      label: "Environment",
      items: [
        { prompt: "Temperature (°C)", type: "NUMERIC", minValue: 15, maxValue: 30 },
        { prompt: "Relative humidity (%)", type: "NUMERIC", minValue: 0, maxValue: 100 },
      ],
    },
  ]);

  const fiveS = await makeChecklist("Weekly 5S Audit", "FIVE_S", twoStep.id, [
    { label: "Sort", items: [{ prompt: "Unnecessary items removed", type: "NUMERIC" }] },
    { label: "Set in Order", items: [{ prompt: "Designated locations maintained", type: "NUMERIC" }] },
    { label: "Shine", items: [{ prompt: "Area clean and maintained", type: "NUMERIC" }] },
    { label: "Standardise", items: [{ prompt: "Defined standards visible", type: "NUMERIC" }] },
    { label: "Sustain", items: [{ prompt: "Continuous maintenance evident", type: "NUMERIC" }] },
  ]);

  // ---- Capsule Room cleaning checklists — real controlled documents -----
  // Sourced verbatim from C-FORM-002B1/B2/B3 (Eagle Labs Australia). Section
  // C "Verification & Sign-off" (Cleaned by / Checked by) isn't modelled as
  // checklist items — it's exactly the Operator -> Supervisor workflow this
  // platform already enforces, so `twoStep` covers it. QA only does
  // risk-based spot checks per the form's own note, not a per-form sign-off,
  // which is why there's no QA step here (unlike Blending Room's 3-step).
  const capsuleEquipmentDaily = [
    ["Capsule Filling Machine", "EQ 100", "Clean inside and outside, free from product residue"],
    ["Capsule Feeder", "EQ 101", "Clean and covered when not in use"],
    ["Capsule Polisher", "EQ 102", "Clean and free from dust / powder / capsules"],
    ["Bench Scale", "EQ 303", "Clean and free from residue"],
    ["Floor Scale", "EQ 301", "Clean and free from residue"],
    ["Vacuum Cleaner 1", "N/A", "Clean, emptied and operational"],
    ["Vacuum Cleaner 2", "N/A", "Clean, emptied and operational"],
    ["Vacuum Pump & Filters", "N/A", "Clean and operational"],
    ["Work Bench", "N/A", "Clean and free from materials"],
    ["Ladder", "N/A", "Clean and free from powder buildup"],
    ["Scoops & Tools", "N/A", "Clean and stored correctly"],
    ["Powder Hopper", "N/A", "Clean and covered"],
    ["Powder Drums", "N/A", "Cleaned, closed, labelled and stored correctly"],
    ["Used Buckets", "N/A", "Cleaned and stored correctly"],
    ["Product Transfer Containers", "N/A", "Clean, labelled and covered"],
  ] as const;

  const capsuleGmpDaily = [
    "Floor, Walls & Doors clean",
    "Waste Bins empty & clean",
    "Air Vents clean",
    "No Pallets present in Room",
    "Finished Product crates correctly labelled and stored",
    "Powder Drums correctly labelled and stored",
    "Toolbox and tools checked for cleanliness, condition, and correct storage",
    "Registered glass and brittle plastic items are intact and free from damage",
    "No unregistered glass or brittle plastic items are present in the area",
    "Light fittings are intact and shatter-resistant covers/sleeves are in place",
    "RH & Temperature Control Levels checked and within limits",
    "Line Clearance completed",
    "Room ready for Production",
    "Scale verification PASS — EQ 301 (TCS Large) — Capsule Room (per D.103 § 7; record operator initials in Comments)",
    "ATP swab — Per-run rotating — 1-2 critical FCS (NJP-2500C dosing disc, tamping pins) (per C.103 § 7); record RLU + Surface ID in Comments; if CAUTION/FAIL follow C.103 § 6.5 OOS Response",
  ];

  // 5S mini-check — Sort/Set in Order/Shine/Standardise/Sustain, embedded as
  // Section C on every Capsule Room cleaning checklist (not the separate,
  // more detailed 0-5-scored Weekly 5S Audit). Each is PASS_FAIL, which now
  // always carries an optional photo attach (spec §18), regardless of outcome.
  const FIVE_S_CHECK_ITEMS = [
    { prompt: "Sort (Seiri) — remove anything that is not needed", helpText: "Keep only what is required for the current job." },
    { prompt: "Set in Order (Seiton) — everything has a place", helpText: "Keep tools, materials and equipment clearly labelled and organised." },
    { prompt: "Shine (Seiso) — clean and inspect", helpText: "Clean spills, dust and equipment, and report damage or abnormalities." },
    { prompt: "Standardise (Seiketsu) — follow the same standard every time", helpText: "Use SOPs, checklists, labels and visual standards." },
    { prompt: "Sustain (Shitsuke) — maintain the standard every day", helpText: "Make 5S part of normal work, not just before an audit." },
  ] as const;
  function fiveSCheckItems() {
    return FIVE_S_CHECK_ITEMS.map((i) => ({ prompt: i.prompt, helpText: i.helpText, type: "PASS_FAIL" as const, requiresPhotoOnFail: true }));
  }

  const capsuleDaily = await makeChecklist(
    "Daily Cleaning Checklist — Capsule Room",
    "POST_OPERATION_CLEANING",
    twoStep.id,
    [
      { label: "A. Equipment / Area — Daily Tasks", items: capsuleEquipmentDaily.flatMap(([n, eq, req]) => equipmentGroup(n, eq, req).items.map((i) => ({ ...i, prompt: `${n} — ${i.prompt}` }))) },
      { label: "B. Area & GMP Inspection", items: capsuleGmpDaily.map(gmpCheckItem) },
      { label: "C. 5S Check", items: fiveSCheckItems() },
    ],
    "C-FORM-002B1 · Zone: ORANGE — Capsule Room · Cadence: Daily · Cleaning agents: CHM-011 (Neutral Detergent), CHM-021 (Pure IPA) per C-REG-001 Rev 07 · Verification: ATP swab per C.103 (QA-MGR risk-based spot check) · Rev V1 (Draft)"
  );

  const capsuleEquipmentWeekly = [
    ["Capsule Filling Machine", "EQ 100", "Disassemble removable parts, clean all product-contact surfaces, inspect seals, guards, dosing disc and tamping pins, sanitise and dry"],
    ["Capsule Hopper", "EQ 101", "Remove, wash, sanitise, inspect for cracks or damage"],
    ["Capsule Polisher", "EQ 102", "Disassemble brushes / screens, clean thoroughly, inspect condition, sanitise and dry"],
    ["Bench Scale", "EQ 303", "Clean underneath, inspect condition and cleanliness"],
    ["Floor Scale", "EQ 301", "Clean platform and underneath, inspect condition"],
    ["Vacuum Cleaner 1", "N/A", "Empty, clean, inspect hose, filter and power cord"],
    ["Vacuum Cleaner 2", "N/A", "Empty, clean, inspect hose, filter and power cord"],
    ["Vacuum Pump & Filters", "N/A", "Clean exterior, inspect filters and connections"],
    ["Work Bench", "N/A", "Move and clean underneath, sanitise surfaces"],
    ["Ladder", "N/A", "Clean and inspect for damage or loose fittings"],
    ["Scoops & Tools", "N/A", "Inspect for wear, clean, sanitise and store correctly"],
    ["Powder Hopper", "N/A", "Remove residue, inspect condition, sanitise"],
    ["Powder Drums", "N/A", "Remove old labels, clean exterior, verify identification labels"],
    ["Used Buckets", "N/A", "Deep clean, remove labels and adhesive residue"],
    ["Product Transfer Containers", "N/A", "Thoroughly clean, sanitise, inspect lids and seals"],
  ] as const;

  const capsuleGmpWeekly = [
    "Floor, Walls & Doors clean",
    "Waste Bins empty & clean",
    "Air Vents clean",
    "No Pallets present in Room",
    "Finished Product crates correctly labelled and stored",
    "Powder Drums correctly labelled and stored",
    "Registered glass and brittle plastic items are intact and free from damage",
    "No unregistered glass or brittle plastic items are present in the area",
    "Light fittings are intact and shatter-resistant covers/sleeves are in place",
    "Toolbox and tools checked for cleanliness, condition, and correct storage",
    "RH & Temperature Control Levels checked and within limits",
    "Line Clearance completed",
    "Room ready for Production",
    "Cleaning tool colour-coding verified (zone-specific)",
    "Approved chemicals only on site (per C-REG-001 Rev 07)",
    "ATP swab — Weekly full sweep — 3-5 critical FCS (per C.103 § 7); record RLU + Surface ID in Comments; if CAUTION/FAIL follow C.103 § 6.5 OOS Response",
  ];

  const capsuleWeekly = await makeChecklist(
    "Weekly Cleaning Checklist — Capsule Room",
    "POST_OPERATION_CLEANING",
    twoStep.id,
    [
      { label: "A. Equipment / Area — Weekly Tasks", items: capsuleEquipmentWeekly.flatMap(([n, eq, req]) => equipmentGroup(n, eq, req).items.map((i) => ({ ...i, prompt: `${n} — ${i.prompt}` }))) },
      { label: "B. Area & GMP Inspection", items: capsuleGmpWeekly.map(gmpCheckItem) },
      { label: "C. 5S Check", items: fiveSCheckItems() },
    ],
    "C-FORM-002B2 · Zone: ORANGE — Capsule Room · Cadence: Weekly · Cleaning agents: CHM-011 (Neutral Detergent), CHM-021 (Pure IPA) per C-REG-001 Rev 07 · Verification: ATP swab per C.103 (QA-MGR risk-based spot check) · Rev V1 (Draft)"
  );

  const capsuleEquipmentMonthly = [
    ["Capsule Filling Machine", "EQ 100", "Complete strip-down of accessible parts. Deep clean machine frame, guards, dosing system, hopper, contact parts, hard-to-reach areas. Inspect wear and condition."],
    ["Capsule Hopper", "EQ 101", "Deep clean, sanitise, inspect for cracks, wear, staining and damage"],
    ["Capsule Polisher", "EQ 102", "Complete disassembly, deep clean brushes, screens, housing. Inspect components and sanitise"],
    ["Bench Scale", "EQ 303", "Deep clean including underneath and surrounding area. Inspect condition"],
    ["Floor Scale", "EQ 301", "Deep clean platform, underneath and surrounding floor area"],
    ["Vacuum Cleaner 1", "N/A", "Deep clean unit, replace bags if required, inspect filters, hose and electrical cord"],
    ["Vacuum Cleaner 2", "N/A", "Deep clean unit, replace bags if required, inspect filters, hose and electrical cord"],
    ["Vacuum Pump & Filters", "N/A", "Deep clean accessible areas, inspect filters, fittings and connections"],
    ["Work Bench", "N/A", "Move equipment, deep clean underneath and surrounding area, sanitise surfaces"],
    ["Ladder", "N/A", "Deep clean and inspect all steps, feet and fittings"],
    ["Scoops & Tools", "N/A", "Deep clean, sanitise, inspect for wear and replace if required"],
    ["Powder Hopper", "N/A", "Deep clean internal and external surfaces, sanitise and inspect condition"],
    ["Powder Drums", "N/A", "Remove labels, deep clean, inspect condition and relabel if required"],
    ["Used Buckets", "N/A", "Deep clean, remove all labels and adhesive residue"],
    ["Product Transfer Containers", "N/A", "Deep clean, sanitise, inspect lids, seals and container integrity"],
  ] as const;

  const capsuleGmpMonthly = [
    "Floors, Walls & Doors deep clean completed",
    "Waste Bins empty & clean",
    "Air Vents / Exhaust Grilles deep cleaned",
    "No Pallets present in Room",
    "Finished Product crates correctly labelled and stored",
    "Powder Drums correctly labelled and stored",
    "Raw Materials returned to Warehouse",
    "RH & Temperature Control Levels checked and within limits",
    "Line Clearance completed",
    "Room ready for Production",
    "Cleaning tool colour-coding verified (zone-specific)",
    "Approved chemicals only on site (per C-REG-001 Rev 07)",
    "Toolbox and tools checked for cleanliness, condition, and correct storage",
    "Ceilings clean and free from dust",
    "Light Fittings clean and free from dust",
    "Electrical Panels clean and in good condition",
    "Storage Shelves clean and organised",
    "Registered glass and brittle plastic items are intact and free from damage",
    "No unregistered glass or brittle plastic items are present in the area",
    "Light fittings are intact and shatter-resistant covers/sleeves are in place",
    "Calibration Labels current and valid (refer D-REG-001)",
    "Maintenance Requirements identified and reported (refer C.104)",
    "ATP swab — Monthly extended — 3-5 FCS + 2 NFCS (per C.103 § 7); record RLU + Surface ID in Comments; if CAUTION/FAIL follow C.103 § 6.5 OOS Response",
  ];

  const capsuleMonthly = await makeChecklist(
    "Monthly Cleaning Checklist — Capsule Room",
    "POST_OPERATION_CLEANING",
    twoStep.id,
    [
      { label: "A. Equipment / Area — Monthly Deep Clean Tasks", items: capsuleEquipmentMonthly.flatMap(([n, eq, req]) => equipmentGroup(n, eq, req).items.map((i) => ({ ...i, prompt: `${n} — ${i.prompt}` }))) },
      { label: "B. Area & GMP Inspection", items: capsuleGmpMonthly.map(gmpCheckItem) },
      { label: "C. 5S Check", items: fiveSCheckItems() },
    ],
    "C-FORM-002B3 · Zone: ORANGE — Capsule Room · Cadence: Monthly Deep Clean · Cleaning agents: CHM-011 (Neutral Detergent), CHM-021 (Pure IPA) per C-REG-001 Rev 07 · Verification: ATP swab per C.103 (QA-MGR risk-based spot check) · Rev V1 (Draft)"
  );

  // ---- Schedules ------------------------------------------------------------
  await db.checklistSchedule.create({
    data: {
      checklistId: preStart.checklist.id,
      frequency: "DAILY",
      startDate: subDays(new Date(), 30),
      dueTime: "06:00",
      facilityId: facility.id,
      sectionId: production.id,
      areaId: areas["BLEND"].id,
      assignedRole: "OPERATOR",
      photoRequired: true,
    },
  });
  await db.checklistSchedule.create({
    data: {
      checklistId: postOp.checklist.id,
      frequency: "DAILY",
      startDate: subDays(new Date(), 30),
      dueTime: "18:00",
      facilityId: facility.id,
      sectionId: production.id,
      areaId: areas["BLEND"].id,
      assignedRole: "OPERATOR",
      photoRequired: true,
    },
  });
  await db.checklistSchedule.create({
    data: {
      checklistId: fiveS.checklist.id,
      frequency: "WEEKLY",
      startDate: subDays(new Date(), 30),
      recurrenceDays: [1],
      facilityId: facility.id,
      assignedRole: "TEAM_LEADER",
    },
  });
  await db.checklistSchedule.create({
    data: {
      checklistId: capsuleDaily.checklist.id,
      frequency: "DAILY",
      startDate: subDays(new Date(), 7),
      dueTime: "17:00",
      facilityId: facility.id,
      sectionId: production.id,
      areaId: areas["CAPS"].id,
      assignedRole: "OPERATOR",
      photoRequired: true,
    },
  });
  await db.checklistSchedule.create({
    data: {
      checklistId: capsuleWeekly.checklist.id,
      frequency: "WEEKLY",
      startDate: subDays(new Date(), 7),
      recurrenceDays: [5],
      facilityId: facility.id,
      sectionId: production.id,
      areaId: areas["CAPS"].id,
      assignedRole: "OPERATOR",
      photoRequired: true,
    },
  });
  await db.checklistSchedule.create({
    data: {
      checklistId: capsuleMonthly.checklist.id,
      frequency: "MONTHLY",
      startDate: subDays(new Date(), 7),
      facilityId: facility.id,
      sectionId: production.id,
      areaId: areas["CAPS"].id,
      assignedRole: "OPERATOR",
      photoRequired: true,
    },
  });

  // ---- Historical inspections (last 14 days, mix of statuses) -----------
  const operators = [opJordan, opRiley];
  const statuses = ["CLOSED", "CLOSED", "CLOSED", "QA_APPROVED", "AWAITING_QA", "AWAITING_SUPERVISOR", "RETURNED", "OVERDUE"] as const;

  for (let day = 14; day >= 0; day--) {
    const date = startOfDay(subDays(new Date(), day));
    const status = statuses[day % statuses.length];
    const operator = operators[day % operators.length];
    const areaCodes = ["BLEND", "CAPS", "BOTTLE"];
    const areaCode = areaCodes[day % areaCodes.length];
    const area = areas[areaCode];

    const inspection = await db.inspection.create({
      data: {
        checklistVersionId: preStart.version.id,
        facilityId: facility.id,
        sectionId: production.id,
        areaId: area.id,
        frequency: "DAILY",
        status,
        dueAt: addDays(date, 0),
        startedAt: date,
        submittedAt: date,
        operatorId: status === "OVERDUE" ? null : operator.id,
        supervisorId: ["SUPERVISOR_APPROVED", "AWAITING_QA", "QA_APPROVED", "CLOSED"].includes(status) ? supervisorMorgan.id : null,
        qaId: ["QA_APPROVED", "CLOSED"].includes(status) ? qaAvery.id : null,
        score: status === "OVERDUE" ? null : 80 + ((day * 7) % 20),
        createdAt: date,
      },
    });

    const items = await db.checklistItem.findMany({ where: { checklistVersionId: preStart.version.id } });
    for (const item of items) {
      if (status === "OVERDUE") continue;
      const willFail = day % 5 === 0 && item.type === "PASS_FAIL" && item.groupLabel === "Area & Equipment";
      await db.inspectionResponse.create({
        data: {
          inspectionId: inspection.id,
          checklistItemId: item.id,
          passFail: item.type === "PASS_FAIL" ? (willFail ? "FAIL" : "PASS") : undefined,
          numericValue: item.type === "NUMERIC" ? 20 + (day % 5) : undefined,
          textValue: item.type === "TEXT" ? "No abnormalities noted." : undefined,
        },
      });

      if (willFail) {
        const finding = await db.finding.create({
          data: {
            inspectionId: inspection.id,
            checklistItemId: item.id,
            areaId: area.id,
            description: `${item.prompt} — failed during Pre-Start`,
            severity: day % 10 === 0 ? "CRITICAL" : "MAJOR",
            status: day > 3 ? "CORRECTIVE_ACTION_CREATED" : "OPEN",
            createdById: operator.id,
          },
        });

        if (day > 3) {
          await db.correctiveAction.create({
            data: {
              findingId: finding.id,
              areaId: area.id,
              correctiveAction: "Deep clean performed and equipment re-inspected before next batch.",
              responsibleUserId: teamLeadCasey.id,
              dueDate: addDays(date, 2),
              status: day > 8 ? "CLOSED" : "IN_PROGRESS",
              closedById: day > 8 ? supervisorMorgan.id : null,
              closedAt: day > 8 ? addDays(date, 2) : null,
            },
          });
        }
      }
    }

    if (["SUPERVISOR_APPROVED", "AWAITING_QA", "QA_APPROVED", "CLOSED"].includes(status)) {
      await db.verificationRecord.create({
        data: { inspectionId: inspection.id, stepRole: "SUPERVISOR", actorId: supervisorMorgan.id, action: "APPROVE", createdAt: date },
      });
    }
    if (["QA_APPROVED", "CLOSED"].includes(status)) {
      await db.verificationRecord.create({
        data: { inspectionId: inspection.id, stepRole: "QA", actorId: qaAvery.id, action: "APPROVE", createdAt: date },
      });
      await db.areaRelease.create({
        data: {
          areaId: area.id,
          inspectionId: inspection.id,
          status: "QA_RELEASED",
          supervisorId: supervisorMorgan.id,
          supervisorAt: date,
          qaId: qaAvery.id,
          qaAt: date,
          releasedAt: date,
        },
      });
    }
    if (status === "RETURNED") {
      await db.verificationRecord.create({
        data: { inspectionId: inspection.id, stepRole: "SUPERVISOR", actorId: supervisorMorgan.id, action: "RETURN", comment: "Photo evidence missing for failed item.", createdAt: date },
      });
    }
  }

  console.log("Seed complete.");
  console.log(`Demo password for all accounts: ${PASSWORD}`);
  console.log("Accounts:", [superAdmin, admin, opJordan, opRiley, teamLeadCasey, supervisorMorgan, qaAvery, mgmtTaylor, viewerSam].map((u) => u.email).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
