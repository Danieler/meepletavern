import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSafePublicDisplayName } from "@/lib/publicIdentity";

export type PublicGameComment = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
};

const MIN_COMMENT_LENGTH = 8;
const MAX_COMMENT_LENGTH = 800;

export function normalizeGameCommentBody(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+$/gm, "")
    .trim();
}

export function validateGameCommentBody(value: string) {
  const normalized = normalizeGameCommentBody(value);

  if (normalized.length < MIN_COMMENT_LENGTH) {
    return {
      ok: false as const,
      error: `Escribe al menos ${MIN_COMMENT_LENGTH} caracteres para que tu comentario aporte contexto.`
    };
  }

  if (normalized.length > MAX_COMMENT_LENGTH) {
    return {
      ok: false as const,
      error: `Tu comentario puede tener como máximo ${MAX_COMMENT_LENGTH} caracteres.`
    };
  }

  return {
    ok: true as const,
    value: normalized
  };
}

export async function getGameComments(gameId: string, limit = 12): Promise<PublicGameComment[]> {
  return getCachedGameComments(gameId, limit);
}

const getCachedGameComments = (gameId: string, limit = 12) => unstable_cache(
  async () => {
    const comments = await prisma.gameComment.findMany({
      where: { gameId },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        body: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            displayName: true
          }
        }
      }
    });

    return comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      authorName: getSafePublicDisplayName(comment.user.displayName),
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString()
    }));
  },
  ["game-comments", gameId, String(limit)],
  { revalidate: 300, tags: ["public-comments"] }
)();
