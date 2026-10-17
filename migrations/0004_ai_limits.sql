-- Bartender limits: Workers AI spending counters, and an index so expired parse-cache rows can be pruned.

-- CreateTable
CREATE TABLE "AiUsage" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" INTEGER NOT NULL
);

-- CreateIndex
CREATE INDEX "AiUsage_expiresAt_idx" ON "AiUsage"("expiresAt");

-- CreateIndex
CREATE INDEX "ParseCache_createdAt_idx" ON "ParseCache"("createdAt");

-- Drop cached parses stored before the cache rules (long free text could hold personal details).
DELETE FROM "ParseCache" WHERE length("key") > 48;
