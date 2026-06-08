-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'draft',
    "imageUrl" TEXT,
    "description" TEXT,
    "review" TEXT,
    "shortSummary" TEXT,
    "pros" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bestFor" TEXT,
    "notFor" TEXT,
    "minPlayers" INTEGER,
    "maxPlayers" INTEGER,
    "playtime" TEXT,
    "age" TEXT,
    "complexity" TEXT,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mechanics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "similarGames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "faqs" JSONB,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "buyUrl" TEXT,
    "sources" JSONB,
    "createdByAi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Game_slug_key" ON "Game"("slug");

-- CreateIndex
CREATE INDEX "Game_status_idx" ON "Game"("status");

-- CreateIndex
CREATE INDEX "Game_createdAt_idx" ON "Game"("createdAt");
