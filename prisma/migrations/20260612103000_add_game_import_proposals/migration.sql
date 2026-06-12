CREATE TYPE "GameImportProposalStatus" AS ENUM ('pending', 'applied', 'rejected');

CREATE TABLE "GameImportProposal" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "GameImportProposalStatus" NOT NULL DEFAULT 'pending',
    "query" TEXT NOT NULL,
    "rawSearchResults" JSONB NOT NULL,
    "extractedFields" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameImportProposal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GameImportProposal_gameId_status_idx" ON "GameImportProposal"("gameId", "status");
CREATE INDEX "GameImportProposal_createdAt_idx" ON "GameImportProposal"("createdAt");

ALTER TABLE "GameImportProposal"
ADD CONSTRAINT "GameImportProposal_gameId_fkey"
FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
