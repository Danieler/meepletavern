import { GameStatus, Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import type { GameImageFields } from "@/lib/gameImages";
import { canShowMedia, inferPlaceholderKind } from "@/lib/mediaSafety";
import { sanitizeImportedList } from "@/lib/importedTextSanitizer";
import { getPublicGameDescription, getPublicReviewSummary } from "@/lib/publicEditorialCopy";
import { prisma } from "@/lib/prisma";
import { normalizeGameRatings } from "@/lib/ratings/gameRatings";
import type { GameRatingsData } from "@/lib/ratings/types";
import { slugify } from "@/lib/slug";
import { getTaxonomyTermNames } from "@/lib/taxonomy";

export type BuyLink = {
  store: string;
  url: string;
  label?: string;
};

export type CatalogGame = GameImageFields & {
  id: string;
  slug: string;
  title: string;
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
  bggId: number | null;
  bggUrl: string | null;
  bggAverageRating: number | null;
  bggBayesAverageRating: number | null;
  bggUsersRated: number | null;
  bggRank: number | null;
  bggWeight: number | null;
  bggWeightVotes: number | null;
  bggYearPublished: number | null;
  bggMinPlayers: number | null;
  bggMaxPlayers: number | null;
  bggPlayingTime: number | null;
  bggMinAge: number | null;
  bggDesigners: string[];
  bggArtists: string[];
  bggPublishers: string[];
  bggCategories: string[];
  bggMechanics: string[];
  bggFamilies: string[];
  bggLastSyncedAt: string | null;
  description: string;
  reviewSummary: string;
  pros: string[];
  cons: string[];
  recommendedFor: string;
  notRecommendedFor: string;
  similarGames: string[];
  buyLinks: BuyLink[];
  addedAt: string;
  updatedAt: string;
  publishedAt: string | null;
  placeholderKind: string;
};

export type Review = GameImageFields & {
  id: string;
  slug: string;
  title: string;
  gameSlug: string;
  gameTitle: string;
  summary: string;
  body: string[];
  publishedAt: string;
};

export type Ranking = {
  slug: string;
  title: string;
  description: string;
  type: "all" | "category" | "mechanic" | "theme";
  term?: string;
};

export type GameFilterInput = {
  q?: string;
  players?: string;
  duration?: string;
  weight?: string;
  age?: string;
  category?: string;
  mechanic?: string;
  theme?: string;
  sort?: string;
};

const catalogGameSelect = {
  id: true,
  name: true,
  title: true,
  slug: true,
  coverImageUrl: true,
  imageUrl: true,
  coverImageAlt: true,
  imageSourceName: true,
  imageSourceUrl: true,
  imageLicenseNote: true,
  imageStatus: true,
  primaryImageId: true,
  description: true,
  review: true,
  shortSummary: true,
  shortDescription: true,
  quickVerdict: true,
  pros: true,
  cons: true,
  bestFor: true,
  notFor: true,
  minPlayers: true,
  maxPlayers: true,
  playtime: true,
  age: true,
  complexity: true,
  difficulty: true,
  categories: true,
  mechanics: true,
  themes: true,
  similarGames: true,
  buyUrl: true,
  ratings: true,
  bggId: true,
  bggUrl: true,
  bggAverageRating: true,
  bggBayesAverageRating: true,
  bggUsersRated: true,
  bggRank: true,
  bggWeight: true,
  bggWeightVotes: true,
  bggYearPublished: true,
  bggMinPlayers: true,
  bggMaxPlayers: true,
  bggPlayingTime: true,
  bggMinAge: true,
  bggDesigners: true,
  bggArtists: true,
  bggPublishers: true,
  bggCategories: true,
  bggMechanics: true,
  bggFamilies: true,
  bggLastSyncedAt: true,
  mediaAssets: {
    select: {
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
    }
  },
  createdAt: true,
  updatedAt: true,
  publishedAt: true
} satisfies Prisma.GameSelect;

type CatalogDbGame = Prisma.GameGetPayload<{ select: typeof catalogGameSelect }>;

export const getCatalogGames = cache(async function getCatalogGames() {
  const games = await getPublishedDbGames();
  return games.map(toCatalogGame);
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
  const games = await prisma.game.findMany({
    where: {
      status: GameStatus.published,
      OR: [
        { slug: { in: identifiers } },
        { title: { in: identifiers } },
        { name: { in: identifiers } }
      ]
    },
    select: catalogGameSelect,
    take: Math.max(identifiers.length, 4)
  });
  const catalogGames = games.map(toCatalogGame);

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

export async function getReviews(): Promise<Review[]> {
  // Las reseñas públicas son manuales. Los juegos del catálogo no deben convertirse
  // automáticamente en reseñas por tener texto editorial.
  return [] as Review[];
}

export async function getReviewBySlug(slug: string): Promise<Review | null> {
  void slug;
  return null;
}

export async function getRankings() {
  const games = await getCatalogGames();
  const categoryRankings = buildTermRankings("category", "Categoría", games, getGameCategories);
  const mechanicRankings = buildTermRankings("mechanic", "Mecánica", games, getGameMechanics);
  const themeRankings = buildTermRankings("theme", "Taberna", games, getGameThemes);

  return [
    {
      slug: "juegos-publicados",
      title: "Juegos publicados",
      description: "Todos los juegos publicados en la base de datos, ordenados para revisar el archivo real.",
      type: "all" as const
    },
    ...categoryRankings,
    ...mechanicRankings,
    ...themeRankings
  ];
}

export async function getRankingBySlug(slug: string) {
  const rankings = await getRankings();
  return rankings.find((ranking) => ranking.slug === slug) || null;
}

export async function getRankingGames(ranking: Ranking) {
  const games = await getCatalogGames();

  if (ranking.type === "category" && ranking.term) {
    return sortGames(
      games.filter((game) => game.categories.includes(ranking.term as string)),
      "fecha"
    );
  }

  if (ranking.type === "mechanic" && ranking.term) {
    return sortGames(
      games.filter((game) => game.mechanics.includes(ranking.term as string)),
      "fecha"
    );
  }

  if (ranking.type === "theme" && ranking.term) {
    return sortGames(
      games.filter((game) => game.themes.includes(ranking.term as string)),
      "fecha"
    );
  }

  return sortGames(games, "fecha");
}

export async function getPopularGames(limit = 6) {
  const games = await getCatalogGames();
  return sortGames(games, "fecha").slice(0, limit);
}

export async function getBeginnerGames(limit = 5) {
  const games = await getCatalogGames();

  return games
    .filter((game) => game.categories.some(isBeginnerTerm) || isLightComplexity(game.complexity))
    .sort((a, b) => compareOptionalText(a.complexity, b.complexity) || a.title.localeCompare(b.title, "es"))
    .slice(0, limit);
}

export async function getNewGames(limit = 5) {
  const games = await getCatalogGames();
  return sortGames(games, "fecha").slice(0, limit);
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
    .map(toCatalogGame)
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
  const query = input.q?.trim().toLowerCase();
  const category = input.category?.trim();
  const mechanic = input.mechanic?.trim();
  const theme = input.theme?.trim();
  const catalogGames = await getCatalogGames();

  const games = catalogGames.filter((game) => {
    const matchesQuery = query
      ? [
          game.title,
          game.description,
          game.reviewSummary,
          game.complexity,
          ...game.categories,
          ...game.mechanics,
          ...game.themes
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query)
      : true;
    const matchesPlayers = input.players ? matchesPlayerFilter(game, input.players) : true;
    const matchesDuration = input.duration ? matchesDurationFilter(game, input.duration) : true;
    const matchesWeight = input.weight ? matchesWeightFilter(game, input.weight) : true;
    const matchesAge = input.age && game.ageValue ? game.ageValue <= Number(input.age) : true;

    return (
      matchesQuery &&
      matchesPlayers &&
      matchesDuration &&
      matchesWeight &&
      matchesAge &&
      (!category || game.categories.includes(category)) &&
      (!mechanic || game.mechanics.includes(mechanic)) &&
      (!theme || game.themes.includes(theme))
    );
  });

  return sortGames(games, input.sort);
}

export function sortGames(games: CatalogGame[], sort = "nombre") {
  const sorted = [...games];

  if (sort === "fecha") {
    return sorted.sort((a, b) => dateValue(b.publishedAt || b.addedAt) - dateValue(a.publishedAt || a.addedAt));
  }

  if (sort === "dificultad") {
    return sorted.sort((a, b) => complexityRank(b.complexity) - complexityRank(a.complexity) || a.title.localeCompare(b.title, "es"));
  }

  return sorted.sort((a, b) => a.title.localeCompare(b.title, "es"));
}

export async function getCategoryTerms() {
  return getTaxonomyTermNames("category");
}

export async function getMechanicTerms() {
  return getTaxonomyTermNames("mechanic");
}

export async function getThemeTerms() {
  return getTaxonomyTermNames("theme");
}

export function termHref(type: "category" | "mechanic" | "theme", term: string) {
  const key = type === "category" ? "category" : type === "mechanic" ? "mechanic" : "theme";
  return `/juegos?${key}=${encodeURIComponent(term)}`;
}

const getPublishedDbGames = unstable_cache(
  async function getPublishedDbGames() {
    return prisma.game.findMany({
      where: { status: GameStatus.published },
      select: catalogGameSelect,
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }]
    });
  },
  ["published-db-games"],
  { revalidate: 300, tags: ["public-games"] }
);

const getPublishedDbGameBySlug = unstable_cache(
  async function getPublishedDbGameBySlug(slug: string) {
    return prisma.game.findFirst({
      where: {
        slug,
        status: GameStatus.published
      },
      select: catalogGameSelect
    });
  },
  ["published-db-game-by-slug"],
  { revalidate: 300, tags: ["public-games"] }
);

const getRelatedDbGames = unstable_cache(
  async function getRelatedDbGames(slug: string, categories: string[], mechanics: string[], themes: string[]) {
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
      select: catalogGameSelect,
      take: 12
    });
  },
  ["related-db-games"],
  { revalidate: 300, tags: ["public-games"] }
);

function toCatalogGame(game: CatalogDbGame): CatalogGame {
  const duration = parseDuration(game.playtime);
  const title = game.title || game.name;
  const shortDescription = game.shortDescription || game.shortSummary;
  const quickVerdict = game.quickVerdict || game.review;
  const difficulty = game.difficulty || game.complexity;
  const categories = sanitizeImportedList(game.categories, "categories");
  const mechanics = sanitizeImportedList(game.mechanics, "mechanics");
  const themes = sanitizeImportedList(game.themes, "themes");
  const publicSummary = getPublicReviewSummary({
    title,
    shortDescription,
    shortSummary: game.shortSummary,
    description: game.description,
    quickVerdict
  });
  const publicDescription = getPublicGameDescription({
    title,
    shortDescription,
    shortSummary: game.shortSummary,
    description: game.description,
    quickVerdict
  });
  const safeMedia = pickSafeMedia(game);
  const publicCoverImage = safeMedia?.url || resolveLegacyPublicImage(game);
  const placeholderKind = inferPlaceholderKind({
    categories,
    mechanics,
    themes,
    difficulty
  });

  return {
    id: game.id,
    slug: game.slug,
    title,
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
    ratings: normalizeGameRatings(game.ratings),
    bggId: game.bggId,
    bggUrl: game.bggUrl,
    bggAverageRating: game.bggAverageRating,
    bggBayesAverageRating: game.bggBayesAverageRating,
    bggUsersRated: game.bggUsersRated,
    bggRank: game.bggRank,
    bggWeight: game.bggWeight,
    bggWeightVotes: game.bggWeightVotes,
    bggYearPublished: game.bggYearPublished,
    bggMinPlayers: game.bggMinPlayers,
    bggMaxPlayers: game.bggMaxPlayers,
    bggPlayingTime: game.bggPlayingTime,
    bggMinAge: game.bggMinAge,
    bggDesigners: game.bggDesigners,
    bggArtists: game.bggArtists,
    bggPublishers: game.bggPublishers,
    bggCategories: game.bggCategories,
    bggMechanics: game.bggMechanics,
    bggFamilies: game.bggFamilies,
    bggLastSyncedAt: toIsoString(game.bggLastSyncedAt),
    description: publicDescription,
    reviewSummary: publicSummary,
    pros: game.pros,
    cons: game.cons,
    recommendedFor: game.bestFor || "",
    notRecommendedFor: game.notFor || "",
    similarGames: game.similarGames,
    buyLinks: game.buyUrl ? [{ store: "Comprar", url: game.buyUrl }] : [],
    addedAt: toIsoString(game.createdAt) || new Date().toISOString(),
    updatedAt: toIsoString(game.updatedAt) || new Date().toISOString(),
    publishedAt: toIsoString(game.publishedAt)
  };
}

function toReview(game: CatalogDbGame): Review | null {
  const title = game.title || game.name;
  const summary = getPublicReviewSummary({
    title,
    shortDescription: game.shortDescription,
    shortSummary: game.shortSummary,
    description: game.description,
    quickVerdict: game.quickVerdict || game.review
  });
  const bodySource = getPublicGameDescription({
    title,
    shortDescription: game.shortDescription,
    shortSummary: game.shortSummary,
    description: game.description,
    quickVerdict: game.quickVerdict || game.review
  });

  if (!summary || !bodySource) {
    return null;
  }

  const safeMedia = pickSafeMedia(game);
  const publicCoverImage = safeMedia?.url || resolveLegacyPublicImage(game);
  const difficulty = game.difficulty || game.complexity;
  const placeholderKind = inferPlaceholderKind({
    categories: game.categories,
    mechanics: game.mechanics,
    themes: game.themes,
    difficulty
  });

  return {
    id: `review-${game.id}`,
    slug: game.slug,
    title: `Reseña de ${title}`,
    gameSlug: game.slug,
    gameTitle: title,
    coverImageUrl: publicCoverImage,
    coverImageAlt: game.coverImageAlt || `Imagen editorial de ${title}`,
    imageSourceName: safeMedia?.source?.name || (publicCoverImage ? "URL editorial" : null),
    imageSourceUrl: safeMedia?.source?.baseUrl || null,
    imageLicenseNote: safeMedia?.attribution || null,
    imageStatus: publicCoverImage ? "verified" : "placeholder",
    placeholderKind,
    summary,
    body: splitParagraphs(bodySource),
    publishedAt: toIsoString(game.publishedAt || game.updatedAt || game.createdAt) || new Date().toISOString()
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

function pickSafeMedia(game: CatalogDbGame) {
  const orderedMedia = [...game.mediaAssets].sort((left, right) => {
    if (left.id === game.primaryImageId) {
      return -1;
    }

    if (right.id === game.primaryImageId) {
      return 1;
    }

    return 0;
  });

  return orderedMedia.find((asset) => canShowMedia(asset, asset.source)) || null;
}

function resolveLegacyPublicImage(game: CatalogDbGame) {
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

function buildTermRankings(
  type: "category" | "mechanic" | "theme",
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

function getGameCategories(game: CatalogGame) {
  return game.categories;
}

function getGameMechanics(game: CatalogGame) {
  return game.mechanics;
}

function getGameThemes(game: CatalogGame) {
  return game.themes;
}

function normalizeIdentifier(value: string) {
  return slugify(value);
}

function splitParagraphs(value: string) {
  return value
    .split(/\n{2,}|\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function formatPlayers(game: CatalogDbGame) {
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

  if (duration === "30") {
    return game.durationMax <= 30;
  }

  if (duration === "60") {
    return game.durationMax <= 60;
  }

  if (duration === "120") {
    return game.durationMax <= 120;
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

  if (normalized.includes("media")) {
    return 2;
  }

  if (normalized.includes("ligera") || normalized.includes("baja") || normalized.includes("facil") || normalized.includes("fácil")) {
    return 1;
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
