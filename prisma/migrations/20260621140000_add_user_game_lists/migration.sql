CREATE TYPE "GameListVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "GameSuggestionStatus" AS ENUM ('PENDING', 'REVIEWED', 'IMPORTED', 'REJECTED');

ALTER TYPE "ActivityEventType" ADD VALUE 'LIST_CREATED';
ALTER TYPE "ActivityEventType" ADD VALUE 'LIST_GAME_ADDED';

ALTER TABLE "ActivityEvent"
  ADD COLUMN "listTitleSnapshot" TEXT,
  ADD COLUMN "listSlugSnapshot" TEXT;

CREATE TABLE "GameList" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "visibility" "GameListVisibility" NOT NULL DEFAULT 'PRIVATE',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GameList_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GameListItem" (
  "id" TEXT NOT NULL,
  "listId" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "GameListItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GameSuggestion" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "url" TEXT,
  "notes" TEXT,
  "status" "GameSuggestionStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GameSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GameList_userId_slug_key" ON "GameList"("userId", "slug");
CREATE UNIQUE INDEX "GameList_one_default_per_user_idx" ON "GameList"("userId") WHERE "isDefault" = true;
CREATE INDEX "GameList_userId_updatedAt_idx" ON "GameList"("userId", "updatedAt" DESC);
CREATE INDEX "GameList_visibility_updatedAt_idx" ON "GameList"("visibility", "updatedAt" DESC);

CREATE UNIQUE INDEX "GameListItem_listId_gameId_key" ON "GameListItem"("listId", "gameId");
CREATE INDEX "GameListItem_listId_addedAt_id_idx" ON "GameListItem"("listId", "addedAt" DESC, "id" DESC);
CREATE INDEX "GameListItem_gameId_idx" ON "GameListItem"("gameId");

CREATE UNIQUE INDEX "GameSuggestion_userId_normalizedName_key" ON "GameSuggestion"("userId", "normalizedName");
CREATE INDEX "GameSuggestion_userId_createdAt_idx" ON "GameSuggestion"("userId", "createdAt" DESC);
CREATE INDEX "GameSuggestion_status_createdAt_idx" ON "GameSuggestion"("status", "createdAt");

CREATE INDEX "Game_name_trgm_idx" ON "Game" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "Game_title_trgm_idx" ON "Game" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "ActivityEvent_listTitleSnapshot_trgm_idx"
  ON "ActivityEvent" USING GIN ("listTitleSnapshot" gin_trgm_ops);

ALTER TABLE "GameList"
  ADD CONSTRAINT "GameList_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GameListItem"
  ADD CONSTRAINT "GameListItem_listId_fkey"
  FOREIGN KEY ("listId") REFERENCES "GameList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameListItem"
  ADD CONSTRAINT "GameListItem_gameId_fkey"
  FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GameSuggestion"
  ADD CONSTRAINT "GameSuggestion_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
