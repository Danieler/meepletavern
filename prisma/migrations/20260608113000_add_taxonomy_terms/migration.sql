-- CreateEnum
CREATE TYPE "TaxonomyType" AS ENUM ('category', 'mechanic', 'theme');

-- CreateTable
CREATE TABLE "TaxonomyTerm" (
    "id" TEXT NOT NULL,
    "type" "TaxonomyType" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxonomyTerm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaxonomyTerm_type_slug_key" ON "TaxonomyTerm"("type", "slug");

-- CreateIndex
CREATE INDEX "TaxonomyTerm_type_idx" ON "TaxonomyTerm"("type");

-- Backfill existing terms from games so current databases keep their public filters.
WITH terms AS (
    SELECT 'category'::"TaxonomyType" AS "type", unnest("categories") AS "name" FROM "Game"
    UNION
    SELECT 'mechanic'::"TaxonomyType" AS "type", unnest("mechanics") AS "name" FROM "Game"
    UNION
    SELECT 'theme'::"TaxonomyType" AS "type", unnest("themes") AS "name" FROM "Game"
),
clean_terms AS (
    SELECT DISTINCT
      "type",
      trim("name") AS "name"
    FROM terms
    WHERE trim("name") <> ''
)
INSERT INTO "TaxonomyTerm" ("id", "type", "name", "slug", "createdAt", "updatedAt")
SELECT
    'tax_' || md5("type"::text || ':' || "name"),
    "type",
    "name",
    lower(trim(both '-' from regexp_replace(translate(lower("name"), 'áàäâãåéèëêíìïîóòöôõúùüûñç', 'aaaaaaeeeeiiiiooooouuuunc'), '[^a-z0-9]+', '-', 'g'))),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM clean_terms
ON CONFLICT ("type", "slug") DO NOTHING;
