CREATE TABLE "GameComment" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameComment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GameComment_userId_gameId_key" ON "GameComment"("userId", "gameId");
CREATE INDEX "GameComment_gameId_updatedAt_idx" ON "GameComment"("gameId", "updatedAt");
CREATE INDEX "GameComment_userId_updatedAt_idx" ON "GameComment"("userId", "updatedAt");

ALTER TABLE "GameComment"
ADD CONSTRAINT "GameComment_gameId_fkey"
FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GameComment"
ADD CONSTRAINT "GameComment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
