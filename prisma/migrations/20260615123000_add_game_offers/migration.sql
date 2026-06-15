CREATE TABLE "GameOffer" (
  "id" TEXT NOT NULL,
  "gameId" TEXT,
  "candidateId" TEXT,
  "sourceId" TEXT,
  "sourceName" TEXT NOT NULL,
  "sourceDisplayName" TEXT,
  "storeName" TEXT,
  "titleAtSource" TEXT,
  "price" DOUBLE PRECISION,
  "currency" TEXT,
  "availability" TEXT,
  "purchaseUrl" TEXT,
  "affiliateUrl" TEXT,
  "sourceUrl" TEXT,
  "externalId" TEXT,
  "rawData" JSONB,
  "fetchedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GameOffer_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GameOffer"
ADD CONSTRAINT "GameOffer_gameId_fkey"
FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GameOffer"
ADD CONSTRAINT "GameOffer_candidateId_fkey"
FOREIGN KEY ("candidateId") REFERENCES "GameCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GameOffer"
ADD CONSTRAINT "GameOffer_sourceId_fkey"
FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "GameOffer_gameId_idx" ON "GameOffer"("gameId");
CREATE INDEX "GameOffer_candidateId_idx" ON "GameOffer"("candidateId");
CREATE INDEX "GameOffer_sourceId_idx" ON "GameOffer"("sourceId");
CREATE INDEX "GameOffer_sourceName_idx" ON "GameOffer"("sourceName");
CREATE INDEX "GameOffer_fetchedAt_idx" ON "GameOffer"("fetchedAt");

CREATE UNIQUE INDEX "GameOffer_gameId_sourceName_sourceUrl_key"
ON "GameOffer"("gameId", "sourceName", "sourceUrl")
WHERE "gameId" IS NOT NULL AND "sourceUrl" IS NOT NULL;

CREATE UNIQUE INDEX "GameOffer_candidateId_sourceName_sourceUrl_key"
ON "GameOffer"("candidateId", "sourceName", "sourceUrl")
WHERE "candidateId" IS NOT NULL AND "sourceUrl" IS NOT NULL;

CREATE UNIQUE INDEX "GameOffer_gameId_sourceName_purchaseUrl_key"
ON "GameOffer"("gameId", "sourceName", "purchaseUrl")
WHERE "gameId" IS NOT NULL AND "sourceUrl" IS NULL AND "purchaseUrl" IS NOT NULL;

CREATE UNIQUE INDEX "GameOffer_candidateId_sourceName_purchaseUrl_key"
ON "GameOffer"("candidateId", "sourceName", "purchaseUrl")
WHERE "candidateId" IS NOT NULL AND "sourceUrl" IS NULL AND "purchaseUrl" IS NOT NULL;
