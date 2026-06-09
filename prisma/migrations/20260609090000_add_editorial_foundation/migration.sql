-- Add the editorial ingestion foundation without changing the existing public catalogue reads.

ALTER TYPE "GameStatus" ADD VALUE IF NOT EXISTS 'review';

CREATE TYPE "SourceType" AS ENUM ('publisher', 'distributor', 'shop', 'affiliate_api', 'open_data', 'manual');
CREATE TYPE "SourceStatus" AS ENUM ('not_contacted', 'contacted', 'approved', 'rejected');
CREATE TYPE "GameCandidateStatus" AS ENUM ('pending', 'needs_review', 'approved', 'rejected', 'converted');
CREATE TYPE "EditorialFlag" AS ENUM (
    'possible_duplicate',
    'missing_players',
    'missing_playtime',
    'missing_age',
    'image_not_allowed',
    'low_confidence',
    'needs_permission'
);
CREATE TYPE "MediaAssetType" AS ENUM ('cover', 'box', 'component', 'placeholder');
CREATE TYPE "MediaAssetStatus" AS ENUM ('candidate', 'approved', 'rejected');
CREATE TYPE "MediaAssetUsage" AS ENUM ('public', 'admin_only', 'purchase_only');

ALTER TABLE "Game"
ADD COLUMN "title" TEXT NOT NULL DEFAULT '',
ADD COLUMN "originalTitle" TEXT,
ADD COLUMN "year" INTEGER,
ADD COLUMN "players" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "shortDescription" TEXT,
ADD COLUMN "quickVerdict" TEXT,
ADD COLUMN "minAge" INTEGER,
ADD COLUMN "difficulty" TEXT,
ADD COLUMN "publisher" TEXT,
ADD COLUMN "spanishPublisher" TEXT,
ADD COLUMN "faq" JSONB,
ADD COLUMN "sourceIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "primaryImageId" TEXT,
ADD COLUMN "imageFallbackAccepted" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "status" "SourceStatus" NOT NULL DEFAULT 'not_contacted',
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "attributionRequired" BOOLEAN NOT NULL DEFAULT false,
    "attributionText" TEXT,
    "notes" TEXT,
    "contactEmail" TEXT,
    "permissionProofUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GameCandidate" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "extractedDescription" TEXT,
    "candidateImages" JSONB NOT NULL DEFAULT '[]',
    "aiDraft" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "GameCandidateStatus" NOT NULL DEFAULT 'pending',
    "flags" "EditorialFlag"[] NOT NULL DEFAULT ARRAY[]::"EditorialFlag"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameCandidate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "gameId" TEXT,
    "candidateId" TEXT,
    "sourceId" TEXT,
    "url" TEXT NOT NULL,
    "localPath" TEXT,
    "type" "MediaAssetType" NOT NULL,
    "status" "MediaAssetStatus" NOT NULL DEFAULT 'candidate',
    "usage" "MediaAssetUsage" NOT NULL DEFAULT 'admin_only',
    "attribution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GameCandidate_sourceId_idx" ON "GameCandidate"("sourceId");
CREATE INDEX "GameCandidate_status_idx" ON "GameCandidate"("status");
CREATE INDEX "GameCandidate_createdAt_idx" ON "GameCandidate"("createdAt");

CREATE INDEX "MediaAsset_gameId_idx" ON "MediaAsset"("gameId");
CREATE INDEX "MediaAsset_candidateId_idx" ON "MediaAsset"("candidateId");
CREATE INDEX "MediaAsset_sourceId_idx" ON "MediaAsset"("sourceId");
CREATE INDEX "MediaAsset_status_idx" ON "MediaAsset"("status");
CREATE INDEX "MediaAsset_usage_idx" ON "MediaAsset"("usage");

CREATE INDEX "Source_type_idx" ON "Source"("type");
CREATE INDEX "Source_status_idx" ON "Source"("status");
CREATE INDEX "Source_createdAt_idx" ON "Source"("createdAt");

ALTER TABLE "GameCandidate"
ADD CONSTRAINT "GameCandidate_sourceId_fkey"
FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MediaAsset"
ADD CONSTRAINT "MediaAsset_gameId_fkey"
FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MediaAsset"
ADD CONSTRAINT "MediaAsset_candidateId_fkey"
FOREIGN KEY ("candidateId") REFERENCES "GameCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MediaAsset"
ADD CONSTRAINT "MediaAsset_sourceId_fkey"
FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;
