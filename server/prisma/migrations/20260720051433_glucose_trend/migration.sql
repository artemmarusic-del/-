-- CreateEnum
CREATE TYPE "GlucoseTrend" AS ENUM ('UP', 'SLOW_UP', 'FLAT', 'SLOW_DOWN', 'DOWN');

-- AlterTable
ALTER TABLE "GlucoseReading" ADD COLUMN     "trend" "GlucoseTrend";
