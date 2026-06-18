import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeGameRatings } from "@/lib/ratings/gameRatings";
import { applyUserRatingsAggregate } from "@/lib/ratings/userRatingVote";

type DbClient = PrismaClient | Prisma.TransactionClient;

type RatingAggregateRow = {
  averageScore: number | string | null;
  votesCount: number;
};

export type UserGameRatingListItem = {
  gameId: string;
  slug: string;
  title: string;
  coverImageUrl: string | null;
  coverImageAlt: string;
  imageStatus: string;
  score: number;
  updatedAt: string;
};

export async function getCurrentUserGameRating(userId: string, gameId: string) {
  const rows = await prisma.$queryRaw<Array<{ score: number }>>`
    SELECT "score"
    FROM "UserGameRating"
    WHERE "userId" = ${userId} AND "gameId" = ${gameId}
    LIMIT 1
  `;

  return rows[0]?.score ?? null;
}

export async function listCurrentUserGameRatings(userId: string): Promise<UserGameRatingListItem[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      gameId: string;
      slug: string;
      title: string;
      coverImageUrl: string | null;
      coverImageAlt: string | null;
      imageStatus: string | null;
      score: number;
      updatedAt: Date;
    }>
  >`
    SELECT
      g."id" AS "gameId",
      g."slug" AS "slug",
      COALESCE(NULLIF(g."title", ''), g."name") AS "title",
      g."coverImageUrl" AS "coverImageUrl",
      g."coverImageAlt" AS "coverImageAlt",
      g."imageStatus"::text AS "imageStatus",
      ugr."score" AS "score",
      ugr."updatedAt" AS "updatedAt"
    FROM "UserGameRating" ugr
    INNER JOIN "Game" g ON g."id" = ugr."gameId"
    WHERE ugr."userId" = ${userId}
    ORDER BY ugr."updatedAt" DESC, g."title" ASC
  `;

  return rows.map((row) => ({
    gameId: row.gameId,
    slug: row.slug,
    title: row.title,
    coverImageUrl: row.coverImageUrl,
    coverImageAlt: row.coverImageAlt || `Imagen de ${row.title}`,
    imageStatus: row.imageStatus || "missing",
    score: row.score,
    updatedAt: row.updatedAt.toISOString()
  }));
}

export async function upsertCurrentUserGameRating(userId: string, gameId: string, score: number) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO "UserGameRating" ("userId", "gameId", "score", "createdAt", "updatedAt")
      VALUES (${userId}, ${gameId}, ${score}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("userId", "gameId")
      DO UPDATE SET "score" = EXCLUDED."score", "updatedAt" = CURRENT_TIMESTAMP
    `;

    const synced = await syncGameRatingsAggregate(tx, gameId);
    return {
      ratings: normalizeGameRatings(synced.ratings),
      slug: synced.slug,
      score
    };
  });
}

export async function deleteCurrentUserGameRating(userId: string, gameId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      DELETE FROM "UserGameRating"
      WHERE "userId" = ${userId} AND "gameId" = ${gameId}
    `;

    const synced = await syncGameRatingsAggregate(tx, gameId);
    return {
      ratings: normalizeGameRatings(synced.ratings),
      slug: synced.slug
    };
  });
}

async function syncGameRatingsAggregate(tx: DbClient, gameId: string) {
  const game = await tx.game.findUnique({
    where: { id: gameId },
    select: { id: true, slug: true, ratings: true }
  });

  if (!game) {
    throw new Error("Ese juego no existe.");
  }

  const [aggregate] = await tx.$queryRaw<RatingAggregateRow[]>(Prisma.sql`
    SELECT
      ROUND(AVG("score")::numeric, 1) AS "averageScore",
      COUNT(*)::int AS "votesCount"
    FROM "UserGameRating"
    WHERE "gameId" = ${gameId}
  `);

  const nextRatings = applyUserRatingsAggregate(game.ratings, {
    votesCount: Number(aggregate?.votesCount || 0),
    averageScore:
      aggregate?.averageScore === null || typeof aggregate?.averageScore === "undefined"
        ? null
        : Number(aggregate.averageScore)
  });

  await tx.game.update({
    where: { id: game.id },
    data: { ratings: nextRatings }
  });

  return {
    slug: game.slug,
    ratings: nextRatings
  };
}
