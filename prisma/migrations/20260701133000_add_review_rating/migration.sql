ALTER TABLE "Review" ADD COLUMN "rating" DOUBLE PRECISION;

UPDATE "Review"
SET "rating" = GREATEST(
  1,
  LEAST(
    10,
    COALESCE(
      NULLIF("Game"."ratings" #>> '{combined,score}', '')::DOUBLE PRECISION,
      NULLIF("Game"."ratings" #>> '{external,score}', '')::DOUBLE PRECISION,
      NULLIF("Game"."ratings" #>> '{users,averageScore}', '')::DOUBLE PRECISION,
      8.0
    )
  )
)
FROM "Game"
WHERE "Review"."gameId" = "Game"."id";

ALTER TABLE "Review" ALTER COLUMN "rating" SET NOT NULL;
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_check" CHECK ("rating" >= 1 AND "rating" <= 10);
