-- Offline adds: a phone with no signal queues drinks and replays them later, maybe more than once.
-- clientId is the id the phone gave the drink, so a replay finds the saved row instead of adding a
-- second drink.
ALTER TABLE "Drink" ADD COLUMN "clientId" TEXT;
CREATE UNIQUE INDEX "Drink_clientId_key" ON "Drink"("clientId");

-- One open session per user, so queued drinks replayed in a burst all land in the same session.
-- Close any extra open sessions first (keep each user's newest); finishedAt reuses createdAt so the
-- stored date format matches whatever Prisma wrote.
UPDATE "Tab" SET "finishedAt" = "createdAt"
WHERE "finishedAt" IS NULL
  AND "id" NOT IN (
    SELECT (SELECT t2."id" FROM "Tab" t2
            WHERE t2."userId" = t1."userId" AND t2."finishedAt" IS NULL
            ORDER BY t2."createdAt" DESC, t2."id" DESC LIMIT 1)
    FROM "Tab" t1 WHERE t1."finishedAt" IS NULL GROUP BY t1."userId"
  );
CREATE UNIQUE INDEX "Tab_one_open_per_user" ON "Tab"("userId") WHERE "finishedAt" IS NULL;
