CREATE TABLE "UserGamePlayCount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserGamePlayCount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserGamePlayCount_count_check" CHECK ("count" >= 0),
  CONSTRAINT "UserGamePlayCount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserGamePlayCount_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "UserGamePlayCount_userId_gameId_key" ON "UserGamePlayCount"("userId", "gameId");
CREATE INDEX "UserGamePlayCount_userId_idx" ON "UserGamePlayCount"("userId");
CREATE INDEX "UserGamePlayCount_gameId_idx" ON "UserGamePlayCount"("gameId");
