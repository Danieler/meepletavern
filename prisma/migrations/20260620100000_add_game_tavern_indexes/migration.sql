CREATE INDEX "UserLibraryGame_gameId_owned_idx" ON "UserLibraryGame"("gameId", "owned");
CREATE INDEX "UserLibraryGame_gameId_wantToPlay_idx" ON "UserLibraryGame"("gameId", "wantToPlay");
CREATE INDEX "UserLibraryGame_gameId_played_idx" ON "UserLibraryGame"("gameId", "played");
CREATE INDEX "UserLibraryGame_gameId_updatedAt_idx" ON "UserLibraryGame"("gameId", "updatedAt");
