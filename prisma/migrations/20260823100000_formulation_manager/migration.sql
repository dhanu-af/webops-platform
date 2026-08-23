-- CreateTable
CREATE TABLE "FormulationFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormulationFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Formulation" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "baseBatchSize" DOUBLE PRECISION NOT NULL,
    "baseUnit" TEXT NOT NULL DEFAULT 'kg',
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Formulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormulationIngredient" (
    "id" TEXT NOT NULL,
    "formulationId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "rmNumber" TEXT,
    "ingredientName" TEXT NOT NULL,
    "uin" TEXT,
    "baseQty" DOUBLE PRECISION NOT NULL,
    "tolerancePct" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "controlStatus" TEXT,
    "changeControlRef" TEXT,
    "approvedBy" TEXT,
    "comments" TEXT,

    CONSTRAINT "FormulationIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verificationSource" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "tgaStatus" TEXT,
    "apvmaStatus" TEXT,
    "fdaStatus" TEXT,
    "emaStatus" TEXT,
    "aicisStatus" TEXT,
    "regulatoryStatus" TEXT,
    "safetyNotes" TEXT,
    "ghsClassification" TEXT,
    "signalWord" TEXT,
    "ppe" TEXT,
    "handlingPrecautions" TEXT,
    "qcIdentity" TEXT,
    "qcAssay" TEXT,
    "qcMoisture" TEXT,
    "qcHeavyMetals" TEXT,
    "qcMicrobialLimits" TEXT,
    "appearance" TEXT,
    "colour" TEXT,
    "odour" TEXT,
    "solubility" TEXT,
    "density" TEXT,
    "meltingPoint" TEXT,
    "phValue" TEXT,
    "casNumber" TEXT,
    "molecularFormula" TEXT,
    "molecularWeight" TEXT,
    "chemicalName" TEXT,
    "synonyms" TEXT,
    "mainBenefit" TEXT,
    "usedFor" TEXT,
    "typicalDosage" TEXT,
    "storageConditions" TEXT,
    "shelfLife" TEXT,
    "faq" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FormulationFolder_name_key" ON "FormulationFolder"("name");

CREATE INDEX "Formulation_folderId_idx" ON "Formulation"("folderId");

CREATE INDEX "FormulationIngredient_formulationId_idx" ON "FormulationIngredient"("formulationId");

CREATE UNIQUE INDEX "Ingredient_name_key" ON "Ingredient"("name");
CREATE INDEX "Ingredient_category_idx" ON "Ingredient"("category");

-- AddForeignKey
ALTER TABLE "Formulation" ADD CONSTRAINT "Formulation_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "FormulationFolder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Formulation" ADD CONSTRAINT "Formulation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FormulationIngredient" ADD CONSTRAINT "FormulationIngredient_formulationId_fkey" FOREIGN KEY ("formulationId") REFERENCES "Formulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
