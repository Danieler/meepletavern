import { GameStatus, MediaAssetStatus, MediaAssetUsage, Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import type { GameImageFields } from "@/lib/gameImages";
import { canShowMedia, inferPlaceholderKind } from "@/lib/mediaSafety";
import { sanitizeImportedList, sanitizeImportedTitle } from "@/lib/importedTextSanitizer";
import {
  publicGameDetailTag,
  PUBLIC_GAMES_LIST_TAG,
  PUBLIC_GAME_TAXONOMY_TAG
} from "@/lib/publicGameCache";
import { getPublicGameDescription, getPublicReviewSummary } from "@/lib/publicEditorialCopy";
import { isUnavailableOfferAvailability } from "@/lib/gameOffers";
import { auditDataSource } from "@/lib/egressAudit";
import { prisma } from "@/lib/prisma";
import { getEffectiveReviewRating } from "@/lib/reviewRating";
import { getPublishedReviewBySlug, getPublishedReviews } from "@/lib/reviews";
import { normalizeGameRatings } from "@/lib/ratings/gameRatings";
import type { GameRatingsData } from "@/lib/ratings/types";
import { slugify } from "@/lib/slug";
import { getTaxonomyTermNames, normalizeMechanics, normalizeCategories } from "@/lib/taxonomy";
import { normalizeHowToPlayVideos, type HowToPlayVideo } from "@/lib/videos/howToPlayVideos";

export type BuyLink = {
  store: string;
  url: string;
  label?: string;
  priceLabel?: string | null;
  availability?: string | null;
};

export type GalleryImage = {
  url: string;
  alt: string;
  sourceName: string | null;
  attribution: string | null;
};

export type CatalogGame = GameImageFields & {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  playersMin: number | null;
  playersMax: number | null;
  playersLabel: string | null;
  playtime: string | null;
  durationMin: number | null;
  durationMax: number | null;
  age: string | null;
  ageValue: number | null;
  complexity: string | null;
  categories: string[];
  mechanics: string[];
  themes: string[];
  ratings: GameRatingsData;
  description: string;
  reviewSummary: string;
  pros: string[];
  cons: string[];
  recommendedFor: string;
  notRecommendedFor: string;
  similarGames: string[];
  buyLinks: BuyLink[];
  galleryImages: GalleryImage[];
  howToPlayVideos: HowToPlayVideo[];
  addedAt: string;
  updatedAt: string;
  publishedAt: string | null;
  placeholderKind: string;
  seoTitle: string | null;
  seoDescription: string | null;
};

export type Review = GameImageFields & {
  id: string;
  slug: string;
  title: string;
  gameSlug: string;
  gameTitle: string;
  summary: string;
  body: string;
  rating: number;
  authorName: string;
  authorUsername?: string | null;
  publishedAt: string;
};

export type Ranking = {
  slug: string;
  title: string;
  description: string;
  type: "all" | "category" | "mechanic";
  term?: string;
};

export type GameFilterInput = {
  q?: string;
  players?: string | string[];
  duration?: string | string[];
  weight?: string | string[];
  age?: string | string[];
  category?: string | string[];
  mechanic?: string | string[];
  sort?: string;
  page?: string | number;
  welcome?: string | string[];
};

const CATALOG_PAGE_SIZE = 12;
const MAX_PUBLIC_GAME_LIMIT = 60;

const publicMediaAssetSelect = {
  id: true,
  url: true,
  status: true,
  usage: true,
  attribution: true,
  source: {
    select: {
      name: true,
      baseUrl: true
    }
  }
} satisfies Prisma.MediaAssetSelect;

const catalogCardGameSelect = {
  id: true,
  name: true,
  title: true,
  slug: true,
  year: true,
  coverImageUrl: true,
  imageUrl: true,
  coverImageAlt: true,
  imageSourceName: true,
  imageSourceUrl: true,
  imageLicenseNote: true,
  imageStatus: true,
  primaryImageId: true,
  shortSummary: true,
  shortDescription: true,
  quickVerdict: true,
  minPlayers: true,
  maxPlayers: true,
  playtime: true,
  age: true,
  complexity: true,
  difficulty: true,
  categories: true,
  mechanics: true,
  themes: true,
  ratings: true,
  mediaAssets: {
    where: {
      status: MediaAssetStatus.approved,
      usage: MediaAssetUsage.public
    },
    select: publicMediaAssetSelect,
    orderBy: [{ updatedAt: "desc" }],
    take: 1
  },
  createdAt: true,
  updatedAt: true,
  seoTitle: true,
  seoDescription: true,
  publishedAt: true
} satisfies Prisma.GameSelect;

const catalogGameSelect = {
  ...catalogCardGameSelect,
  description: true,
  review: true,
  pros: true,
  cons: true,
  bestFor: true,
  notFor: true,
  similarGames: true,
  buyUrl: true,
  offers: {
    select: {
      sourceDisplayName: true,
      storeName: true,
      price: true,
      currency: true,
      availability: true,
      purchaseUrl: true,
      affiliateUrl: true,
      sourceUrl: true,
      fetchedAt: true
    },
    orderBy: [{ fetchedAt: "desc" }],
    take: 12
  },
  howToPlayVideos: true,
  mediaAssets: {
    where: {
      status: MediaAssetStatus.approved,
      usage: MediaAssetUsage.public
    },
    select: publicMediaAssetSelect,
    orderBy: [{ updatedAt: "desc" }],
    take: 8
  }
} satisfies Prisma.GameSelect;

const catalogTermCountsSelect = {
  categories: true,
  mechanics: true
} satisfies Prisma.GameSelect;

type CatalogCardDbGame = Prisma.GameGetPayload<{ select: typeof catalogCardGameSelect }>;
type CatalogDbGame = Prisma.GameGetPayload<{ select: typeof catalogGameSelect }>;
type CatalogTermCountsRow = Prisma.GameGetPayload<{ select: typeof catalogTermCountsSelect }>;

export const getCatalogGames = cache(async function getCatalogGames() {
  const games = await getPublishedDbGamesList();
  return games.map(toCatalogCardGame);
});

export const getGameBySlug = cache(async function getGameBySlug(slug: string) {
  const game = await getPublishedDbGameBySlug(slug);

  return game ? toCatalogGame(game) : null;
});

export async function getGamesBySlugs(slugs: string[]) {
  if (!slugs.length) {
    return [];
  }

  const identifiers = [...new Set(slugs.map((slug) => slug.trim()).filter(Boolean))];
  const games = await getDbGamesByIdentifiers(identifiers);
  const catalogGames = games.map(toCatalogCardGame);

  return identifiers
    .map((identifier) =>
      catalogGames.find(
        (game) =>
          normalizeIdentifier(game.slug) === normalizeIdentifier(identifier) ||
          normalizeIdentifier(game.title) === normalizeIdentifier(identifier)
      )
    )
    .filter(Boolean) as CatalogGame[];
}

export async function getCatalogGamesByIds(ids: string[]) {
  if (!ids.length) {
    return [];
  }

  const games = await prisma.game.findMany({
    where: {
      id: { in: ids },
      status: GameStatus.published
    },
    select: catalogCardGameSelect
  });
  const byId = new Map(games.map((game) => [game.id, toCatalogCardGame(game)]));

  return ids.flatMap((id) => {
    const game = byId.get(id);
    return game ? [game] : [];
  });
}

const getDbGamesByIdentifiers = (identifiers: string[]) => {
  const sortedKeys = [...identifiers].sort().join(",");
  return unstable_cache(
    async () => {
      return prisma.game.findMany({
        where: {
          status: GameStatus.published,
          OR: [
            { slug: { in: identifiers } },
            { title: { in: identifiers } },
            { name: { in: identifiers } }
          ]
        },
        select: catalogCardGameSelect,
        take: Math.max(identifiers.length, 4)
      });
    },
    ["db-games-by-identifiers", sortedKeys],
    { revalidate: 3600, tags: [PUBLIC_GAMES_LIST_TAG] }
  )();
};

export async function getReviews(): Promise<Review[]> {
  const reviews = await getPublishedReviews();
  return reviews.map(toPublishedReview).filter(Boolean) as Review[];
}

export async function getReviewBySlug(slug: string): Promise<Review | null> {
  const review = await getPublishedReviewBySlug(slug);
  return review ? toPublishedReview(review) : null;
}

export async function getRankings() {
  const [categoryCounts, mechanicCounts] = await Promise.all([getCategoryGameCounts(), getMechanicGameCounts()]);
  const categoryRankings = buildTermRankingsFromCounts("category", "Categoría", categoryCounts);
  const mechanicRankings = buildTermRankingsFromCounts("mechanic", "Mecánica", mechanicCounts);

  return [
    {
      slug: "juegos-publicados",
      title: "Juegos publicados",
      description: "Todos los juegos publicados en la base de datos, ordenados para revisar el archivo real.",
      type: "all" as const
    },
    ...categoryRankings,
    ...mechanicRankings
  ];
}

export async function getRankingBySlug(slug: string) {
  const rankings = await getRankings();
  return rankings.find((ranking) => ranking.slug === slug) || null;
}

export async function getRankingGames(ranking: Ranking) {
  const games = await getCatalogGames();

  if (ranking.type === "category" && ranking.term) {
    return sortGamesByEffectiveRating(games.filter((game) => game.categories.includes(ranking.term as string)));
  }

  if (ranking.type === "mechanic" && ranking.term) {
    return sortGamesByEffectiveRating(games.filter((game) => game.mechanics.includes(ranking.term as string)));
  }

  return sortGamesByEffectiveRating(games);
}

export async function getSitemapGames() {
  return getCachedSitemapGames();
}

const getCachedPopularDbGamesList = (limit: number) => unstable_cache(
  async () => {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      select id
      from "Game"
      where status = 'published'
      order by coalesce(
        nullif(ratings #>> '{combined,score}', '')::numeric,
        nullif(ratings #>> '{external,score}', '')::numeric
      ) desc nulls last,
      title asc,
      name asc
      limit ${limit}
    `;

    return auditDataSource("catalog.popularGames.db", await getCatalogGamesByIds(rows.map((row) => row.id)), { limit });
  },
  ["popular-db-games-v2", String(limit)],
  { revalidate: 3600, tags: [PUBLIC_GAMES_LIST_TAG] }
)();

export async function getPopularGames(limit = 6) {
  return getCachedPopularDbGamesList(normalizePublicGameLimit(limit));
}

const getCachedBeginnerDbGamesList = (limit: number) => unstable_cache(
  async () => {
    const games = await prisma.game.findMany({
      where: {
        status: GameStatus.published,
        OR: [
          { categories: { hasSome: ["Familiar", "Familiares", "Clásico", "Clásicos", "Gateway"] } },
          { complexity: { contains: "liger", mode: "insensitive" } },
          { complexity: { contains: "fácil", mode: "insensitive" } },
          { complexity: { contains: "facil", mode: "insensitive" } },
          { complexity: { contains: "baja", mode: "insensitive" } },
          { difficulty: { contains: "liger", mode: "insensitive" } },
          { difficulty: { contains: "fácil", mode: "insensitive" } },
          { difficulty: { contains: "facil", mode: "insensitive" } },
          { difficulty: { contains: "baja", mode: "insensitive" } }
        ]
      },
      select: catalogCardGameSelect,
      orderBy: [{ title: "asc" }, { name: "asc" }],
      take: limit
    });

    return auditDataSource("catalog.beginnerGames.db", games.map(toCatalogCardGame), { limit });
  },
  ["beginner-db-games-v2", String(limit)],
  { revalidate: 3600, tags: [PUBLIC_GAMES_LIST_TAG] }
)();

export async function getBeginnerGames(limit = 5) {
  return getCachedBeginnerDbGamesList(normalizePublicGameLimit(limit));
}

const getCachedNewDbGamesList = (limit: number) => unstable_cache(
  async () => {
    const games = await prisma.game.findMany({
      where: { status: GameStatus.published },
      select: catalogCardGameSelect,
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
      take: limit
    });

    return auditDataSource("catalog.newGames.db", games.map(toCatalogCardGame), { limit });
  },
  ["new-db-games-v2", String(limit)],
  { revalidate: 3600, tags: [PUBLIC_GAMES_LIST_TAG] }
)();

export async function getNewGames(limit = 5) {
  return getCachedNewDbGamesList(normalizePublicGameLimit(limit));
}


export async function getRelatedGames(game: CatalogGame) {
  const directMatches = await getGamesBySlugs(game.similarGames);

  if (directMatches.length) {
    return directMatches.filter((related) => related.slug !== game.slug).slice(0, 4);
  }

  const relatedFilters: Prisma.GameWhereInput[] = [];
  if (game.categories.length) {
    relatedFilters.push({ categories: { hasSome: game.categories } });
  }
  if (game.mechanics.length) {
    relatedFilters.push({ mechanics: { hasSome: game.mechanics } });
  }
  if (game.themes.length) {
    relatedFilters.push({ themes: { hasSome: game.themes } });
  }

  if (!relatedFilters.length) {
    return [];
  }

  const games = await getRelatedDbGames(game.slug, game.categories, game.mechanics, game.themes);

  return games
    .map(toCatalogCardGame)
    .map((candidate) => ({
      game: candidate,
      score: overlapScore(game.categories, candidate.categories) + overlapScore(game.mechanics, candidate.mechanics) + overlapScore(game.themes, candidate.themes)
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.game.title.localeCompare(b.game.title, "es"))
    .map((candidate) => candidate.game)
    .slice(0, 4);
}

export async function filterGames(input: GameFilterInput) {
  const dbResult = await filterGamesFromDb(input);
  if (dbResult) {
    return dbResult;
  }

  return filterGamesInMemory(input);
}

async function filterGamesFromDb(input: GameFilterInput) {
  const query = input.q?.trim().toLowerCase();
  const categories = normalizeCategories(getFilterValues(input.category));
  const mechanics = normalizeMechanics(getFilterValues(input.mechanic));
  const players = getFilterValues(input.players);
  const durations = getFilterValues(input.duration);
  const weights = getFilterValues(input.weight);
  const ages = getFilterValues(input.age);
  const pageSize = CATALOG_PAGE_SIZE;
  const page = Math.max(1, Number(input.page) || 1);
  const usesAdvancedFilters =
    durations.length ||
    weights.length ||
    ages.length ||
    input.sort === "valoracion" ||
    input.sort === "dificultad";

  if (usesAdvancedFilters) {
    return filterGamesFromAdvancedDb({
      query,
      categories,
      mechanics,
      players,
      durations,
      weights,
      ages,
      sort: input.sort,
      page,
      pageSize
    });
  }

  const where = buildCatalogDbWhere({ query, categories, mechanics, players });
  const orderBy = input.sort === "fecha"
    ? [{ publishedAt: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }] satisfies Prisma.GameOrderByWithRelationInput[]
    : [{ title: "asc" }, { name: "asc" }] satisfies Prisma.GameOrderByWithRelationInput[];
  const [total, games] = await Promise.all([
    prisma.game.count({ where }),
    prisma.game.findMany({
      where,
      select: catalogCardGameSelect,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ]);

  return auditDataSource("catalog.filterGames.db", {
    games: games.map(toCatalogCardGame),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  }, {
    sort: input.sort || "nombre",
    hasQuery: Boolean(query),
    categoriesCount: categories.length,
    mechanicsCount: mechanics.length,
    playersCount: players.length
  });
}

async function filterGamesFromAdvancedDb(filters: {
  query?: string;
  categories: string[];
  mechanics: string[];
  players: string[];
  durations: string[];
  weights: string[];
  ages: string[];
  sort?: string;
  page: number;
  pageSize: number;
}) {
  const where = buildCatalogRawWhere(filters);
  const orderBy = buildCatalogRawOrderBy(filters.sort);
  const skip = (filters.page - 1) * filters.pageSize;
  const [countRows, idRows] = await Promise.all([
    prisma.$queryRaw<Array<{ total: number | bigint }>>(Prisma.sql`
      select count(*)::int as total
      from "Game"
      where ${where}
    `),
    prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      select id
      from "Game"
      where ${where}
      order by ${orderBy}
      offset ${skip}
      limit ${filters.pageSize}
    `)
  ]);
  const total = Number(countRows[0]?.total || 0);
  const games = await getCatalogGamesByIds(idRows.map((row) => row.id));

  return auditDataSource("catalog.filterGames.advancedDb", {
    games,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.ceil(total / filters.pageSize)
  }, {
    sort: filters.sort || "nombre",
    hasQuery: Boolean(filters.query),
    categoriesCount: filters.categories.length,
    mechanicsCount: filters.mechanics.length,
    playersCount: filters.players.length,
    durationsCount: filters.durations.length,
    weightsCount: filters.weights.length,
    agesCount: filters.ages.length
  });
}

async function filterGamesInMemory(input: GameFilterInput) {
  const query = input.q?.trim().toLowerCase();
  const categories = normalizeCategories(getFilterValues(input.category));
  const mechanics = normalizeMechanics(getFilterValues(input.mechanic));
  const players = getFilterValues(input.players);
  const durations = getFilterValues(input.duration);
  const weights = getFilterValues(input.weight);
  const ages = getFilterValues(input.age);
  const catalogGames = await getCatalogGames();

  const filtered = catalogGames.filter((game) => {
    const matchesQuery = query
      ? [
          game.title,
          game.description,
          game.reviewSummary,
          game.complexity,
          ...game.categories,
          ...game.mechanics
        ]
          .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
      : true;
    const matchesPlayers = players.length ? players.some((value) => matchesPlayerFilter(game, value)) : true;
    const matchesDuration = durations.length ? durations.some((value) => matchesDurationFilter(game, value)) : true;
    const matchesWeight = weights.length ? weights.some((value) => matchesWeightFilter(game, value)) : true;
    const matchesAge = ages.length
      ? ages.some((value) => (game.ageValue ? game.ageValue <= Number(value) : true))
      : true;
    const matchesCategories = categories.length
      ? categories.some((category) =>
          category.toLowerCase() === "familiar"
            ? game.categories.some((value) => normalizeFilterText(value).includes("familiar"))
            : game.categories.includes(category)
        )
      : true;
    const matchesMechanics = mechanics.length ? mechanics.some((value) => game.mechanics.includes(value)) : true;

    return (
      matchesQuery &&
      matchesPlayers &&
      matchesDuration &&
      matchesWeight &&
      matchesAge &&
      matchesCategories &&
      matchesMechanics
    );
  });

  const sorted = sortGames(filtered, input.sort);
  const total = sorted.length;
  const pageSize = CATALOG_PAGE_SIZE;
  const page = Math.max(1, Number(input.page) || 1);
  const games = sorted.slice((page - 1) * pageSize, page * pageSize);

  return auditDataSource("catalog.filterGames.fallback", {
    games,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  }, {
    sort: input.sort || "nombre",
    hasQuery: Boolean(query),
    categoriesCount: categories.length,
    mechanicsCount: mechanics.length,
    playersCount: players.length,
    durationsCount: durations.length,
    weightsCount: weights.length,
    agesCount: ages.length
  });
}

export function sortGames(games: CatalogGame[], sort = "nombre") {
  const sorted = [...games];

  if (sort === "valoracion") {
    return sortGamesByEffectiveRating(sorted);
  }

  if (sort === "fecha") {
    return sorted.sort((a, b) => dateValue(b.publishedAt || b.addedAt) - dateValue(a.publishedAt || a.addedAt));
  }

  if (sort === "dificultad") {
    return sorted.sort((a, b) => complexityRank(b.complexity) - complexityRank(a.complexity) || a.title.localeCompare(b.title, "es"));
  }

  return sorted.sort((a, b) => a.title.localeCompare(b.title, "es"));
}

export function getEffectiveRatingScore(game: CatalogGame) {
  return game.ratings.combined?.score ?? game.ratings.external?.score ?? null;
}

export function sortGamesByEffectiveRating(games: CatalogGame[]) {
  return [...games].sort((a, b) => {
    const scoreA = getEffectiveRatingScore(a);
    const scoreB = getEffectiveRatingScore(b);

    if (typeof scoreA === "number" && typeof scoreB === "number") {
      return scoreB - scoreA || a.title.localeCompare(b.title, "es");
    }

    if (typeof scoreA === "number") {
      return -1;
    }

    if (typeof scoreB === "number") {
      return 1;
    }

    return a.title.localeCompare(b.title, "es");
  });
}

export async function getCategoryTerms() {
  return getTaxonomyTermNames("category");
}

export async function getMechanicTerms() {
  return sanitizeImportedList(await getTaxonomyTermNames("mechanic"), "mechanics");
}

export async function getCategoryGameCounts() {
  const rows = await getPublishedGameTermCountsRows();
  return countGameTerms(rows, "categories");
}

export async function getMechanicGameCounts() {
  const rows = await getPublishedGameTermCountsRows();
  return countGameTerms(rows, "mechanics");
}

export function termHref(type: "category" | "mechanic", term: string) {
  const key = type === "category" ? "category" : "mechanic";
  return `/juegos?${key}=${encodeURIComponent(term)}`;
}

// Public list/ranking/card paths should stay below the Data Cache item limit and avoid detail-page fields.
const getPublishedDbGamesList = unstable_cache(
  async function getPublishedDbGamesList() {
    return auditDataSource("catalog.publishedGameCards.db", await prisma.game.findMany({
      where: { status: GameStatus.published },
      select: catalogCardGameSelect,
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
      take: 2000
    }));
  },
  ["published-game-cards"],
  { revalidate: 3600, tags: [PUBLIC_GAMES_LIST_TAG] }
);

const getPublishedDbGameBySlug = (slug: string) => unstable_cache(
  async () => {
    return auditDataSource("catalog.gameBySlug.db", await prisma.game.findFirst({
      where: {
        slug,
        status: GameStatus.published
      },
      select: catalogGameSelect
    }), { slug });
  },
  ["published-db-game-by-slug", slug],
  { revalidate: 3600, tags: [publicGameDetailTag(slug)] }
)();

const getPublishedGameTermCountsRows = unstable_cache(
  async function getPublishedGameTermCountsRows() {
    return auditDataSource("catalog.termCountRows.db", await prisma.game.findMany({
      where: { status: GameStatus.published },
      select: catalogTermCountsSelect
    }));
  },
  ["published-game-term-counts"],
  { revalidate: 3600, tags: [PUBLIC_GAMES_LIST_TAG, PUBLIC_GAME_TAXONOMY_TAG] }
);

const getCachedSitemapGames = unstable_cache(
  async function getCachedSitemapGames() {
    return auditDataSource("catalog.sitemapGames.db", await prisma.game.findMany({
      where: { status: GameStatus.published },
      select: {
        slug: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
      take: 5000
    }));
  },
  ["sitemap-published-games-v1"],
  { revalidate: 3600, tags: [PUBLIC_GAMES_LIST_TAG] }
);

const getRelatedDbGames = (slug: string, categories: string[], mechanics: string[], themes: string[]) => {
  const catKey = [...categories].sort().join(",");
  const mechKey = [...mechanics].sort().join(",");
  const themeKey = [...themes].sort().join(",");
  return unstable_cache(
    async () => {
      const relatedFilters: Prisma.GameWhereInput[] = [];
      if (categories.length) {
        relatedFilters.push({ categories: { hasSome: categories } });
      }
      if (mechanics.length) {
        relatedFilters.push({ mechanics: { hasSome: mechanics } });
      }
      if (themes.length) {
        relatedFilters.push({ themes: { hasSome: themes } });
      }

      if (!relatedFilters.length) {
        return [];
      }

      return prisma.game.findMany({
        where: {
          status: GameStatus.published,
          slug: { not: slug },
          OR: relatedFilters
        },
        select: catalogCardGameSelect,
        take: 12
      });
    },
    ["related-db-games", slug, catKey, mechKey, themeKey],
    { revalidate: 3600, tags: [PUBLIC_GAMES_LIST_TAG] }
  )();
};

type CatalogGameDetails = {
  description: string | null;
  review: string | null;
  pros: string[];
  cons: string[];
  bestFor: string | null;
  notFor: string | null;
  similarGames: string[];
  buyUrl: string | null;
  offers: CatalogDbGame["offers"];
  howToPlayVideos: unknown;
};

type CatalogGameMediaFields = Pick<CatalogCardDbGame, "mediaAssets" | "primaryImageId">;
type CatalogGameImageFields = Pick<
  CatalogCardDbGame,
  "coverImageUrl" | "imageUrl" | "imageStatus" | "primaryImageId"
>;
type CatalogGamePlayerFields = Pick<CatalogCardDbGame, "minPlayers" | "maxPlayers">;

function toCatalogGame(game: CatalogDbGame): CatalogGame {
  return toCatalogGameShape(game, {
    description: game.description,
    review: game.review,
    pros: game.pros,
    cons: game.cons,
    bestFor: game.bestFor,
    notFor: game.notFor,
    similarGames: game.similarGames,
    buyUrl: game.buyUrl,
    offers: game.offers,
    howToPlayVideos: game.howToPlayVideos
  });
}

function toCatalogCardGame(game: CatalogCardDbGame): CatalogGame {
  return toCatalogGameShape(game, {
    description: null,
    review: null,
    pros: [],
    cons: [],
    bestFor: null,
    notFor: null,
    similarGames: [],
    buyUrl: null,
    offers: [],
    howToPlayVideos: []
  }, { compactRatings: true });
}

function toCatalogGameShape(
  game: CatalogCardDbGame,
  details: CatalogGameDetails,
  options: { compactRatings?: boolean } = {}
): CatalogGame {
  const duration = parseDuration(game.playtime);
  const title = sanitizeImportedTitle(game.title || game.name) || game.title || game.name;
  const shortDescription = game.shortDescription || game.shortSummary;
  const quickVerdict = game.quickVerdict || details.review;
  const difficulty = game.difficulty || game.complexity;
  const categories = sanitizeImportedList(game.categories, "categories");
  const mechanics = sanitizeImportedList(game.mechanics, "mechanics");
  const themes = sanitizeImportedList(game.themes, "themes");
  const publicSummary = getPublicReviewSummary({
    title,
    shortDescription,
    shortSummary: game.shortSummary,
    description: details.description,
    quickVerdict
  });
  const publicDescription = getPublicGameDescription({
    title,
    shortDescription,
    shortSummary: game.shortSummary,
    description: details.description,
    quickVerdict
  });
  const safeMedia = pickSafeMedia(game);
  const publicCoverImage = safeMedia?.url || resolveLegacyPublicImage(game);
  const galleryImages = buildPublicGalleryImages(game, publicCoverImage, title);
  const placeholderKind = inferPlaceholderKind({
    categories,
    mechanics,
    themes,
    difficulty
  });
  const ratings = normalizeGameRatings(game.ratings);

  return {
    id: game.id,
    slug: game.slug,
    title,
    year: game.year,
    coverImageUrl: publicCoverImage,
    coverImageAlt: game.coverImageAlt || `Imagen editorial de ${title}`,
    imageSourceName: safeMedia?.source?.name || (publicCoverImage ? "URL editorial" : null),
    imageSourceUrl: safeMedia?.source?.baseUrl || null,
    imageLicenseNote: safeMedia?.attribution || null,
    imageStatus: publicCoverImage ? "verified" : "placeholder",
    placeholderKind,
    playersMin: game.minPlayers,
    playersMax: game.maxPlayers,
    playersLabel: formatPlayers(game),
    playtime: game.playtime,
    durationMin: duration.min,
    durationMax: duration.max,
    age: game.age,
    ageValue: parseFirstNumber(game.age),
    complexity: difficulty,
    categories,
    mechanics,
    themes,
    ratings: options.compactRatings ? compactGameRatings(ratings) : ratings,
    description: publicDescription,
    reviewSummary: publicSummary,
    pros: details.pros,
    cons: details.cons,
    recommendedFor: details.bestFor || "",
    notRecommendedFor: details.notFor || "",
    similarGames: details.similarGames,
    buyLinks: buildBuyLinks(details),
    galleryImages,
    howToPlayVideos: normalizeHowToPlayVideos(details.howToPlayVideos),
    addedAt: toIsoString(game.createdAt) || new Date().toISOString(),
    updatedAt: toIsoString(game.updatedAt) || new Date().toISOString(),
    publishedAt: toIsoString(game.publishedAt),
    seoTitle: game.seoTitle,
    seoDescription: game.seoDescription
  };
}

function compactGameRatings(ratings: GameRatingsData): GameRatingsData {
  return {
    ...(ratings.external ? { external: compactExternalRating(ratings.external) } : {}),
    ...(ratings.combined ? { combined: compactExternalRating(ratings.combined) } : {}),
    users: ratings.users
  };
}

function compactExternalRating(rating: NonNullable<GameRatingsData["external"]>) {
  return {
    ...(typeof rating.score === "number" ? { score: rating.score } : {}),
    label: rating.label,
    confidence: rating.confidence,
    source: rating.source,
    sourcesCount: rating.sourcesCount,
    explanation: truncateText(rating.explanation || rating.label, 160),
    lastCheckedAt: rating.lastCheckedAt,
    signals: []
  };
}

function truncateText(value: string, maxLength: number) {
  const text = value.trim();
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function buildBuyLinks(game: Pick<CatalogGameDetails, "buyUrl" | "offers">): BuyLink[] {
  const offers = Array.isArray(game.offers) ? game.offers : [];
  const links = offers
    .flatMap((offer) => {
      if (isUnavailableOfferAvailability(offer.availability)) return [];

      const url = offer.affiliateUrl || offer.purchaseUrl || offer.sourceUrl;
      if (!url) return [];

      return [{
        store: offer.storeName || offer.sourceDisplayName || "Tienda",
        url,
        priceLabel: formatOfferPrice(offer.price, offer.currency),
        availability: formatBuyLinkAvailability(offer.availability)
      }];
    });

  if (!links.length && game.buyUrl && !offers.length) {
    return [{ store: "Comprar", url: game.buyUrl, priceLabel: null, availability: null }];
  }

  return dedupeBuyLinks(links);
}

function formatOfferPrice(price: number | null, currency: string | null) {
  if (typeof price !== "number" || !Number.isFinite(price)) {
    return null;
  }

  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: currency || "EUR"
    }).format(price);
  } catch {
    return `${price.toFixed(2)} ${currency || "EUR"}`;
  }
}

function formatBuyLinkAvailability(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  if (/(agotado|sin stock|no disponible|unavailable|out of stock)/.test(normalized)) {
    return "No disponible";
  }

  if (/(disponible|en stock|stock|anadir al carrito|preventa|reservar)/.test(normalized)) {
    return "Disponible";
  }

  return null;
}

function dedupeBuyLinks(links: BuyLink[]) {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.store}:${link.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

type PublicReviewSource =
  | Awaited<ReturnType<typeof getPublishedReviewBySlug>>
  | Awaited<ReturnType<typeof getPublishedReviews>>[number];

function toPublishedReview(review: PublicReviewSource): Review | null {
  if (!review) {
    return null;
  }

  const gameTitle = review.game.title || review.game.name;
  const imageUrl =
    review.game.imageStatus === "verified"
      ? review.game.coverImageUrl || review.game.imageUrl || null
      : review.game.coverImageUrl || review.game.imageUrl || null;

  return {
    id: review.id,
    slug: review.slug,
    title: review.title,
    gameSlug: review.game.slug,
    gameTitle,
    coverImageUrl: imageUrl,
    coverImageAlt: review.game.coverImageAlt || `Imagen editorial de ${gameTitle}`,
    imageSourceName: imageUrl ? "Portada del juego" : null,
    imageSourceUrl: null,
    imageLicenseNote: null,
    imageStatus: imageUrl ? "verified" : "placeholder",
    placeholderKind: "board-game",
    summary: review.summary,
    body: "body" in review ? review.body : "",
    rating: getEffectiveReviewRating(review.game.ratings, review.rating),
    authorName: review.authorName,
    authorUsername: review.user?.profile?.username || null,
    publishedAt: toIsoString(review.publishedAt) || new Date().toISOString()
  };
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function pickSafeMedia(game: CatalogGameMediaFields) {
  return getOrderedMedia(game).find((asset) => canShowMedia(asset, asset.source)) || null;
}

function buildPublicGalleryImages(game: CatalogGameMediaFields, publicCoverImage: string | null, title: string) {
  const seen = new Set<string>();
  const images: GalleryImage[] = [];

  function addImage(url: string | null | undefined, sourceName: string | null = null, attribution: string | null = null) {
    const normalizedUrl = url?.trim();
    if (!normalizedUrl || seen.has(normalizedUrl)) {
      return;
    }

    seen.add(normalizedUrl);
    images.push({
      url: normalizedUrl,
      alt: `Imagen de ${title}`,
      sourceName,
      attribution
    });
  }

  for (const asset of getOrderedMedia(game)) {
    if (canShowMedia(asset, asset.source)) {
      addImage(asset.url, asset.source?.name || null, asset.attribution || null);
    }
  }

  addImage(publicCoverImage, publicCoverImage ? "Portada del juego" : null);

  return images;
}

function getOrderedMedia(game: CatalogGameMediaFields) {
  return [...game.mediaAssets].sort((left, right) => {
    if (left.id === game.primaryImageId) {
      return -1;
    }

    if (right.id === game.primaryImageId) {
      return 1;
    }

    return 0;
  });
}

function resolveLegacyPublicImage(game: CatalogGameImageFields) {
  if (game.imageStatus === "verified") {
    return game.coverImageUrl || game.imageUrl || null;
  }

  if (looksLikeUrl(game.primaryImageId)) {
    return game.primaryImageId;
  }

  return null;
}

function looksLikeUrl(value: string | null | undefined) {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

function normalizeFilterText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getFilterValues(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }

  return typeof value === "string" && value.trim() ? [value.trim()] : [];
}

function normalizePublicGameLimit(limit: number) {
  if (!Number.isFinite(limit)) {
    return 6;
  }

  return Math.min(MAX_PUBLIC_GAME_LIMIT, Math.max(1, Math.trunc(limit)));
}

function buildCatalogDbWhere({
  query,
  categories,
  mechanics,
  players
}: {
  query?: string;
  categories: string[];
  mechanics: string[];
  players: string[];
}): Prisma.GameWhereInput {
  const and: Prisma.GameWhereInput[] = [];

  if (query) {
    and.push({
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
        { shortSummary: { contains: query, mode: "insensitive" } },
        { shortDescription: { contains: query, mode: "insensitive" } },
        { quickVerdict: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { complexity: { contains: query, mode: "insensitive" } },
        { difficulty: { contains: query, mode: "insensitive" } },
        { categories: { has: query } },
        { mechanics: { has: query } }
      ]
    });
  }

  if (categories.length) {
    and.push({
      OR: categories.map((category) =>
        category.toLowerCase() === "familiar"
          ? { categories: { hasSome: ["Familiar", "Familiares", category] } }
          : { categories: { has: category } }
      )
    });
  }

  if (mechanics.length) {
    and.push({ OR: mechanics.map((mechanic) => ({ mechanics: { has: mechanic } })) });
  }

  const playerFilters = players
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value): Prisma.GameWhereInput => ({
      OR: [
        { minPlayers: null },
        { maxPlayers: null },
        {
          AND: [
            { minPlayers: { lte: value } },
            { maxPlayers: { gte: value } }
          ]
        }
      ]
    }));

  if (playerFilters.length) {
    and.push({ OR: playerFilters });
  }

  return {
    status: GameStatus.published,
    ...(and.length ? { AND: and } : {})
  };
}

function buildCatalogRawWhere(filters: {
  query?: string;
  categories: string[];
  mechanics: string[];
  players: string[];
  durations: string[];
  weights: string[];
  ages: string[];
}) {
  const clauses: Prisma.Sql[] = [Prisma.sql`"status" = ${GameStatus.published}::"GameStatus"`];

  if (filters.query) {
    const likeQuery = `%${filters.query}%`;
    clauses.push(Prisma.sql`(
      "title" ilike ${likeQuery}
      or "name" ilike ${likeQuery}
      or "shortSummary" ilike ${likeQuery}
      or "shortDescription" ilike ${likeQuery}
      or "quickVerdict" ilike ${likeQuery}
      or "description" ilike ${likeQuery}
      or "complexity" ilike ${likeQuery}
      or "difficulty" ilike ${likeQuery}
      or exists (select 1 from unnest("categories") as category(value) where category.value ilike ${likeQuery})
      or exists (select 1 from unnest("mechanics") as mechanic(value) where mechanic.value ilike ${likeQuery})
    )`);
  }

  if (filters.categories.length) {
    clauses.push(Prisma.sql`(${Prisma.join(filters.categories.map(buildCategoryRawClause), " or ")})`);
  }

  if (filters.mechanics.length) {
    clauses.push(Prisma.sql`(${Prisma.join(filters.mechanics.map((mechanic) => Prisma.sql`${mechanic} = any("mechanics")`), " or ")})`);
  }

  const playerClauses = filters.players
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Prisma.sql`(
      "minPlayers" is null
      or "maxPlayers" is null
      or ("minPlayers" <= ${value} and "maxPlayers" >= ${value})
    )`);

  if (playerClauses.length) {
    clauses.push(Prisma.sql`(${Prisma.join(playerClauses, " or ")})`);
  }

  const durationClauses = filters.durations.map(buildDurationRawClause);
  if (durationClauses.length) {
    clauses.push(Prisma.sql`(${Prisma.join(durationClauses, " or ")})`);
  }

  const weightClauses = filters.weights.map(buildWeightRawClause);
  if (weightClauses.length) {
    clauses.push(Prisma.sql`(${Prisma.join(weightClauses, " or ")})`);
  }

  const ageClauses = filters.ages
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => {
      const ageValue = gameAgeValueSql();
      return Prisma.sql`(${ageValue} is null or ${ageValue} <= ${value})`;
    });

  if (ageClauses.length) {
    clauses.push(Prisma.sql`(${Prisma.join(ageClauses, " or ")})`);
  }

  return Prisma.join(clauses, " and ");
}

function buildCategoryRawClause(category: string) {
  if (category.toLowerCase() === "familiar") {
    return Prisma.sql`"categories" && array[${Prisma.join(["Familiar", "Familiares", category])}]::text[]`;
  }

  return Prisma.sql`${category} = any("categories")`;
}

function buildDurationRawClause(duration: string) {
  const durationMax = gameDurationMaxSql();
  const numericDuration = Number(duration);

  if (Number.isFinite(numericDuration) && numericDuration > 0) {
    return Prisma.sql`(${durationMax} is null or ${durationMax} <= ${numericDuration})`;
  }

  return Prisma.sql`(${durationMax} is null or ${durationMax} > 120)`;
}

function buildWeightRawClause(weight: string) {
  const rank = gameComplexityRankSql();

  if (weight === "ligero") {
    return Prisma.sql`${rank} <= 1`;
  }

  if (weight === "medio") {
    return Prisma.sql`(${rank} = 0 or ${rank} = 2)`;
  }

  return Prisma.sql`(${rank} = 0 or ${rank} >= 3)`;
}

function buildCatalogRawOrderBy(sort = "nombre") {
  if (sort === "valoracion") {
    return Prisma.sql`coalesce(
      nullif("ratings" #>> '{combined,score}', '')::numeric,
      nullif("ratings" #>> '{external,score}', '')::numeric
    ) desc nulls last, "title" asc, "name" asc`;
  }

  if (sort === "fecha") {
    return Prisma.sql`"publishedAt" desc nulls last, "updatedAt" desc, "createdAt" desc`;
  }

  if (sort === "dificultad") {
    return Prisma.sql`${gameComplexityRankSql()} desc, "title" asc, "name" asc`;
  }

  return Prisma.sql`"title" asc, "name" asc`;
}

function gameDurationMaxSql() {
  return Prisma.sql`case
    when "playtime" ~ '[0-9]' then coalesce(
      nullif(substring("playtime" from '[0-9]+[^0-9]+([0-9]+)'), '')::int,
      nullif(substring("playtime" from '([0-9]+)'), '')::int
    )
    else null
  end`;
}

function gameAgeValueSql() {
  return Prisma.sql`coalesce(
    "minAge",
    nullif(substring("age" from '([0-9]+)'), '')::int
  )`;
}

function gameComplexityRankSql() {
  const value = Prisma.sql`lower(coalesce(nullif("difficulty", ''), nullif("complexity", ''), ''))`;

  return Prisma.sql`case
    when ${value} like '%alta%' or ${value} like '%duro%' or ${value} like '%pesad%' then 3
    when ${value} like '%media ligera%' or ${value} like '%ligera%' or ${value} like '%baja%' or ${value} like '%facil%' or ${value} like '%fácil%' then 1
    when ${value} like '%media%' then 2
    else 0
  end`;
}

function buildTermRankings(
  type: "category" | "mechanic",
  label: string,
  games: CatalogGame[],
  picker: (game: CatalogGame) => string[]
): Ranking[] {
  return getTerms(games, picker)
    .slice(0, 5)
    .map((term) => ({
      slug: `${type}-${slugify(term)}`,
      title: `${label}: ${term}`,
      description: `Juegos publicados en la base de datos con ${label.toLowerCase()} "${term}".`,
      type,
      term
    }));
}

function buildTermRankingsFromCounts(
  type: "category" | "mechanic",
  label: string,
  counts: Record<string, number>
): Ranking[] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
    .slice(0, 5)
    .map(([term]) => ({
      slug: `${type}-${slugify(term)}`,
      title: `${label}: ${term}`,
      description: `Juegos publicados en la base de datos con ${label.toLowerCase()} "${term}".`,
      type,
      term
    }));
}

function getTerms(games: CatalogGame[], picker: (game: CatalogGame) => string[]) {
  const counts = new Map<string, number>();

  for (const game of games) {
    for (const term of picker(game)) {
      counts.set(term, (counts.get(term) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
    .map(([term]) => term);
}

function countGameTerms(rows: CatalogTermCountsRow[], field: "categories" | "mechanics") {
  const counts: Record<string, number> = {};
  const sanitizer = field === "categories" ? "categories" : "mechanics";

  for (const row of rows) {
    for (const term of sanitizeImportedList(row[field], sanitizer)) {
      counts[term] = (counts[term] || 0) + 1;
    }
  }

  return counts;
}

function getGameCategories(game: CatalogGame) {
  return game.categories;
}

function getGameMechanics(game: CatalogGame) {
  return game.mechanics;
}

function normalizeIdentifier(value: string) {
  return slugify(value);
}

function formatPlayers(game: CatalogGamePlayerFields) {
  if (game.minPlayers && game.maxPlayers && game.minPlayers !== game.maxPlayers) {
    return `${game.minPlayers}-${game.maxPlayers}`;
  }

  if (game.minPlayers || game.maxPlayers) {
    return String(game.minPlayers || game.maxPlayers);
  }

  return null;
}

function parseDuration(value: string | null) {
  const numbers = extractNumbers(value);

  if (!numbers.length) {
    return { min: null, max: null };
  }

  return {
    min: numbers[0],
    max: numbers[1] || numbers[0]
  };
}

function parseFirstNumber(value: string | null) {
  return extractNumbers(value)[0] || null;
}

function extractNumbers(value: string | null) {
  if (!value) {
    return [];
  }

  return [...value.matchAll(/\d+/g)].map((match) => Number(match[0])).filter(Number.isFinite);
}

function matchesPlayerFilter(game: CatalogGame, players: string) {
  const value = Number(players);

  if (!Number.isFinite(value) || !game.playersMin || !game.playersMax) {
    return true;
  }

  return game.playersMin <= value && game.playersMax >= value;
}

function matchesDurationFilter(game: CatalogGame, duration: string) {
  if (!game.durationMax) {
    return true;
  }

  const numericDuration = Number(duration);
  if (Number.isFinite(numericDuration) && numericDuration > 0) {
    return game.durationMax <= numericDuration;
  }

  return game.durationMax > 120;
}

function matchesWeightFilter(game: CatalogGame, weight: string) {
  const rank = complexityRank(game.complexity);

  if (!rank) {
    return true;
  }

  if (weight === "ligero") {
    return rank <= 1;
  }

  if (weight === "medio") {
    return rank === 2;
  }

  return rank >= 3;
}

function isBeginnerTerm(term: string) {
  const normalized = term.toLowerCase();
  return normalized.includes("familiar") || normalized.includes("gateway") || normalized.includes("clásico");
}

function isLightComplexity(value: string | null) {
  return complexityRank(value) <= 1;
}

function complexityRank(value: string | null) {
  const normalized = value?.toLowerCase() || "";

  if (normalized.includes("alta") || normalized.includes("duro") || normalized.includes("pesad")) {
    return 3;
  }

  if (normalized.includes("media ligera") || normalized.includes("ligera") || normalized.includes("baja") || normalized.includes("facil") || normalized.includes("fácil")) {
    return 1;
  }

  if (normalized.includes("media")) {
    return 2;
  }

  return 0;
}

function compareOptionalText(a: string | null, b: string | null) {
  return complexityRank(a) - complexityRank(b);
}

function overlapScore(left: string[], right: string[]) {
  const rightTerms = new Set(right);
  return left.filter((term) => rightTerms.has(term)).length;
}

function dateValue(value: string) {
  return new Date(value).getTime();
}
