-- Record when someone confirmed they are of legal drinking age and which terms version they agreed to.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "ageConfirmedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "termsVersion" TEXT;
