-- Free bartender: drink details on Drink, plus the catalog, serve sizes and AI parse cache.

-- AlterTable
ALTER TABLE "Drink" ADD COLUMN "name" TEXT;
ALTER TABLE "Drink" ADD COLUMN "volumeMl" REAL;
ALTER TABLE "Drink" ADD COLUMN "abv" REAL;
ALTER TABLE "Drink" ADD COLUMN "count" REAL;
ALTER TABLE "Drink" ADD COLUMN "source" TEXT;
ALTER TABLE "Drink" ADD COLUMN "confidence" REAL;
ALTER TABLE "Drink" ADD COLUMN "rawText" TEXT;

-- CreateIndex
CREATE INDEX "Drink_tabId_idx" ON "Drink"("tabId");

-- CreateTable
CREATE TABLE "DrinkCatalog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "category" TEXT NOT NULL,
    "abv" REAL NOT NULL,
    "serveMl" REAL NOT NULL,
    "aliases" TEXT NOT NULL,
    "isMixer" BOOLEAN NOT NULL DEFAULT false,
    "sourceUrl" TEXT
);

-- CreateTable
CREATE TABLE "ServeSize" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "volumeMl" REAL NOT NULL,
    "categoryMl" TEXT,
    "impliesCategory" TEXT,
    "aliases" TEXT NOT NULL,
    "sourceUrl" TEXT
);

-- CreateTable
CREATE TABLE "ParseCache" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL,
    "items" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
