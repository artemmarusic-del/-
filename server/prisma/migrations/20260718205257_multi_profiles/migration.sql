-- Переход на несколько профилей внутри одного аккаунта.
-- Миграция написана вручную (вместо авто-варианта Prisma), чтобы СОХРАНИТЬ
-- существующие записи: дневник каждого пользователя переносится в его профиль.

-- 1. Profile: имя профиля (берём имя владельца аккаунта), убираем 1:1
ALTER TABLE "Profile" ADD COLUMN "name" TEXT;
UPDATE "Profile" p SET "name" = COALESCE(NULLIF(u."name", ''), 'Основной профиль')
  FROM "User" u WHERE u."id" = p."userId";
UPDATE "Profile" SET "name" = 'Основной профиль' WHERE "name" IS NULL;
ALTER TABLE "Profile" ALTER COLUMN "name" SET NOT NULL;

DROP INDEX "Profile_userId_key";
CREATE INDEX "Profile_userId_idx" ON "Profile"("userId");

-- 2. Дневниковые таблицы: userId -> profileId с переносом данных

-- MealEntry
ALTER TABLE "MealEntry" DROP CONSTRAINT "MealEntry_userId_fkey";
DROP INDEX "MealEntry_userId_eatenAt_idx";
ALTER TABLE "MealEntry" ADD COLUMN "profileId" TEXT;
UPDATE "MealEntry" m SET "profileId" = p."id" FROM "Profile" p WHERE p."userId" = m."userId";
DELETE FROM "MealEntry" WHERE "profileId" IS NULL;
ALTER TABLE "MealEntry" ALTER COLUMN "profileId" SET NOT NULL;
ALTER TABLE "MealEntry" DROP COLUMN "userId";
CREATE INDEX "MealEntry_profileId_eatenAt_idx" ON "MealEntry"("profileId", "eatenAt");
ALTER TABLE "MealEntry" ADD CONSTRAINT "MealEntry_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- GlucoseReading
ALTER TABLE "GlucoseReading" DROP CONSTRAINT "GlucoseReading_userId_fkey";
DROP INDEX "GlucoseReading_userId_measuredAt_idx";
ALTER TABLE "GlucoseReading" ADD COLUMN "profileId" TEXT;
UPDATE "GlucoseReading" g SET "profileId" = p."id" FROM "Profile" p WHERE p."userId" = g."userId";
DELETE FROM "GlucoseReading" WHERE "profileId" IS NULL;
ALTER TABLE "GlucoseReading" ALTER COLUMN "profileId" SET NOT NULL;
ALTER TABLE "GlucoseReading" DROP COLUMN "userId";
CREATE INDEX "GlucoseReading_profileId_measuredAt_idx" ON "GlucoseReading"("profileId", "measuredAt");
ALTER TABLE "GlucoseReading" ADD CONSTRAINT "GlucoseReading_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- InsulinDose
ALTER TABLE "InsulinDose" DROP CONSTRAINT "InsulinDose_userId_fkey";
DROP INDEX "InsulinDose_userId_givenAt_idx";
ALTER TABLE "InsulinDose" ADD COLUMN "profileId" TEXT;
UPDATE "InsulinDose" d SET "profileId" = p."id" FROM "Profile" p WHERE p."userId" = d."userId";
DELETE FROM "InsulinDose" WHERE "profileId" IS NULL;
ALTER TABLE "InsulinDose" ALTER COLUMN "profileId" SET NOT NULL;
ALTER TABLE "InsulinDose" DROP COLUMN "userId";
CREATE INDEX "InsulinDose_profileId_givenAt_idx" ON "InsulinDose"("profileId", "givenAt");
ALTER TABLE "InsulinDose" ADD CONSTRAINT "InsulinDose_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CoefficientAdjustment
ALTER TABLE "CoefficientAdjustment" DROP CONSTRAINT "CoefficientAdjustment_userId_fkey";
DROP INDEX "CoefficientAdjustment_userId_status_idx";
ALTER TABLE "CoefficientAdjustment" ADD COLUMN "profileId" TEXT;
UPDATE "CoefficientAdjustment" c SET "profileId" = p."id" FROM "Profile" p WHERE p."userId" = c."userId";
DELETE FROM "CoefficientAdjustment" WHERE "profileId" IS NULL;
ALTER TABLE "CoefficientAdjustment" ALTER COLUMN "profileId" SET NOT NULL;
ALTER TABLE "CoefficientAdjustment" DROP COLUMN "userId";
CREATE INDEX "CoefficientAdjustment_profileId_status_idx" ON "CoefficientAdjustment"("profileId", "status");
ALTER TABLE "CoefficientAdjustment" ADD CONSTRAINT "CoefficientAdjustment_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
