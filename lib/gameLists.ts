import {
  GameListVisibility,
  GameStatus,
  ProfileVisibility,
  Prisma,
  type GameImageStatus
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export const DEFAULT_GAME_LIST_NAME = "Mis favoritos";
export const DEFAULT_GAME_LIST_SLUG = "mis-favoritos";
export const GAME_LIST_ITEM_PAGE_SIZE = 24;
export const GAME_LIST_SEARCH_LIMIT = 8;
export const GAME_LIST_SEARCH_MIN_LENGTH = 3;
export const GAME_LIST_SEARCH_MAX_LENGTH = 80;
export const MAX_GAME_LISTS_PER_USER = 30;
export const MAX_GAME_LIST_NAME_LENGTH = 60;
export const MAX_GAME_LIST_DESCRIPTION_LENGTH = 300;
export const MAX_SUGGESTIONS_PER_DAY = 5;

const MAX_GAME_LIST_ITEM_PAGE_SIZE = 24;
const PUBLIC_LIST_PREVIEW_SIZE = 4;
const PUBLIC_LIST_OVERVIEW_LIMIT = 12;

const tinyGameSelect = {
  id: true,
  title: true,
  name: true,
  slug: true,
  coverImageUrl: true,
  coverImageAlt: true,
  imageStatus: true,
  year: true
} satisfies Prisma.GameSelect;

type TinyGameRow = Prisma.GameGetPayload<{ select: typeof tinyGameSelect }>;
type GameSearchDb = Pick<typeof prisma, "game">;

export type ListGameSummary = {
  itemId: string;
  gameId: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  coverImageAlt: string;
  imageStatus: GameImageStatus;
  year: number | null;
  addedAt: string;
};

export type GameSearchResult = Omit<ListGameSummary, "itemId" | "addedAt">;

export type MyGameListSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  visibility: GameListVisibility;
  isDefault: boolean;
  gameCount: number;
  updatedAt: string;
};

export type OwnerGameListPage = {
  list: Omit<MyGameListSummary, "updatedAt">;
  items: ListGameSummary[];
  nextCursor: string | null;
};

export type PublicGameListSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  gameCount: number;
  previewGames: GameSearchResult[];
};

export type PublicGameListsPage = {
  items: PublicGameListSummary[];
  nextCursor: string | null;
};

export type PublicGameListPage = {
  list: {
    name: string;
    slug: string;
    description: string | null;
    gameCount: number;
    owner: {
      username: string;
      displayName: string;
      avatarUrl: string | null;
    };
  };
  items: ListGameSummary[];
  nextCursor: string | null;
};

export class GameListError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "GameListError";
    this.status = status;
  }
}

export async function ensureDefaultGameList(userId: string) {
  const existing = await prisma.gameList.findFirst({
    where: { userId, isDefault: true },
    select: { id: true }
  });
  if (existing) return existing;

  await prisma.gameList.createMany({
    data: [
      {
        userId,
        name: DEFAULT_GAME_LIST_NAME,
        slug: DEFAULT_GAME_LIST_SLUG,
        visibility: GameListVisibility.PRIVATE,
        isDefault: true
      }
    ],
    skipDuplicates: true
  });

  const created = await prisma.gameList.findFirst({
    where: { userId, isDefault: true },
    select: { id: true }
  });
  if (!created) throw new GameListError("No se pudo preparar tu lista de favoritos.", 500);
  return created;
}

export async function getMyGameLists(userId: string): Promise<MyGameListSummary[]> {
  const lists = await prisma.gameList.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
    take: MAX_GAME_LISTS_PER_USER,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      visibility: true,
      isDefault: true,
      updatedAt: true,
      _count: { select: { items: true } }
    }
  });

  return lists.map((list) => ({
    id: list.id,
    name: list.name,
    slug: list.slug,
    description: list.description,
    visibility: list.visibility,
    isDefault: list.isDefault,
    gameCount: list._count.items,
    updatedAt: list.updatedAt.toISOString()
  }));
}

export async function getListDetailForOwner(input: {
  userId: string;
  listId?: string;
  listSlug?: string;
  cursor?: string | null;
  limit?: number;
}): Promise<OwnerGameListPage | null> {
  const list = await prisma.gameList.findFirst({
    where: {
      userId: input.userId,
      ...(input.listId ? { id: input.listId } : { slug: input.listSlug || "" })
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      visibility: true,
      isDefault: true,
      _count: { select: { items: true } }
    }
  });
  if (!list) return null;

  const page = await getListItemsPage(list.id, input.cursor, input.limit);
  return {
    list: {
      id: list.id,
      name: list.name,
      slug: list.slug,
      description: list.description,
      visibility: list.visibility,
      isDefault: list.isDefault,
      gameCount: list._count.items
    },
    ...page
  };
}

export async function getPublicUserLists(
  username: string,
  limit = PUBLIC_LIST_OVERVIEW_LIMIT
): Promise<PublicGameListSummary[]> {
  const page = await getPublicUserListsPage({ username, limit });
  return page.items;
}

export async function getPublicUserListsPage(input: {
  username: string;
  cursor?: string | null;
  limit?: number;
}): Promise<PublicGameListsPage> {
  const limit = Math.min(PUBLIC_LIST_OVERVIEW_LIMIT, Math.max(1, input.limit || PUBLIC_LIST_OVERVIEW_LIMIT));
  const lists = await prisma.gameList.findMany({
    where: {
      visibility: GameListVisibility.PUBLIC,
      user: {
        profile: {
          is: {
            username: input.username.toLowerCase(),
            profileVisibility: ProfileVisibility.PUBLIC
          }
        }
      }
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      _count: { select: { items: true } },
      items: {
        orderBy: [{ addedAt: "desc" }, { id: "desc" }],
        take: PUBLIC_LIST_PREVIEW_SIZE,
        select: { game: { select: tinyGameSelect } }
      }
    }
  });
  const hasMore = lists.length > limit;
  const visibleLists = lists.slice(0, limit);

  return {
    items: visibleLists.map((list) => ({
      id: list.id,
      name: list.name,
      slug: list.slug,
      description: list.description,
      gameCount: list._count.items,
      previewGames: list.items.map(({ game }) => toGameSearchResult(game))
    })),
    nextCursor: hasMore ? visibleLists.at(-1)?.id || null : null
  };
}

export async function getPublicListDetail(input: {
  username: string;
  listSlug: string;
  cursor?: string | null;
  limit?: number;
}): Promise<PublicGameListPage | null> {
  const list = await prisma.gameList.findFirst({
    where: {
      slug: input.listSlug,
      visibility: GameListVisibility.PUBLIC,
      user: {
        profile: {
          is: {
            username: input.username.toLowerCase(),
            profileVisibility: ProfileVisibility.PUBLIC
          }
        }
      }
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      _count: { select: { items: true } },
      user: {
        select: {
          displayName: true,
          profile: {
            select: { username: true, displayName: true, avatarUrl: true }
          }
        }
      }
    }
  });
  const profile = list?.user.profile;
  if (!list || !profile) return null;

  const page = await getListItemsPage(list.id, input.cursor, input.limit);
  return {
    list: {
      name: list.name,
      slug: list.slug,
      description: list.description,
      gameCount: list._count.items,
      owner: {
        username: profile.username,
        displayName: profile.username,
        avatarUrl: profile.avatarUrl
      }
    },
    ...page
  };
}

export async function searchGamesForList(
  query: string,
  db: GameSearchDb = prisma
): Promise<GameSearchResult[]> {
  const search = normalizeGameSearch(query);
  if (!search) return [];

  const games = await db.game.findMany({
    where: {
      status: GameStatus.published,
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } }
      ]
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: GAME_LIST_SEARCH_LIMIT,
    select: tinyGameSelect
  });

  return games.map(toGameSearchResult);
}

export async function createGameList(
  userId: string,
  input: { name: unknown; description?: unknown; visibility?: unknown }
) {
  const values = parseListInput(input);
  const count = await prisma.gameList.count({ where: { userId } });
  if (count >= MAX_GAME_LISTS_PER_USER) {
    throw new GameListError(`Puedes tener hasta ${MAX_GAME_LISTS_PER_USER} listas.`, 409);
  }

  const slug = await getUniqueListSlug(userId, values.name);
  return prisma.gameList.create({
    data: { userId, slug, isDefault: false, ...values },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      visibility: true,
      isDefault: true
    }
  });
}

export async function updateGameList(
  userId: string,
  listId: string,
  input: { name: unknown; description?: unknown; visibility?: unknown }
) {
  const current = await prisma.gameList.findFirst({
    where: { id: listId, userId },
    select: { id: true, name: true, slug: true, isDefault: true, visibility: true }
  });
  if (!current) throw new GameListError("La lista no existe.", 404);

  const values = parseListInput(input);
  const name = current.isDefault ? current.name : values.name;
  const slug = !current.isDefault && name !== current.name
    ? await getUniqueListSlug(userId, name, current.id)
    : current.slug;

  const list = await prisma.gameList.update({
    where: { id: current.id },
    data: { name, slug, description: values.description, visibility: values.visibility },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      visibility: true,
      isDefault: true
    }
  });
  return { list, previousVisibility: current.visibility };
}

export async function deleteGameList(userId: string, listId: string) {
  const list = await prisma.gameList.findFirst({
    where: { id: listId, userId },
    select: { id: true, slug: true, isDefault: true }
  });
  if (!list) throw new GameListError("La lista no existe.", 404);
  if (list.isDefault) throw new GameListError("Mis favoritos no se puede eliminar.", 409);

  await prisma.gameList.delete({ where: { id: list.id } });
  return list;
}

export async function addGameToList(userId: string, listId: string, gameId: string) {
  const [list, game] = await Promise.all([
    prisma.gameList.findFirst({
      where: { id: listId, userId },
      select: { id: true, name: true, slug: true, visibility: true }
    }),
    prisma.game.findFirst({
      where: { id: gameId, status: GameStatus.published },
      select: tinyGameSelect
    })
  ]);
  if (!list) throw new GameListError("La lista no existe.", 404);
  if (!game) throw new GameListError("El juego no está disponible.", 404);

  try {
    const [item] = await prisma.$transaction([
      prisma.gameListItem.create({
        data: { listId: list.id, gameId: game.id },
        select: { id: true, addedAt: true }
      }),
      prisma.gameList.update({ where: { id: list.id }, data: { updatedAt: new Date() }, select: { id: true } })
    ]);
    return { list, game, item };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new GameListError("Ese juego ya está en la lista.", 409);
    }
    throw error;
  }
}

export async function removeGameFromList(userId: string, listId: string, gameId: string) {
  const list = await prisma.gameList.findFirst({
    where: { id: listId, userId },
    select: { id: true, slug: true }
  });
  if (!list) throw new GameListError("La lista no existe.", 404);

  const [result] = await prisma.$transaction([
    prisma.gameListItem.deleteMany({ where: { listId: list.id, gameId } }),
    prisma.gameList.update({ where: { id: list.id }, data: { updatedAt: new Date() }, select: { id: true } })
  ]);
  if (!result.count) throw new GameListError("El juego ya no estaba en la lista.", 404);
  return list;
}

export async function createGameSuggestion(
  userId: string,
  input: { name: unknown; url?: unknown; notes?: unknown }
) {
  const name = cleanText(input.name, 120);
  const url = cleanOptionalText(input.url, 500);
  const notes = cleanOptionalText(input.notes, 500);
  if (name.length < 2) throw new GameListError("Escribe el nombre del juego.");
  if (url && !isSafeHttpUrl(url)) throw new GameListError("El enlace no parece válido.");

  const normalizedName = slugify(name) || name.toLocaleLowerCase("es-ES");
  const existing = await prisma.gameSuggestion.findUnique({
    where: { userId_normalizedName: { userId, normalizedName } },
    select: { id: true, status: true }
  });
  if (existing) return { suggestion: existing, duplicate: true };

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentCount = await prisma.gameSuggestion.count({ where: { userId, createdAt: { gte: since } } });
  if (recentCount >= MAX_SUGGESTIONS_PER_DAY) {
    throw new GameListError("Has enviado varias sugerencias hoy. Prueba de nuevo mañana.", 429);
  }

  try {
    const suggestion = await prisma.gameSuggestion.create({
      data: { userId, name, normalizedName, url, notes },
      select: { id: true, status: true }
    });
    return { suggestion, duplicate: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const duplicate = await prisma.gameSuggestion.findUnique({
        where: { userId_normalizedName: { userId, normalizedName } },
        select: { id: true, status: true }
      });
      if (duplicate) return { suggestion: duplicate, duplicate: true };
    }
    throw error;
  }
}

export function normalizeGameSearch(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < GAME_LIST_SEARCH_MIN_LENGTH) return "";
  return normalized.slice(0, GAME_LIST_SEARCH_MAX_LENGTH);
}

async function getListItemsPage(listId: string, cursor?: string | null, requestedLimit?: number) {
  const limit = normalizeItemLimit(requestedLimit);
  const rows = await prisma.gameListItem.findMany({
    where: { listId },
    orderBy: [{ addedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, addedAt: true, game: { select: tinyGameSelect } }
  });
  const hasMore = rows.length > limit;
  const visibleRows = rows.slice(0, limit);

  return {
    items: visibleRows.map((item) => toListGameSummary(item.id, item.addedAt, item.game)),
    nextCursor: hasMore ? visibleRows.at(-1)?.id || null : null
  };
}

async function getUniqueListSlug(userId: string, name: string, excludeId?: string) {
  const base = slugify(name) || "lista";
  const existing = await prisma.gameList.findMany({
    where: { userId, slug: { startsWith: base }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { slug: true },
    take: MAX_GAME_LISTS_PER_USER
  });
  const used = new Set(existing.map((list) => list.slug));
  if (!used.has(base)) return base;

  for (let index = 2; index <= MAX_GAME_LISTS_PER_USER + 1; index += 1) {
    const candidate = `${base}-${index}`;
    if (!used.has(candidate)) return candidate;
  }
  throw new GameListError("No se pudo generar una dirección para la lista.", 409);
}

function parseListInput(input: { name: unknown; description?: unknown; visibility?: unknown }) {
  const name = cleanText(input.name, MAX_GAME_LIST_NAME_LENGTH);
  if (name.length < 2) throw new GameListError("El nombre debe tener al menos 2 caracteres.");
  const description = cleanOptionalText(input.description, MAX_GAME_LIST_DESCRIPTION_LENGTH);
  const visibility = input.visibility === GameListVisibility.PUBLIC
    ? GameListVisibility.PUBLIC
    : input.visibility === GameListVisibility.PRIVATE
      ? GameListVisibility.PRIVATE
      : null;
  if (!visibility) throw new GameListError("Elige si la lista es pública o privada.");
  return { name, description, visibility };
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? Array.from(value.trim().replace(/\s+/g, " ")).slice(0, maxLength).join("") : "";
}

function cleanOptionalText(value: unknown, maxLength: number) {
  const cleaned = cleanText(value, maxLength);
  return cleaned || null;
}

function isSafeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeItemLimit(value?: number) {
  if (!Number.isFinite(value)) return GAME_LIST_ITEM_PAGE_SIZE;
  return Math.min(MAX_GAME_LIST_ITEM_PAGE_SIZE, Math.max(1, Math.trunc(value || GAME_LIST_ITEM_PAGE_SIZE)));
}

function toGameSearchResult(game: TinyGameRow): GameSearchResult {
  return {
    gameId: game.id,
    title: game.title.trim() || game.name,
    slug: game.slug,
    coverImageUrl: game.coverImageUrl,
    coverImageAlt: game.coverImageAlt,
    imageStatus: game.imageStatus,
    year: game.year
  };
}

function toListGameSummary(itemId: string, addedAt: Date, game: TinyGameRow): ListGameSummary {
  return { itemId, addedAt: addedAt.toISOString(), ...toGameSearchResult(game) };
}
