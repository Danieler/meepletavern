CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "UserProfile_profileVisibility_updatedAt_id_idx"
  ON "UserProfile"("profileVisibility", "updatedAt" DESC, "id" DESC);
CREATE INDEX "UserProfile_username_trgm_idx"
  ON "UserProfile" USING GIN ("username" gin_trgm_ops);
CREATE INDEX "UserProfile_displayName_trgm_idx"
  ON "UserProfile" USING GIN ("displayName" gin_trgm_ops);

CREATE INDEX "ActivityEvent_visibility_createdAt_id_idx"
  ON "ActivityEvent"("visibility", "createdAt" DESC, "id" DESC);
CREATE INDEX "ActivityEvent_actorNameSnapshot_trgm_idx"
  ON "ActivityEvent" USING GIN ("actorNameSnapshot" gin_trgm_ops);
CREATE INDEX "ActivityEvent_actorUsernameSnapshot_trgm_idx"
  ON "ActivityEvent" USING GIN ("actorUsernameSnapshot" gin_trgm_ops);
CREATE INDEX "ActivityEvent_gameTitleSnapshot_trgm_idx"
  ON "ActivityEvent" USING GIN ("gameTitleSnapshot" gin_trgm_ops);
