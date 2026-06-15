ALTER TABLE "Game"
ADD COLUMN "howToPlayVideos" JSONB NOT NULL DEFAULT '[]'::jsonb;
