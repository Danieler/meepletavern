-- CreateTable
CREATE TABLE "UserLibraryGame" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLibraryGame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserLibraryGame_userId_gameId_key" ON "UserLibraryGame"("userId", "gameId");

-- CreateIndex
CREATE INDEX "UserLibraryGame_userId_createdAt_idx" ON "UserLibraryGame"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserLibraryGame_gameId_idx" ON "UserLibraryGame"("gameId");

-- AddForeignKey
ALTER TABLE "UserLibraryGame" ADD CONSTRAINT "UserLibraryGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLibraryGame" ADD CONSTRAINT "UserLibraryGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
