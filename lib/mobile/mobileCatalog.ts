import { GameStatus, Prisma, TaxonomyType } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { canShowMedia } from "@/lib/mediaSafety";
import { sanitizeImportedList, sanitizeImportedTitle } from "@/lib/importedTextSanitizer";
import {
  publicGameDetailTag,
  PUBLIC_GAMES_LIST_TAG,
  PUBLIC_GAME_TAXONOMY_TAG
} from "@/lib/publicGameCache";
import { prisma } from "@/lib/prisma";
import { auditDataSource } from "@/lib/egressAudit";
import { getPublicGameDescription, getPublicReviewSummary } from "@/lib/publicEditorialCopy";
import { normalizeGameRatings } from "@/lib/ratings/gameRatings";
import { slugify } from "@/lib/slug";
import type {
  MobileAppliedFilters,
  MobileFiltersResponse,
  MobileGameDetail,
  MobileGameListItem,
  MobileGameOffer,
  MobileGamesResponse,
  MobileTaxonomyFilterItem,
  MobileTaxonomyItem
} from "@/lib/mobile/types";

export type MobileGameFilterInput = {
  q?: string;
  category: string[];
  mechanic: string[];
  theme: string[];
  players: string[];
  duration: string[];
  weight: string[];
  age: string[];
  sort?: string;
  page: number;
  limit: number;
};

const maxMobilePageSize = 50;
const mobileApiCacheHeaders = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800"
} as const;

export function mobilePublicCacheHeaders() {
  return mobileApiCacheHeaders;
}

const mobileFilters = {
  players: [
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3-4", value: "4" },
    { label: "Grupo", value: "6" }
  ],
  duration: [
    { label: "<30 min", value: "30" },
    { label: "<45 min", value: "45" },
    { label: "<60 min", value: "60" },
    { label: "<120 min", value: "120" },
    { label: "Largos", value: "long" }
  ],
  weight: [
    { label: "Ligera", value: "ligero" },
    { label: "Media", value: "medio" },
    { label: "Alta", value: "duro" }
  ],
  age: [
    { label: "7+", value: "7" },
    { label: "8+", value: "8" },
    { label: "10+", value: "10" },
    { label: "14+", value: "14" }
  ],
  sort: [
    { label: "Nombre", value: "nombre" },
    { label: "Valoración", value: "valoracion" },
    { label: "Fecha de añadido", value: "fecha" },
    { label: "Dificultad", value: "dificultad" }
  ]
} satisfies MobileFiltersResponse;

const mobileMediaAssetSelect = {
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

const mobileGameListSelect = {
  id: true,
  name: true,
  title: true,
  slug: true,
  coverImageUrl: true,
  imageUrl: true,
  imageStatus: true,
  primaryImageId: true,
  shortSummary: true,
  shortDescription: true,
  quickVerdict: true,
  minPlayers: true,
  maxPlayers: true,
  playtime: true,
  age: true,
  minAge: true,
  year: true,
  publisher: true,
  spanishPublisher: true,
  complexity: true,
  difficulty: true,
  categories: true,
  mechanics: true,
  themes: true,
  ratings: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
  mediaAssets: {
    where: {
      status: "approved",
      usage: "public"
    },
    select: mobileMediaAssetSelect,
    orderBy: [{ updatedAt: "desc" }],
    take: 1
  }
} satisfies Prisma.GameSelect;

const mobileGameSelect = {
  ...mobileGameListSelect,
  description: true,
  review: true,
  buyUrl: true,
  mediaAssets: {
    where: {
      status: "approved",
      usage: "public"
    },
    select: mobileMediaAssetSelect,
    orderBy: [{ updatedAt: "desc" }],
    take: 8
  },
  offers: {
    select: {
      sourceName: true,
      sourceDisplayName: true,
      storeName: true,
      price: true,
      currency: true,
      purchaseUrl: true,
      affiliateUrl: true,
      sourceUrl: true,
      fetchedAt: true
    },
    orderBy: [{ fetchedAt: "desc" }],
    take: 12
  }
} satisfies Prisma.GameSelect;

type MobileListDbGame = Prisma.GameGetPayload<{ select: typeof mobileGameListSelect }>;
type MobileDbGame = Prisma.GameGetPayload<{ select: typeof mobileGameSelect }>;

type MobileMappedGame = MobileGameDetail & {
  reviewSummary: string;
  complexity: string | null;
  categoryNames: string[];
  mechanicNames: string[];
  themeNames: string[];
  durationMax: number | null;
  ageValue: number | null;
  addedAt: string;
  publishedAt: string | null;
};

type TaxonomyLookup = {
  category: TermLookup;
  mechanic: TermLookup;
  theme: TermLookup;
};

type TermLookup = {
  byName: Map<string, MobileTaxonomyItem>;
  bySlug: Map<string, MobileTaxonomyItem>;
};

export function parseMobileGameFilters(searchParams: URLSearchParams): MobileGameFilterInput {
  const q = normalizeSingleFilter(searchParams.get("q"));
  const sort = normalizeSingleFilter(searchParams.get("sort"));

  return {
    ...(q ? { q } : {}),
    category: getFilterValues(searchParams, "category"),
    mechanic: getFilterValues(searchParams, "mechanic"),
    theme: getFilterValues(searchParams, "theme"),
    players: getFilterValues(searchParams, "players"),
    duration: getFilterValues(searchParams, "duration"),
    weight: getFilterValues(searchParams, "weight"),
    age: getFilterValues(searchParams, "age"),
    ...(sort ? { sort } : {}),
    page: parsePositiveInteger(searchParams.get("page"), 1),
    limit: Math.min(parsePositiveInteger(searchParams.get("limit"), 20), maxMobilePageSize)
  };
}

export async function getMobileGames(filters: MobileGameFilterInput): Promise<MobileGamesResponse> {
  const taxonomy = await getMobileTaxonomyLookup();
  const dbResult = await getMobileGamesFromDb(filters, taxonomy);
  if (dbResult) {
    return dbResult;
  }

  const dbGames = await getPublishedMobileDbGames();
  const games = dbGames.map((game) => toMobileMappedGame(game, taxonomy));
  const filteredGames = filterMobileGames(games, filters, taxonomy);
  const sortedGames = sortMobileGames(filteredGames, filters.sort);
  const total = sortedGames.length;
  const page = Math.max(1, filters.page);
  const limit = Math.min(Math.max(1, filters.limit), maxMobilePageSize);
  const offset = (page - 1) * limit;

  return auditDataSource("mobile.games.fallback", {
    items: sortedGames.slice(offset, offset + limit).map(toMobileGameListItem),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    },
    appliedFilters: buildAppliedFilters(filters)
  }, getMobileFilterAuditPayload(filters));
}

async function getMobileGamesFromDb(
  filters: MobileGameFilterInput,
  taxonomy: TaxonomyLookup
): Promise<MobileGamesResponse | null> {
  if (
    filters.duration.length ||
    filters.weight.length ||
    filters.age.length ||
    filters.sort === "valoracion" ||
    filters.sort === "dificultad"
  ) {
    return null;
  }

  const page = Math.max(1, filters.page);
  const limit = Math.min(Math.max(1, filters.limit), maxMobilePageSize);
  const where = buildMobileCatalogDbWhere(filters, taxonomy);
  const orderBy = filters.sort === "fecha"
    ? [{ publishedAt: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }] satisfies Prisma.GameOrderByWithRelationInput[]
    : [{ title: "asc" }, { name: "asc" }] satisfies Prisma.GameOrderByWithRelationInput[];
  const [total, dbGames] = await Promise.all([
    prisma.game.count({ where }),
    prisma.game.findMany({
      where,
      select: mobileGameListSelect,
      orderBy,
      skip: (page - 1) * limit,
      take: limit
    })
  ]);
  const items = dbGames.map((game) => toMobileGameListItem(toMobileMappedGame(game, taxonomy)));

  return auditDataSource("mobile.games.db", {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    },
    appliedFilters: buildAppliedFilters(filters)
  }, getMobileFilterAuditPayload(filters));
}

export async function getMobileGameBySlug(slug: string): Promise<MobileGameDetail | null> {
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    return null;
  }

  const [game, taxonomy] = await Promise.all([getPublishedMobileDbGameBySlug(normalizedSlug), getMobileTaxonomyLookup()]);

  return game ? toMobileGameDetail(toMobileMappedGame(game, taxonomy)) : null;
}

export async function getMobileCategories(): Promise<{ items: MobileTaxonomyFilterItem[] }> {
  return {
    items: await getMobileTaxonomyFilters(TaxonomyType.category)
  };
}

export async function getMobileMechanics(): Promise<{ items: MobileTaxonomyFilterItem[] }> {
  return {
    items: await getMobileTaxonomyFilters(TaxonomyType.mechanic)
  };
}

export function getMobileFilters(): MobileFiltersResponse {
  return mobileFilters;
}

async function getPublishedMobileDbGames() {
  return getCachedPublishedMobileDbGames();
}

const getCachedPublishedMobileDbGames = unstable_cache(
  async () => auditDataSource("mobile.publishedGameList.db", await prisma.game.findMany({
    where: { status: GameStatus.published },
    select: mobileGameListSelect,
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }]
  })),
  ["mobile-published-game-list"],
  { revalidate: 3600, tags: [PUBLIC_GAMES_LIST_TAG] }
);

const getPublishedMobileDbGameBySlug = (slug: string) => unstable_cache(
  async () => auditDataSource("mobile.gameBySlug.db", await prisma.game.findFirst({
    where: {
      slug,
      status: GameStatus.published
    },
    select: mobileGameSelect
  }), { slug }),
  ["mobile-game-by-slug", slug],
  { revalidate: 3600, tags: [publicGameDetailTag(slug)] }
)();

async function getMobileTaxonomyLookup(): Promise<TaxonomyLookup> {
  const terms = await getCachedMobileTaxonomyTerms();

  const lookup: TaxonomyLookup = {
    category: createTermLookup(),
    mechanic: createTermLookup(),
    theme: createTermLookup()
  };

  for (const term of terms) {
    const item = toMobileTaxonomyItem(term);
    lookup[term.type].byName.set(term.name, item);
    lookup[term.type].bySlug.set(term.slug, item);
  }

  return lookup;
}

const getCachedMobileTaxonomyTerms = unstable_cache(
  async () => auditDataSource("mobile.taxonomyTerms.db", await prisma.taxonomyTerm.findMany({
    where: {
      type: {
        in: [TaxonomyType.category, TaxonomyType.mechanic, TaxonomyType.theme]
      }
    },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      type: true,
      name: true,
      slug: true
    }
  })),
  ["mobile-taxonomy-terms"],
  { revalidate: 3600, tags: [PUBLIC_GAME_TAXONOMY_TAG] }
);

async function getMobileTaxonomyFilters(type: TaxonomyType) {
  const [terms, games] = await Promise.all([
    getCachedMobileTaxonomyTermsByType(type),
    getCachedMobileTaxonomyCountRows()
  ]);

  const counts = new Map<string, number>();

  for (const game of games) {
    const values =
      type === TaxonomyType.category
        ? sanitizeImportedList(game.categories, "categories")
        : sanitizeImportedList(game.mechanics, "mechanics");

    for (const value of values) {
      counts.set(value, (counts.get(value) || 0) + 1);
    }
  }

  return terms.map((term) => ({
    ...toMobileTaxonomyItem(term),
    gamesCount: counts.get(term.name) || 0
  }));
}

const getCachedMobileTaxonomyTermsByType = (type: TaxonomyType) => unstable_cache(
  async () => prisma.taxonomyTerm.findMany({
    where: { type },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true
    }
  }),
  ["mobile-taxonomy-filter-terms", type],
  { revalidate: 3600, tags: [PUBLIC_GAME_TAXONOMY_TAG] }
)();

const getCachedMobileTaxonomyCountRows = unstable_cache(
  async () => auditDataSource("mobile.taxonomyCountRows.db", await prisma.game.findMany({
    where: { status: GameStatus.published },
    select: {
      categories: true,
      mechanics: true
    }
  })),
  ["mobile-taxonomy-count-rows"],
  { revalidate: 3600, tags: [PUBLIC_GAMES_LIST_TAG, PUBLIC_GAME_TAXONOMY_TAG] }
);

function filterMobileGames(games: MobileMappedGame[], filters: MobileGameFilterInput, taxonomy: TaxonomyLookup) {
  const query = filters.q?.trim().toLowerCase();
  const categories = resolveTaxonomyFilterValues(filters.category, taxonomy.category);
  const mechanics = resolveTaxonomyFilterValues(filters.mechanic, taxonomy.mechanic);
  const themes = resolveTaxonomyFilterValues(filters.theme, taxonomy.theme);

  return games.filter((game) => {
    const matchesQuery = query
      ? [
          game.title,
          game.description,
          game.reviewSummary,
          game.complexity,
          ...game.categoryNames,
          ...game.mechanicNames,
          ...game.themeNames
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query)
      : true;
    const matchesPlayers = filters.players.length
      ? filters.players.some((value) => matchesPlayerFilter(game, value))
      : true;
    const matchesDuration = filters.duration.length
      ? filters.duration.some((value) => matchesDurationFilter(game, value))
      : true;
    const matchesWeight = filters.weight.length
      ? filters.weight.some((value) => matchesWeightFilter(game, value))
      : true;
    const matchesAge = filters.age.length
      ? filters.age.some((value) => (game.ageValue ? game.ageValue <= Number(value) : true))
      : true;
    const matchesCategories = categories.length
      ? categories.some((category) =>
          normalizeFilterText(category.original) === "familiar"
            ? game.categoryNames.some((value) => normalizeFilterText(value).includes("familiar"))
            : game.categoryNames.includes(category.name)
        )
      : true;
    const matchesMechanics = mechanics.length
      ? mechanics.some((mechanic) => game.mechanicNames.includes(mechanic.name))
      : true;
    const matchesThemes = themes.length
      ? themes.some((theme) => game.themeNames.includes(theme.name))
      : true;

    return (
      matchesQuery &&
      matchesPlayers &&
      matchesDuration &&
      matchesWeight &&
      matchesAge &&
      matchesCategories &&
      matchesMechanics &&
      matchesThemes
    );
  });
}

function buildMobileCatalogDbWhere(filters: MobileGameFilterInput, taxonomy: TaxonomyLookup): Prisma.GameWhereInput {
  const and: Prisma.GameWhereInput[] = [];
  const query = filters.q?.trim().toLowerCase();
  const categories = resolveTaxonomyFilterValues(filters.category, taxonomy.category);
  const mechanics = resolveTaxonomyFilterValues(filters.mechanic, taxonomy.mechanic);
  const themes = resolveTaxonomyFilterValues(filters.theme, taxonomy.theme);

  if (query) {
    and.push({
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
        { shortSummary: { contains: query, mode: "insensitive" } },
        { shortDescription: { contains: query, mode: "insensitive" } },
        { quickVerdict: { contains: query, mode: "insensitive" } },
        { complexity: { contains: query, mode: "insensitive" } },
        { difficulty: { contains: query, mode: "insensitive" } },
        { categories: { has: query } },
        { mechanics: { has: query } },
        { themes: { has: query } }
      ]
    });
  }

  if (categories.length) {
    and.push({
      OR: categories.map((category) =>
        normalizeFilterText(category.original) === "familiar"
          ? { categories: { hasSome: ["Familiar", "Familiares", category.name] } }
          : { categories: { has: category.name } }
      )
    });
  }

  if (mechanics.length) {
    and.push({ OR: mechanics.map((mechanic) => ({ mechanics: { has: mechanic.name } })) });
  }

  if (themes.length) {
    and.push({ OR: themes.map((theme) => ({ themes: { has: theme.name } })) });
  }

  const playerFilters = filters.players
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

function toMobileMappedGame(game: MobileListDbGame | MobileDbGame, taxonomy: TaxonomyLookup): MobileMappedGame {
  const title = sanitizeImportedTitle(game.title || game.name) || game.title || game.name;
  const shortDescription = game.shortDescription || game.shortSummary;
  const longDescription = "description" in game ? game.description : null;
  const longReview = "review" in game ? game.review : null;
  const quickVerdict = game.quickVerdict || longReview;
  const difficulty = game.difficulty || game.complexity;
  const categoryNames = sanitizeImportedList(game.categories, "categories");
  const mechanicNames = sanitizeImportedList(game.mechanics, "mechanics");
  const themeNames = sanitizeImportedList(game.themes, "themes");
  const publicDescription = getPublicGameDescription({
    title,
    shortDescription,
    shortSummary: game.shortSummary,
    description: longDescription,
    quickVerdict
  });
  const reviewSummary = getPublicReviewSummary({
    title,
    shortDescription,
    shortSummary: game.shortSummary,
    description: longDescription,
    quickVerdict
  });
  const duration = parseDuration(game.playtime);

  return {
    id: game.id,
    slug: game.slug,
    title,
    description: publicDescription,
    imageUrl: pickPublicImageUrl(game),
    rating: getEffectiveRatingScore(game.ratings),
    minPlayers: game.minPlayers,
    maxPlayers: game.maxPlayers,
    playingTime: duration.max,
    age: game.minAge || parseFirstNumber(game.age),
    year: game.year,
    publisher: game.spanishPublisher || game.publisher,
    categories: categoryNames.map((name) => resolveTaxonomyItem(name, taxonomy.category)),
    mechanics: mechanicNames.map((name) => resolveTaxonomyItem(name, taxonomy.mechanic)),
    offers: "offers" in game ? buildMobileOffers(game) : [],
    reviewSummary,
    complexity: difficulty,
    categoryNames,
    mechanicNames,
    themeNames,
    durationMax: duration.max,
    ageValue: game.minAge || parseFirstNumber(game.age),
    addedAt: toIsoString(game.createdAt) || new Date().toISOString(),
    publishedAt: toIsoString(game.publishedAt)
  };
}

function toMobileGameListItem(game: MobileMappedGame): MobileGameListItem {
  return {
    id: game.id,
    slug: game.slug,
    title: game.title,
    description: game.description,
    imageUrl: game.imageUrl,
    rating: game.rating,
    minPlayers: game.minPlayers,
    maxPlayers: game.maxPlayers,
    playingTime: game.playingTime,
    categories: game.categories,
    mechanics: game.mechanics
  };
}

function toMobileGameDetail(game: MobileMappedGame): MobileGameDetail {
  return {
    ...toMobileGameListItem(game),
    age: game.age,
    year: game.year,
    publisher: game.publisher,
    offers: game.offers
  };
}

function buildMobileOffers(game: MobileDbGame): MobileGameOffer[] {
  const offers = game.offers.flatMap((offer) => {
    const url = offer.affiliateUrl || offer.purchaseUrl || offer.sourceUrl;

    if (!url) {
      return [];
    }

    return [
      {
        source: offer.storeName || offer.sourceDisplayName || offer.sourceName || "Tienda",
        price: typeof offer.price === "number" && Number.isFinite(offer.price) ? offer.price : null,
        currency: offer.currency || "EUR",
        url
      }
    ];
  });

  if (!offers.length && game.buyUrl) {
    return [{ source: "Comprar", price: null, currency: "EUR", url: game.buyUrl }];
  }

  const seen = new Set<string>();
  return offers.filter((offer) => {
    const key = `${offer.source}:${offer.url}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function sortMobileGames(games: MobileMappedGame[], sort = "nombre") {
  const sorted = [...games];

  if (sort === "valoracion") {
    return sortMobileGamesByEffectiveRating(sorted);
  }

  if (sort === "fecha") {
    return sorted.sort((a, b) => dateValue(b.publishedAt || b.addedAt) - dateValue(a.publishedAt || a.addedAt));
  }

  if (sort === "dificultad") {
    return sorted.sort((a, b) => complexityRank(b.complexity) - complexityRank(a.complexity) || a.title.localeCompare(b.title, "es"));
  }

  return sorted.sort((a, b) => a.title.localeCompare(b.title, "es"));
}

function sortMobileGamesByEffectiveRating(games: MobileMappedGame[]) {
  return [...games].sort((a, b) => {
    if (typeof a.rating === "number" && typeof b.rating === "number") {
      return b.rating - a.rating || a.title.localeCompare(b.title, "es");
    }

    if (typeof a.rating === "number") {
      return -1;
    }

    if (typeof b.rating === "number") {
      return 1;
    }

    return a.title.localeCompare(b.title, "es");
  });
}

function getEffectiveRatingScore(ratings: Prisma.JsonValue) {
  const normalizedRatings = normalizeGameRatings(ratings);
  return normalizedRatings.combined?.score ?? normalizedRatings.external?.score ?? null;
}

function buildAppliedFilters(filters: MobileGameFilterInput): MobileAppliedFilters {
  return {
    ...(filters.q ? { q: filters.q } : {}),
    ...appliedArrayFilter("category", filters.category),
    ...appliedArrayFilter("mechanic", filters.mechanic),
    ...appliedArrayFilter("theme", filters.theme),
    ...appliedArrayFilter("players", filters.players),
    ...appliedArrayFilter("duration", filters.duration),
    ...appliedArrayFilter("weight", filters.weight),
    ...appliedArrayFilter("age", filters.age),
    ...(filters.sort ? { sort: filters.sort } : {})
  };
}

function getMobileFilterAuditPayload(filters: MobileGameFilterInput) {
  return {
    page: filters.page,
    limit: filters.limit,
    sort: filters.sort || "nombre",
    hasQuery: Boolean(filters.q),
    categoryCount: filters.category.length,
    mechanicCount: filters.mechanic.length,
    themeCount: filters.theme.length,
    playersCount: filters.players.length,
    durationCount: filters.duration.length,
    weightCount: filters.weight.length,
    ageCount: filters.age.length
  };
}

function appliedArrayFilter(key: keyof MobileAppliedFilters, values: string[]) {
  if (!values.length) {
    return {};
  }

  return { [key]: values.length === 1 ? values[0] : values };
}

function resolveTaxonomyFilterValues(values: string[], lookup: TermLookup) {
  return values.map((value) => ({
    original: value,
    name: lookup.bySlug.get(value)?.name || lookup.byName.get(value)?.name || value
  }));
}

function resolveTaxonomyItem(name: string, lookup: TermLookup): MobileTaxonomyItem {
  return lookup.byName.get(name) || {
    id: slugify(name),
    slug: slugify(name),
    name,
    description: null
  };
}

function toMobileTaxonomyItem(term: { id: string; name: string; slug: string }): MobileTaxonomyItem {
  return {
    id: term.id,
    slug: term.slug,
    name: term.name,
    description: null
  };
}

function createTermLookup(): TermLookup {
  return {
    byName: new Map(),
    bySlug: new Map()
  };
}

function getFilterValues(searchParams: URLSearchParams, key: string) {
  return searchParams.getAll(key).map((value) => value.trim()).filter(Boolean);
}

function normalizeSingleFilter(value: string | null) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
}

function pickPublicImageUrl(game: MobileListDbGame | MobileDbGame) {
  const media = getOrderedMedia(game).find((asset) => canShowMedia(asset, asset.source));

  if (media) {
    return media.url;
  }

  if (game.imageStatus === "verified") {
    return game.coverImageUrl || game.imageUrl || null;
  }

  if (looksLikeUrl(game.primaryImageId)) {
    return game.primaryImageId;
  }

  return null;
}

function getOrderedMedia(game: MobileListDbGame | MobileDbGame) {
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

function looksLikeUrl(value: string | null | undefined) {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
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

function matchesPlayerFilter(game: MobileMappedGame, players: string) {
  const value = Number(players);

  if (!Number.isFinite(value) || !game.minPlayers || !game.maxPlayers) {
    return true;
  }

  return game.minPlayers <= value && game.maxPlayers >= value;
}

function matchesDurationFilter(game: MobileMappedGame, duration: string) {
  if (!game.durationMax) {
    return true;
  }

  const numericDuration = Number(duration);
  if (Number.isFinite(numericDuration) && numericDuration > 0) {
    return game.durationMax <= numericDuration;
  }

  return game.durationMax > 120;
}

function matchesWeightFilter(game: MobileMappedGame, weight: string) {
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

function normalizeFilterText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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

function dateValue(value: string) {
  return new Date(value).getTime();
}
