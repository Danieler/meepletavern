-- Link candidates to the game they create so import flows can jump straight to the right ficha.
ALTER TABLE "GameCandidate"
ADD COLUMN "gameId" TEXT;

ALTER TABLE "GameCandidate"
ADD CONSTRAINT "GameCandidate_gameId_fkey"
FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "GameCandidate_gameId_idx" ON "GameCandidate"("gameId");

-- Best-effort backfill for already imported candidates.
UPDATE "GameCandidate" candidate
SET "gameId" = game.id
FROM "Game" game
WHERE candidate."gameId" IS NULL
  AND candidate."sourceUrl" = game."buyUrl";
