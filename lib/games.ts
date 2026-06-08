import { GameStatus, Prisma } from "@prisma/client";
import { generateGameDraft } from "@/lib/ai/aiGameGeneratorService";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { normalizeGamePayload, toPrismaUpdate, type GameFormPayload } from "@/lib/gamePayload";

export async function getPublishedGames(options?: { limit?: number; query?: string }) {
  const query = options?.query?.trim();

  return prisma.game.findMany({
    where: {
      status: GameStatus.published,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { categories: { has: query } },
              { mechanics: { has: query } }
            ]
          }
        : {})
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: options?.limit
  });
}

export async function getFeaturedGames() {
  return prisma.game.findMany({
    where: { status: GameStatus.published },
    orderBy: [{ name: "asc" }],
    take: 3
  });
}

export async function getPublishedGameBySlug(slug: string) {
  return prisma.game.findFirst({
    where: {
      slug,
      status: GameStatus.published
    }
  });
}

export async function getAdminGames() {
  return prisma.game.findMany({
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
  });
}

export async function getAdminGameById(id: string) {
  return prisma.game.findUnique({
    where: { id }
  });
}

export async function createGeneratedGameDraft(name: string) {
  const draft = await generateGameDraft({ name });
  const slug = await ensureUniqueSlug(draft.slug);

  return prisma.game.create({
    data: {
      ...draft,
      slug,
      status: GameStatus.draft,
      createdByAi: true,
      publishedAt: null
    }
  });
}

export async function createManualGameDraft(name = "Nuevo juego") {
  const slug = await ensureUniqueSlug(slugify(name));

  return prisma.game.create({
    data: {
      name,
      slug,
      status: GameStatus.draft,
      createdByAi: false,
      pros: [],
      cons: [],
      categories: [],
      mechanics: [],
      similarGames: [],
      faqs: [],
      sources: []
    }
  });
}

export async function updateGameFromPayload(id: string, payload: GameFormPayload) {
  const normalized = normalizeGamePayload(payload);

  return prisma.game.update({
    where: { id },
    data: toPrismaUpdate(normalized)
  });
}

export async function publishGame(id: string) {
  return prisma.game.update({
    where: { id },
    data: {
      status: GameStatus.published,
      publishedAt: new Date()
    }
  });
}

export async function archiveGame(id: string) {
  return prisma.game.update({
    where: { id },
    data: {
      status: GameStatus.archived
    }
  });
}

export function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function ensureUniqueSlug(baseSlug: string) {
  const cleanBase = baseSlug || "juego";
  let slug = cleanBase;
  let counter = 2;

  while (await prisma.game.findUnique({ where: { slug } })) {
    slug = `${cleanBase}-${counter}`;
    counter += 1;
  }

  return slug;
}

