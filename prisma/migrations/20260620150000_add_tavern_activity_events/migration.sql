CREATE TYPE "ActivityEventType" AS ENUM (
  'COLLECTION_ADDED',
  'WANT_TO_PLAY',
  'PLAYED',
  'RATED',
  'COMMENTED',
  'GAME_TRENDING',
  'WEEKLY_SUMMARY'
);

CREATE TYPE "ActivityEventVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

CREATE TABLE "ActivityEvent" (
  "id" TEXT NOT NULL,
  "type" "ActivityEventType" NOT NULL,
  "actorUserId" TEXT,
  "actorNameSnapshot" TEXT,
  "actorUsernameSnapshot" TEXT,
  "actorAvatarUrlSnapshot" TEXT,
  "gameId" TEXT,
  "gameTitleSnapshot" TEXT,
  "gameSlugSnapshot" TEXT,
  "rating" INTEGER,
  "commentSnippet" TEXT,
  "metadata" JSONB,
  "visibility" "ActivityEventVisibility" NOT NULL DEFAULT 'PUBLIC',
  "dedupeKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActivityEvent_dedupeKey_key" ON "ActivityEvent"("dedupeKey");
CREATE INDEX "ActivityEvent_createdAt_idx" ON "ActivityEvent"("createdAt" DESC);
CREATE INDEX "ActivityEvent_visibility_createdAt_idx" ON "ActivityEvent"("visibility", "createdAt" DESC);
CREATE INDEX "ActivityEvent_type_createdAt_idx" ON "ActivityEvent"("type", "createdAt" DESC);
CREATE INDEX "ActivityEvent_actorUserId_createdAt_idx" ON "ActivityEvent"("actorUserId", "createdAt" DESC);
CREATE INDEX "ActivityEvent_gameId_createdAt_idx" ON "ActivityEvent"("gameId", "createdAt" DESC);

ALTER TABLE "ActivityEvent"
  ADD CONSTRAINT "ActivityEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ActivityEvent"
  ADD CONSTRAINT "ActivityEvent_gameId_fkey"
  FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
