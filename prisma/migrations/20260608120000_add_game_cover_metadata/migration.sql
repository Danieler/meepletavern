-- CreateEnum
CREATE TYPE "GameImageStatus" AS ENUM ('verified', 'missing', 'placeholder', 'needs_review');

-- AlterTable
ALTER TABLE "Game"
ADD COLUMN "coverImageUrl" TEXT,
ADD COLUMN "coverImageAlt" TEXT NOT NULL DEFAULT '',
ADD COLUMN "imageSourceName" TEXT,
ADD COLUMN "imageSourceUrl" TEXT,
ADD COLUMN "imageLicenseNote" TEXT,
ADD COLUMN "imageStatus" "GameImageStatus" NOT NULL DEFAULT 'missing';

-- Existing imageUrl values were generic/editorial placeholders, not verified game covers.
-- Keep them as legacy data only and force the public UI to use the new reviewed fields.
UPDATE "Game"
SET
  "coverImageUrl" = NULL,
  "coverImageAlt" = 'Portada de ' || "name",
  "imageSourceName" = NULL,
  "imageSourceUrl" = NULL,
  "imageLicenseNote" = NULL,
  "imageStatus" = CASE
    WHEN "imageUrl" IS NULL OR trim("imageUrl") = '' THEN 'missing'::"GameImageStatus"
    ELSE 'needs_review'::"GameImageStatus"
  END;
