-- Private user-created taverns. These tables are server-only, like the other
-- account-owned tables in this project.

CREATE TYPE "TavernMemberRole" AS ENUM ('ADMIN', 'MEMBER');
CREATE TYPE "TavernInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED');

CREATE TABLE "TavernGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TavernGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TavernGroupMember" (
    "id" TEXT NOT NULL,
    "tavernId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TavernMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TavernGroupMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TavernGroupInvitation" (
    "id" TEXT NOT NULL,
    "tavernId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "invitedByUserId" TEXT,
    "status" "TavernInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TavernGroupInvitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TavernGroupPlay" (
    "id" TEXT NOT NULL,
    "tavernId" TEXT NOT NULL,
    "gameId" TEXT,
    "gameTitleSnapshot" TEXT NOT NULL,
    "gameSlugSnapshot" TEXT,
    "recordedByUserId" TEXT,
    "playedAt" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TavernGroupPlay_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TavernGroupPlayParticipant" (
    "id" TEXT NOT NULL,
    "playId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TavernGroupPlayParticipant_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TavernGroup_createdByUserId_createdAt_idx" ON "TavernGroup"("createdByUserId", "createdAt" DESC);
CREATE INDEX "TavernGroup_updatedAt_id_idx" ON "TavernGroup"("updatedAt" DESC, "id" DESC);
CREATE UNIQUE INDEX "TavernGroupMember_tavernId_userId_key" ON "TavernGroupMember"("tavernId", "userId");
CREATE INDEX "TavernGroupMember_userId_joinedAt_idx" ON "TavernGroupMember"("userId", "joinedAt" DESC);
CREATE INDEX "TavernGroupMember_tavernId_role_idx" ON "TavernGroupMember"("tavernId", "role");
CREATE INDEX "TavernGroupInvitation_targetUserId_status_createdAt_idx" ON "TavernGroupInvitation"("targetUserId", "status", "createdAt" DESC);
CREATE INDEX "TavernGroupInvitation_tavernId_status_createdAt_idx" ON "TavernGroupInvitation"("tavernId", "status", "createdAt" DESC);
CREATE UNIQUE INDEX "TavernGroupInvitation_pending_target_key"
  ON "TavernGroupInvitation"("tavernId", "targetUserId")
  WHERE "status" = 'PENDING';
CREATE INDEX "TavernGroupPlay_tavernId_gameId_playedAt_id_idx" ON "TavernGroupPlay"("tavernId", "gameId", "playedAt" DESC, "id" DESC);
CREATE INDEX "TavernGroupPlay_tavernId_playedAt_id_idx" ON "TavernGroupPlay"("tavernId", "playedAt" DESC, "id" DESC);
CREATE INDEX "TavernGroupPlay_recordedByUserId_createdAt_idx" ON "TavernGroupPlay"("recordedByUserId", "createdAt" DESC);
CREATE UNIQUE INDEX "TavernGroupPlayParticipant_playId_userId_key" ON "TavernGroupPlayParticipant"("playId", "userId");
CREATE INDEX "TavernGroupPlayParticipant_userId_idx" ON "TavernGroupPlayParticipant"("userId");

ALTER TABLE "TavernGroup" ADD CONSTRAINT "TavernGroup_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TavernGroupMember" ADD CONSTRAINT "TavernGroupMember_tavernId_fkey" FOREIGN KEY ("tavernId") REFERENCES "TavernGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TavernGroupMember" ADD CONSTRAINT "TavernGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TavernGroupInvitation" ADD CONSTRAINT "TavernGroupInvitation_tavernId_fkey" FOREIGN KEY ("tavernId") REFERENCES "TavernGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TavernGroupInvitation" ADD CONSTRAINT "TavernGroupInvitation_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TavernGroupInvitation" ADD CONSTRAINT "TavernGroupInvitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TavernGroupPlay" ADD CONSTRAINT "TavernGroupPlay_tavernId_fkey" FOREIGN KEY ("tavernId") REFERENCES "TavernGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TavernGroupPlay" ADD CONSTRAINT "TavernGroupPlay_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TavernGroupPlay" ADD CONSTRAINT "TavernGroupPlay_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TavernGroupPlayParticipant" ADD CONSTRAINT "TavernGroupPlayParticipant_playId_fkey" FOREIGN KEY ("playId") REFERENCES "TavernGroupPlay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TavernGroupPlayParticipant" ADD CONSTRAINT "TavernGroupPlayParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TavernGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TavernGroupMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TavernGroupInvitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TavernGroupPlay" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TavernGroupPlayParticipant" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "TavernGroup" FROM anon, authenticated;
REVOKE ALL ON TABLE "TavernGroupMember" FROM anon, authenticated;
REVOKE ALL ON TABLE "TavernGroupInvitation" FROM anon, authenticated;
REVOKE ALL ON TABLE "TavernGroupPlay" FROM anon, authenticated;
REVOKE ALL ON TABLE "TavernGroupPlayParticipant" FROM anon, authenticated;
