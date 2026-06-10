-- Add structured ratings storage for external and future user scores.
ALTER TABLE "Game"
ADD COLUMN "ratings" JSONB NOT NULL DEFAULT '{}'::jsonb;
