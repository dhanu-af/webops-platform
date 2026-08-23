-- New Areas this equipment register needs, created only if not already present
-- (idempotent: safe even if this migration is ever re-run against a database
-- that already has them).
INSERT INTO "Area" ("id", "sectionId", "name", "code", "qrToken", "updatedAt")
SELECT gen_random_uuid()::text, s."id", 'QC Lab', 'QCLAB', gen_random_uuid()::text, CURRENT_TIMESTAMP
FROM "Section" s
WHERE s."name" = 'QA Lab'
  AND NOT EXISTS (SELECT 1 FROM "Area" a WHERE a."sectionId" = s."id" AND a."code" = 'QCLAB');

INSERT INTO "Area" ("id", "sectionId", "name", "code", "qrToken", "updatedAt")
SELECT gen_random_uuid()::text, s."id", 'Syrup Dispensing', 'SYRUP', gen_random_uuid()::text, CURRENT_TIMESTAMP
FROM "Section" s
WHERE s."name" = 'Warehouse'
  AND NOT EXISTS (SELECT 1 FROM "Area" a WHERE a."sectionId" = s."id" AND a."code" = 'SYRUP');

INSERT INTO "Area" ("id", "sectionId", "name", "code", "qrToken", "updatedAt")
SELECT gen_random_uuid()::text, s."id", 'Utility Area', 'UTIL', gen_random_uuid()::text, CURRENT_TIMESTAMP
FROM "Section" s
WHERE s."name" = 'Facility'
  AND NOT EXISTS (SELECT 1 FROM "Area" a WHERE a."sectionId" = s."id" AND a."code" = 'UTIL');

-- Eagle Labs' real equipment register (from her master spreadsheet) -- one
-- upsert per item, matched by (areaId, code). Resolves the area by section +
-- area name rather than a hardcoded id, since this migration runs identically
-- against every environment's own database (each with its own generated ids
-- for the same seeded Section/Area names).
INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Capsule Machine NJP-2500', 'EQ 100', '25050027', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'NJP 2500', 'Critical', TRUE, 'Quarterly', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'Capsule encapsulation'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Capsule Room'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'NJP 2500',
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'Capsule encapsulation',
  "name" = 'Capsule Machine NJP-2500',
  "serialNumber" = '25050027',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Capsule Feeder', 'EQ 101', '250300240', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'JNJ', 'Critical', TRUE, 'Quarterly', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', NULL
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Capsule Room'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'JNJ',
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = NULL,
  "name" = 'Capsule Feeder',
  "serialNumber" = '250300240',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Capsule Polisher', 'EQ 102', '25030240', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'HSLC 100', 'Major', TRUE, 'Quarterly', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', NULL
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Capsule Room'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'HSLC 100',
  "criticality" = 'Major',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = NULL,
  "name" = 'Capsule Polisher',
  "serialNumber" = '25030240',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Bottling Line (system)', 'EQ 103', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Major', TRUE, 'Quarterly', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'Parent — sub-units EQ 103A-G'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Bottling Area'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Major',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'Parent — sub-units EQ 103A-G',
  "name" = 'Bottling Line (system)',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Printing Machine', 'EQ 103A', '23116012056ZH', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'Video Jet', 'Major', FALSE, 'Quarterly', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'Coding / marking'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Bottling Area'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'Video Jet',
  "criticality" = 'Major',
  "foodSafetyRisk" = FALSE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'Coding / marking',
  "name" = 'Printing Machine',
  "serialNumber" = '23116012056ZH',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Bottle Feeder', 'EQ 103B', '25030235', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'PBL 160', 'Major', TRUE, 'Quarterly', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', NULL
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Bottling Area'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'PBL 160',
  "criticality" = 'Major',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = NULL,
  "name" = 'Bottle Feeder',
  "serialNumber" = '25030235',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Desiccant Inserter', 'EQ 103C', '25030235', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'PBGZ 160', 'Major', TRUE, 'Quarterly', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', NULL
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Bottling Area'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'PBGZ 160',
  "criticality" = 'Major',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = NULL,
  "name" = 'Desiccant Inserter',
  "serialNumber" = '25030235',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Main Filling & Counting Machine', 'EQ 103D', '25030235', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'PBDS 12B', 'Critical', TRUE, 'Quarterly', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'Fill weight critical'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Bottling Area'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'PBDS 12B',
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'Fill weight critical',
  "name" = 'Main Filling & Counting Machine',
  "serialNumber" = '25030235',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Capping / Sealing Machine', 'EQ 103E', '25030235', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'PBX 160', 'Critical', TRUE, 'Quarterly', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', NULL
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Bottling Area'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'PBX 160',
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = NULL,
  "name" = 'Capping / Sealing Machine',
  "serialNumber" = '25030235',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Induction Sealer', 'EQ 103F', '25030235', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'PBFK 260', 'Major', TRUE, 'Quarterly', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', NULL
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Bottling Area'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'PBFK 260',
  "criticality" = 'Major',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = NULL,
  "name" = 'Induction Sealer',
  "serialNumber" = '25030235',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Round Unscrambler Table', 'EQ 103G', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Major', FALSE, 'Quarterly', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'NEW per staff'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Bottling Area'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Major',
  "foodSafetyRisk" = FALSE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'NEW per staff',
  "name" = 'Round Unscrambler Table',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Gummy Cooking Kettle 1 & 2 Control Panel', 'EQ 104', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Critical', TRUE, 'Monthly inspection + Quarterly PPM', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'Parent — sub-units EQ 104A-F'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Gummy Production'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Monthly inspection + Quarterly PPM',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'Parent — sub-units EQ 104A-F',
  "name" = 'Gummy Cooking Kettle 1 & 2 Control Panel',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Cooking Kettle 1', 'EQ 104A', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Critical', TRUE, 'Monthly inspection + Quarterly PPM', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'Thermometer calibration per D.103'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Gummy Production'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Monthly inspection + Quarterly PPM',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'Thermometer calibration per D.103',
  "name" = 'Cooking Kettle 1',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Cooking Kettle 2', 'EQ 104B', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Critical', TRUE, 'Monthly inspection + Quarterly PPM', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'Thermometer calibration per D.103'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Gummy Production'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Monthly inspection + Quarterly PPM',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'Thermometer calibration per D.103',
  "name" = 'Cooking Kettle 2',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Cooking Kettle 3', 'EQ 104C', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Critical', TRUE, 'Monthly inspection + Quarterly PPM', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'Thermometer calibration per D.103'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Gummy Production'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Monthly inspection + Quarterly PPM',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'Thermometer calibration per D.103',
  "name" = 'Cooking Kettle 3',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Cooking Kettle 4', 'EQ 104D', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Critical', TRUE, 'Monthly inspection + Quarterly PPM', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'Thermometer calibration per D.103'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Gummy Production'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Monthly inspection + Quarterly PPM',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'Thermometer calibration per D.103',
  "name" = 'Cooking Kettle 4',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Kettle Water Tank', 'EQ 104E', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Major', FALSE, 'Quarterly', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', NULL
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Gummy Production'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Major',
  "foodSafetyRisk" = FALSE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = NULL,
  "name" = 'Kettle Water Tank',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Connecting Pipe / Transfer Line', 'EQ 104F', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Critical', TRUE, 'Quarterly', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'Thermometer calibration per D.103'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Gummy Production'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'Thermometer calibration per D.103',
  "name" = 'Connecting Pipe / Transfer Line',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Gummy Depositor (system)', 'EQ 105', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Critical', TRUE, 'Quarterly', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'Parent — sub-units EQ 105A-F'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Gummy Production'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'Parent — sub-units EQ 105A-F',
  "name" = 'Gummy Depositor (system)',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Mixer 1 (depositor)', 'EQ 105A', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Critical', TRUE, 'Quarterly', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', NULL
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Gummy Production'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = NULL,
  "name" = 'Mixer 1 (depositor)',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Mixer 2 (depositor)', 'EQ 105B', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Critical', TRUE, 'Quarterly', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'NEW per staff'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Gummy Production'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'NEW per staff',
  "name" = 'Mixer 2 (depositor)',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Hopper 1', 'EQ 105C', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Critical', TRUE, 'Quarterly', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'Thermometer & sensor calibration'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Gummy Production'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'Thermometer & sensor calibration',
  "name" = 'Hopper 1',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Hopper 2', 'EQ 105D', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Critical', TRUE, 'Quarterly', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'Thermometer & sensor calibration'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Gummy Production'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'Thermometer & sensor calibration',
  "name" = 'Hopper 2',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Nozzles (20 pieces)', 'EQ 105E', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Critical', TRUE, 'Quarterly', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'Speed & volume calibration'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Gummy Production'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'Speed & volume calibration',
  "name" = 'Nozzles (20 pieces)',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'PLC', 'EQ 105F', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Major', FALSE, 'Quarterly', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'Control system'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Gummy Production'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Major',
  "foodSafetyRisk" = FALSE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'Control system',
  "name" = 'PLC',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Metal Detector', 'EQ 106', 'TBC', TRUE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Critical', TRUE, 'Per manufacturer + every-run start verification', 'Contractor', 'Retired 18/06/2026', NULL, NULL, 'N/A (Retired)', 'Superseded by EQ 110 X-ray Cassel Shark XD28-L1 per CC-2026-001. Old metal detector unable to reliably detect contamination in foil-sealed pouches.'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Gummy Production'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Per manufacturer + every-run start verification',
  "serviceProvider" = 'Contractor',
  "status" = 'Retired 18/06/2026',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'N/A (Retired)',
  "comments" = 'Superseded by EQ 110 X-ray Cassel Shark XD28-L1 per CC-2026-001. Old metal detector unable to reliably detect contamination in foil-sealed pouches.',
  "name" = 'Metal Detector',
  "serialNumber" = 'TBC',
  "archived" = TRUE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Control Panel (Kettle 3 & 4)', 'EQ 107', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, NULL, NULL, NULL, NULL, 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', NULL
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Gummy Production'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = NULL,
  "foodSafetyRisk" = NULL,
  "ppmFrequency" = NULL,
  "serviceProvider" = NULL,
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = NULL,
  "name" = 'Control Panel (Kettle 3 & 4)',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Gummy Cooling Tunnel', 'EQ 108', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, NULL, NULL, NULL, NULL, 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', NULL
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Gummy Production'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = NULL,
  "foodSafetyRisk" = NULL,
  "ppmFrequency" = NULL,
  "serviceProvider" = NULL,
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = NULL,
  "name" = 'Gummy Cooling Tunnel',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Pouch Packing Machine', 'EQ 109', '25030371', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'SF8 - 200c', 'Critical', TRUE, 'Quarterly', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', NULL
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Packaging / Pouch Area'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'SF8 - 200c',
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = NULL,
  "name" = 'Pouch Packing Machine',
  "serialNumber" = '25030371',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Pouch Machine Product Lifter', 'EQ 109A', '25030371', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'SF8 - 200c', 'Critical', TRUE, 'Quarterly', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', NULL
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Packaging / Pouch Area'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'SF8 - 200c',
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = NULL,
  "name" = 'Pouch Machine Product Lifter',
  "serialNumber" = '25030371',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Pouch Machine Multi-head Weigher', 'EQ 109B', '25030371', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'SF8 - 200c', 'Critical', TRUE, 'Quarterly', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', NULL
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Packaging / Pouch Area'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'SF8 - 200c',
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = NULL,
  "name" = 'Pouch Machine Multi-head Weigher',
  "serialNumber" = '25030371',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'V Blender 1', 'EQ 200', '25030240-1', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'GHJ', 'Critical', TRUE, 'Quarterly', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', NULL
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Blending Room'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'GHJ',
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = NULL,
  "name" = 'V Blender 1',
  "serialNumber" = '25030240-1',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'V Blender 2', 'EQ 201', '25030240-2', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'GHJ', 'Critical', TRUE, 'Quarterly', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', NULL
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Blending Room'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'GHJ',
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = NULL,
  "name" = 'V Blender 2',
  "serialNumber" = '25030240-2',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Large Floor Scale', 'EQ 300', '1102000', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'TCS', 'Critical', TRUE, 'Annual NATA + Daily verify', 'Mixed', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'D.103 — schedule NATA cal'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Blending Room'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'TCS',
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Annual NATA + Daily verify',
  "serviceProvider" = 'Mixed',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'D.103 — schedule NATA cal',
  "name" = 'Large Floor Scale',
  "serialNumber" = '1102000',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Large Floor Scale', 'EQ 301', 'N/A', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'TCS', 'Critical', TRUE, 'Annual NATA + Daily verify', 'Mixed', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'D.103 — schedule NATA cal'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Capsule Room'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'TCS',
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Annual NATA + Daily verify',
  "serviceProvider" = 'Mixed',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'D.103 — schedule NATA cal',
  "name" = 'Large Floor Scale',
  "serialNumber" = 'N/A',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Bench Scale (Vevor)', 'EQ 302', '8160077', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'Vevor', 'Major', TRUE, 'Annual NATA + Daily verify', 'Mixed', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'D.103 — confirm if release-critical, then schedule NATA cal'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Blending Room'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'Vevor',
  "criticality" = 'Major',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Annual NATA + Daily verify',
  "serviceProvider" = 'Mixed',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'D.103 — confirm if release-critical, then schedule NATA cal',
  "name" = 'Bench Scale (Vevor)',
  "serialNumber" = '8160077',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Ohaus Bench Scale (PRD-GUM-BENCH-01)', 'EQ 303', 'C543461617', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'Ohaus SPX2202', 'Critical', TRUE, 'Annual NATA + Daily verify', 'Mixed', 'Active', '14/04/2026', 'before 31/10/2026', 'Legacy (baseline qual per HI-VMP-001)', 'NATA cert CH008720 (GC Weighing); D.103 cross-ref; PRD-GUM-BENCH-01'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Gummy Production'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'Ohaus SPX2202',
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Annual NATA + Daily verify',
  "serviceProvider" = 'Mixed',
  "status" = 'Active',
  "lastServiceDate" = '14/04/2026',
  "nextServiceDue" = 'before 31/10/2026',
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'NATA cert CH008720 (GC Weighing); D.103 cross-ref; PRD-GUM-BENCH-01',
  "name" = 'Ohaus Bench Scale (PRD-GUM-BENCH-01)',
  "serialNumber" = 'C543461617',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'CAS HD-150 Bulk #1 (PRD-GUM-BULK-01)', 'EQ 304', '250854561', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'CAS CORPORATION HD4050-150', 'Critical', TRUE, 'Annual NATA + Daily verify', 'Mixed', 'Active', '07/05/2026', '31/05/2027', 'Legacy (baseline qual per HI-VMP-001)', 'NATA cert CH008859 — GC Weighing (PRIOR SERIAL WAS SWAPPED — corrected)'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Gummy Production'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'CAS CORPORATION HD4050-150',
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Annual NATA + Daily verify',
  "serviceProvider" = 'Mixed',
  "status" = 'Active',
  "lastServiceDate" = '07/05/2026',
  "nextServiceDue" = '31/05/2027',
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'NATA cert CH008859 — GC Weighing (PRIOR SERIAL WAS SWAPPED — corrected)',
  "name" = 'CAS HD-150 Bulk #1 (PRD-GUM-BULK-01)',
  "serialNumber" = '250854561',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'CAS HD-150 Bulk #2 (PRD-GUM-BULK-02)', 'EQ 305', '250854563', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'CAS CORPORATION HD4050-150', 'Critical', TRUE, 'Annual NATA + Daily verify', 'Mixed', 'Active', '07/05/2026', '31/05/2027', 'Legacy (baseline qual per HI-VMP-001)', 'NATA cert CH008858 — GC Weighing (PRIOR SERIAL WAS SWAPPED — corrected)'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Gummy Production'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'CAS CORPORATION HD4050-150',
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Annual NATA + Daily verify',
  "serviceProvider" = 'Mixed',
  "status" = 'Active',
  "lastServiceDate" = '07/05/2026',
  "nextServiceDue" = '31/05/2027',
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'NATA cert CH008858 — GC Weighing (PRIOR SERIAL WAS SWAPPED — corrected)',
  "name" = 'CAS HD-150 Bulk #2 (PRD-GUM-BULK-02)',
  "serialNumber" = '250854563',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Bench Scale (Bottling Line)', 'EQ 306', 'TBC', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'TBC', 'Major', TRUE, 'Annual NATA + Daily verify', 'Mixed', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', '🟡 NEW per staff — confirm model + serial + NATA schedule'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Bottling Area'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'TBC',
  "criticality" = 'Major',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Annual NATA + Daily verify',
  "serviceProvider" = 'Mixed',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = '🟡 NEW per staff — confirm model + serial + NATA schedule',
  "name" = 'Bench Scale (Bottling Line)',
  "serialNumber" = 'TBC',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Bench Scale (Bottling Line)', 'EQ 307', 'TBC', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'TBC', 'Major', TRUE, 'Annual NATA + Daily verify', 'Mixed', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', '🟡 NEW per staff — confirm model + serial + NATA schedule'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Bottling Area'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'TBC',
  "criticality" = 'Major',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Annual NATA + Daily verify',
  "serviceProvider" = 'Mixed',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = '🟡 NEW per staff — confirm model + serial + NATA schedule',
  "name" = 'Bench Scale (Bottling Line)',
  "serialNumber" = 'TBC',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Floor Scale', 'EQ 308', 'TBC', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'TBC', 'Critical', TRUE, 'Annual NATA + Daily verify', 'Mixed', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', '🟡 NEW per staff — syrup dispensing critical for batch consistency'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Warehouse' AND a."name" = 'Syrup Dispensing'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'TBC',
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Annual NATA + Daily verify',
  "serviceProvider" = 'Mixed',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = '🟡 NEW per staff — syrup dispensing critical for batch consistency',
  "name" = 'Floor Scale',
  "serialNumber" = 'TBC',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Vibro Sieve Machine', 'EQ 500', '515960007', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'Vevor', 'Major', TRUE, 'Quarterly', 'Internal', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'NEW per staff — foreign matter screen'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Blending Room'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'Vevor',
  "criticality" = 'Major',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Internal',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'NEW per staff — foreign matter screen',
  "name" = 'Vibro Sieve Machine',
  "serialNumber" = '515960007',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Grinder Machine', 'EQ 501', '842590040', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'Vevor', 'Major', TRUE, 'Quarterly', 'Internal', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'NEW per staff'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Blending Room'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'Vevor',
  "criticality" = 'Major',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Internal',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'NEW per staff',
  "name" = 'Grinder Machine',
  "serialNumber" = '842590040',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Infrared Thermometer', 'EQ 600', 'N/A', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'DT8550BH', 'Critical', TRUE, 'Annual NATA + per-use vs reference', 'Mixed', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', '🟡 NEW per staff — used for kettle / process temp check; D.103'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Gummy Production'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'DT8550BH',
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Annual NATA + per-use vs reference',
  "serviceProvider" = 'Mixed',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = '🟡 NEW per staff — used for kettle / process temp check; D.103',
  "name" = 'Infrared Thermometer',
  "serialNumber" = 'N/A',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Reference Thermometer', 'EQ 601', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Critical', TRUE, 'Annual NATA', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'D.103'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'QA Lab' AND a."name" = 'QC Lab'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Annual NATA',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'D.103',
  "name" = 'Reference Thermometer',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Process Thermometers — Kettles', 'EQ 602', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Critical', TRUE, 'Annual NATA + per-run vs reference', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'D.103'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Gummy Production'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Annual NATA + per-run vs reference',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'D.103',
  "name" = 'Process Thermometers — Kettles',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'pH Meter', 'EQ 603', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Critical', TRUE, 'Annual NATA + buffer-check per use', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'D.103'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'QA Lab' AND a."name" = 'QC Lab'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Annual NATA + buffer-check per use',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'D.103',
  "name" = 'pH Meter',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Water Activity Meter', 'EQ 604', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Critical', TRUE, 'Annual NATA + standard check', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'D.103'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'QA Lab' AND a."name" = 'QC Lab'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Annual NATA + standard check',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'D.103',
  "name" = 'Water Activity Meter',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Moisture Analyser', 'EQ 605', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Critical', TRUE, 'Annual NATA + as-required', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'D.103'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'QA Lab' AND a."name" = 'QC Lab'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Annual NATA + as-required',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'D.103',
  "name" = 'Moisture Analyser',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'X-ray Inspection System', 'EQ 110', 'D220751.09G', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'Cassel Messtechnik GmbH — XRAY SHARK XD28-L1 (Build 10/2022)', 'Critical (CCP)', TRUE, 'Daily verification + Annual OFI service', 'OFI Weigh & Inspection Solutions Pty Ltd', 'Active', '17/06/2026 (commissioning)', '17/06/2027 (annual service)', 'Fully Qualified (OFI 17/06/2026)', 'Commissioned 17/06/2026 by OFI Job JN12503. Validated detection: 2.0mm Fe / Non-Fe / SS. Radiation leakage within safe limits. Replaces retired EQ 106. See CC-2026-001.'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Packaging / Pouch Area'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'Cassel Messtechnik GmbH — XRAY SHARK XD28-L1 (Build 10/2022)',
  "criticality" = 'Critical (CCP)',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Daily verification + Annual OFI service',
  "serviceProvider" = 'OFI Weigh & Inspection Solutions Pty Ltd',
  "status" = 'Active',
  "lastServiceDate" = '17/06/2026 (commissioning)',
  "nextServiceDue" = '17/06/2027 (annual service)',
  "validationStatus" = 'Fully Qualified (OFI 17/06/2026)',
  "comments" = 'Commissioned 17/06/2026 by OFI Job JN12503. Validated detection: 2.0mm Fe / Non-Fe / SS. Radiation leakage within safe limits. Replaces retired EQ 106. See CC-2026-001.',
  "name" = 'X-ray Inspection System',
  "serialNumber" = 'D220751.09G',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Vacuum 2', 'EQ 701', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'Ozito', 'Minor', FALSE, 'Annual', 'Internal', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'NEW per staff'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Blending Room'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'Ozito',
  "criticality" = 'Minor',
  "foodSafetyRisk" = FALSE,
  "ppmFrequency" = 'Annual',
  "serviceProvider" = 'Internal',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'NEW per staff',
  "name" = 'Vacuum 2',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Vacuum', 'EQ 702', '253596-AU', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'Ozito', 'Minor', FALSE, 'Annual', 'Internal', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'NEW per staff'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Capsule Room'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'Ozito',
  "criticality" = 'Minor',
  "foodSafetyRisk" = FALSE,
  "ppmFrequency" = 'Annual',
  "serviceProvider" = 'Internal',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'NEW per staff',
  "name" = 'Vacuum',
  "serialNumber" = '253596-AU',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Dehumidifier', 'EQ 800', '25052798', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'AusClimate', 'Critical', TRUE, 'Quarterly', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'NEW per staff — supports C.118 RH control'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Blending Room'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'AusClimate',
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'NEW per staff — supports C.118 RH control',
  "name" = 'Dehumidifier',
  "serialNumber" = '25052798',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Vernier Caliper 1', 'EQ 801', 'N/A', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Critical', TRUE, 'Annual NATA', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', '🟡 NEW per staff — capsule dimension verify; D.103 — schedule NATA cal'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Capsule Room'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Annual NATA',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = '🟡 NEW per staff — capsule dimension verify; D.103 — schedule NATA cal',
  "name" = 'Vernier Caliper 1',
  "serialNumber" = 'N/A',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'HVAC — Production Zones', 'EQ 802', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Critical', TRUE, 'Quarterly', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'Renumbered from EQ 800 (conflict with Dehumidifier)'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Facility' AND a."name" = 'Utility Area'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'Renumbered from EQ 800 (conflict with Dehumidifier)',
  "name" = 'HVAC — Production Zones',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Compressed Air System', 'EQ 803', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Major', TRUE, 'Annual', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'Renumbered from EQ 801; food-grade lube verification'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Facility' AND a."name" = 'Utility Area'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Major',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Annual',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'Renumbered from EQ 801; food-grade lube verification',
  "name" = 'Compressed Air System',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Water System (potable)', 'EQ 804', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Critical', TRUE, 'Annual', 'Contractor', 'Active', NULL, NULL, 'Legacy (baseline qual per HI-VMP-001)', 'Per C.114 once built'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Facility' AND a."name" = 'Utility Area'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Annual',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = 'Legacy (baseline qual per HI-VMP-001)',
  "comments" = 'Per C.114 once built',
  "name" = 'Water System (potable)',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Datalogger — Capsule Room (T/RH)', 'EQ 805', 'TBC', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Critical', TRUE, 'Annual NATA', 'Contractor', 'Active', NULL, NULL, NULL, 'C.118 / D.103 — Hendrik to confirm serial'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Capsule Room'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Annual NATA',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = NULL,
  "comments" = 'C.118 / D.103 — Hendrik to confirm serial',
  "name" = 'Datalogger — Capsule Room (T/RH)',
  "serialNumber" = 'TBC',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Datalogger — Mixing & Blending (T/RH)', 'EQ 806', 'TBC', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Critical', TRUE, 'Annual NATA', 'Contractor', 'Active', NULL, NULL, NULL, 'C.118 / D.103 — Hendrik to confirm serial'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Blending Room'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Annual NATA',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = NULL,
  "comments" = 'C.118 / D.103 — Hendrik to confirm serial',
  "name" = 'Datalogger — Mixing & Blending (T/RH)',
  "serialNumber" = 'TBC',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Datalogger — Gummy Drying (T/RH)', 'EQ 807', 'TBC', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Critical', TRUE, 'Annual NATA', 'Contractor', 'Active', NULL, NULL, NULL, 'C.118 / D.103 — Hendrik to confirm serial'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Gummy Production'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Annual NATA',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = NULL,
  "comments" = 'C.118 / D.103 — Hendrik to confirm serial',
  "name" = 'Datalogger — Gummy Drying (T/RH)',
  "serialNumber" = 'TBC',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Datalogger — FG Warehouse (T/RH)', 'EQ 808', 'TBC', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Critical', TRUE, 'Annual NATA', 'Contractor', 'Active', NULL, NULL, NULL, 'C.118 / D.103 — Hendrik to confirm serial'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Warehouse' AND a."name" = 'Finished Goods'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Annual NATA',
  "serviceProvider" = 'Contractor',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = NULL,
  "comments" = 'C.118 / D.103 — Hendrik to confirm serial',
  "name" = 'Datalogger — FG Warehouse (T/RH)',
  "serialNumber" = 'TBC',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Pallet Jack 1', 'EQ 900', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Minor', FALSE, 'Annual', 'Internal', 'Active', NULL, NULL, NULL, NULL
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Warehouse' AND a."name" = 'Raw Material Storage'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Minor',
  "foodSafetyRisk" = FALSE,
  "ppmFrequency" = 'Annual',
  "serviceProvider" = 'Internal',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = NULL,
  "comments" = NULL,
  "name" = 'Pallet Jack 1',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Pallet Jack 2', 'EQ 901', NULL, FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, NULL, 'Minor', FALSE, 'Annual', 'Internal', 'Active', NULL, NULL, NULL, NULL
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Warehouse' AND a."name" = 'Raw Material Storage'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = NULL,
  "criticality" = 'Minor',
  "foodSafetyRisk" = FALSE,
  "ppmFrequency" = 'Annual',
  "serviceProvider" = 'Internal',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = NULL,
  "comments" = NULL,
  "name" = 'Pallet Jack 2',
  "serialNumber" = NULL,
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Pouch Machine SF8-200R', 'EQ 107B', 'TBC', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'SF8-200R', 'Critical', TRUE, 'Quarterly', 'Contractor — BevTech / Gentek Electrical', 'Active', '2026-03-11', '2026-06-11 (Q)', NULL, 'Safety hazard report received 18/02/2026 from BevTech; electrical remediation by Gentek Job #730 (Mar 2026)'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Production' AND a."name" = 'Packaging / Pouch Area'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'SF8-200R',
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Quarterly',
  "serviceProvider" = 'Contractor — BevTech / Gentek Electrical',
  "status" = 'Active',
  "lastServiceDate" = '2026-03-11',
  "nextServiceDue" = '2026-06-11 (Q)',
  "validationStatus" = NULL,
  "comments" = 'Safety hazard report received 18/02/2026 from BevTech; electrical remediation by Gentek Job #730 (Mar 2026)',
  "name" = 'Pouch Machine SF8-200R',
  "serialNumber" = 'TBC',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Thermal Oil Boiler', 'EQ 108B', 'TBC', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'TBC', 'Critical', TRUE, 'Annual + reactive', 'Contractor — Energy and Heating Solutions', 'Active', 'TBC', 'TBC', NULL, 'Oil heater reignition settings; RCM certification required'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'Facility' AND a."name" = 'Utility Area'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'TBC',
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Annual + reactive',
  "serviceProvider" = 'Contractor — Energy and Heating Solutions',
  "status" = 'Active',
  "lastServiceDate" = 'TBC',
  "nextServiceDue" = 'TBC',
  "validationStatus" = NULL,
  "comments" = 'Oil heater reignition settings; RCM certification required',
  "name" = 'Thermal Oil Boiler',
  "serialNumber" = 'TBC',
  "archived" = FALSE;

INSERT INTO "Equipment" ("id", "areaId", "name", "code", "serialNumber", "archived", "qrToken", "updatedAt", "manufacturerModel", "criticality", "foodSafetyRisk", "ppmFrequency", "serviceProvider", "status", "lastServiceDate", "nextServiceDue", "validationStatus", "comments")
SELECT gen_random_uuid()::text, a."id", 'Hygiena SystemSURE Plus — ATP luminometer', 'EQ 606', 'TBC', FALSE, gen_random_uuid()::text, CURRENT_TIMESTAMP, 'Hygiena SystemSURE Plus', 'Critical', TRUE, 'Annual mfr verification + per-use control check', 'Internal + Manufacturer', 'Active', NULL, NULL, NULL, 'Cleaning verification per C.103; calibration per D.103'
FROM "Area" a JOIN "Section" s ON s."id" = a."sectionId"
WHERE s."name" = 'QA Lab' AND a."name" = 'QC Lab'
ON CONFLICT ("areaId", "code") DO UPDATE SET
  "manufacturerModel" = 'Hygiena SystemSURE Plus',
  "criticality" = 'Critical',
  "foodSafetyRisk" = TRUE,
  "ppmFrequency" = 'Annual mfr verification + per-use control check',
  "serviceProvider" = 'Internal + Manufacturer',
  "status" = 'Active',
  "lastServiceDate" = NULL,
  "nextServiceDue" = NULL,
  "validationStatus" = NULL,
  "comments" = 'Cleaning verification per C.103; calibration per D.103',
  "name" = 'Hygiena SystemSURE Plus — ATP luminometer',
  "serialNumber" = 'TBC',
  "archived" = FALSE;
