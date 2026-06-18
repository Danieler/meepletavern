CREATE TABLE "UserGameRating" (
  "userId" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserGameRating_pkey" PRIMARY KEY ("userId","gameId"),
  CONSTRAINT "UserGameRating_score_check" CHECK ("score" >= 1 AND "score" <= 10),
  CONSTRAINT "UserGameRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserGameRating_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "UserGameRating_gameId_updatedAt_idx" ON "UserGameRating"("gameId", "updatedAt");
CREATE INDEX "UserGameRating_userId_updatedAt_idx" ON "UserGameRating"("userId", "updatedAt");
