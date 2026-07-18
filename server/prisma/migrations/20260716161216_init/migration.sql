-- CreateEnum
CREATE TYPE "DiabetesType" AS ENUM ('TYPE_1', 'TYPE_2', 'GESTATIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "TimeSegment" AS ENUM ('MORNING', 'DAY', 'EVENING', 'NIGHT');

-- CreateEnum
CREATE TYPE "GlucoseContext" AS ENUM ('FASTING', 'BEFORE_MEAL', 'AFTER_MEAL', 'BEDTIME', 'NIGHT', 'RANDOM');

-- CreateEnum
CREATE TYPE "InsulinType" AS ENUM ('BOLUS_MEAL', 'BOLUS_CORRECTION', 'BASAL');

-- CreateEnum
CREATE TYPE "AdjustmentField" AS ENUM ('UNITS_PER_XE', 'CORRECTION_FACTOR');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'AUTO_APPLIED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "diabetesType" "DiabetesType" NOT NULL DEFAULT 'TYPE_1',
    "weightKg" DOUBLE PRECISION,
    "birthYear" INTEGER,
    "targetGlucoseMin" DOUBLE PRECISION NOT NULL DEFAULT 4.4,
    "targetGlucoseMax" DOUBLE PRECISION NOT NULL DEFAULT 7.8,
    "xeGramsPerUnit" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "doseStepUnits" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "insulinActionHours" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "unitsPerXeMorning" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "unitsPerXeDay" DOUBLE PRECISION NOT NULL DEFAULT 1.2,
    "unitsPerXeEvening" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "unitsPerXeNight" DOUBLE PRECISION NOT NULL DEFAULT 1.2,
    "correctionFactorMorning" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "correctionFactorDay" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "correctionFactorEvening" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "correctionFactorNight" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "basalDoseUnits" DOUBLE PRECISION,
    "autoApplyAdaptation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Другое',
    "kcal100" DOUBLE PRECISION NOT NULL,
    "protein100" DOUBLE PRECISION NOT NULL,
    "fat100" DOUBLE PRECISION NOT NULL,
    "carbs100" DOUBLE PRECISION NOT NULL,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoodItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eatenAt" TIMESTAMP(3) NOT NULL,
    "timeSegment" "TimeSegment" NOT NULL,
    "note" TEXT,
    "totalCarbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalXe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalKcal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalProtein" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalFat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealItem" (
    "id" TEXT NOT NULL,
    "mealEntryId" TEXT NOT NULL,
    "foodItemId" TEXT,
    "foodName" TEXT NOT NULL,
    "grams" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "kcal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "MealItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlucoseReading" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "context" "GlucoseContext" NOT NULL DEFAULT 'RANDOM',
    "mealEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlucoseReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsulinDose" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "givenAt" TIMESTAMP(3) NOT NULL,
    "type" "InsulinType" NOT NULL,
    "units" DOUBLE PRECISION NOT NULL,
    "calculatedUnits" DOUBLE PRECISION,
    "overrideReason" TEXT,
    "mealEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsulinDose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoefficientAdjustment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timeSegment" "TimeSegment" NOT NULL,
    "field" "AdjustmentField" NOT NULL,
    "oldValue" DOUBLE PRECISION NOT NULL,
    "newValue" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "CoefficientAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "FoodItem_name_idx" ON "FoodItem"("name");

-- CreateIndex
CREATE INDEX "MealEntry_userId_eatenAt_idx" ON "MealEntry"("userId", "eatenAt");

-- CreateIndex
CREATE INDEX "GlucoseReading_userId_measuredAt_idx" ON "GlucoseReading"("userId", "measuredAt");

-- CreateIndex
CREATE INDEX "InsulinDose_userId_givenAt_idx" ON "InsulinDose"("userId", "givenAt");

-- CreateIndex
CREATE INDEX "CoefficientAdjustment_userId_status_idx" ON "CoefficientAdjustment"("userId", "status");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodItem" ADD CONSTRAINT "FoodItem_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealEntry" ADD CONSTRAINT "MealEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealItem" ADD CONSTRAINT "MealItem_mealEntryId_fkey" FOREIGN KEY ("mealEntryId") REFERENCES "MealEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealItem" ADD CONSTRAINT "MealItem_foodItemId_fkey" FOREIGN KEY ("foodItemId") REFERENCES "FoodItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlucoseReading" ADD CONSTRAINT "GlucoseReading_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlucoseReading" ADD CONSTRAINT "GlucoseReading_mealEntryId_fkey" FOREIGN KEY ("mealEntryId") REFERENCES "MealEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsulinDose" ADD CONSTRAINT "InsulinDose_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsulinDose" ADD CONSTRAINT "InsulinDose_mealEntryId_fkey" FOREIGN KEY ("mealEntryId") REFERENCES "MealEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoefficientAdjustment" ADD CONSTRAINT "CoefficientAdjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
