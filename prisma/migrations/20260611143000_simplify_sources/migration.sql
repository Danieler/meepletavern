ALTER TABLE "Source"
  DROP COLUMN "type",
  DROP COLUMN "status",
  DROP COLUMN "permissions",
  DROP COLUMN "attributionRequired",
  DROP COLUMN "attributionText",
  DROP COLUMN "notes",
  DROP COLUMN "contactEmail",
  DROP COLUMN "permissionProofUrl";

DROP TYPE "SourceType";
DROP TYPE "SourceStatus";
