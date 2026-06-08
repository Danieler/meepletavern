import { GameStatus, type Game } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { getTaxonomyTermNames } from "@/lib/taxonomy";

export type BuyLink = {
  store: string;
  url: string;
  label?: string;
};

export type CatalogGame = {
  id: string;
  slug: string;
  title: string;
  image: string;
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
};

export type Review = {
  id: string;
  slug: string;
  title: string;
  gameSlug: string;
  gameTitle: string;
  summary: string;
  body: string[];
  publishedAt: string;
  image: string;
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

export async function getCatalogGames() {
  const games = await getPublishedDbGames();
  return games.map(toCatalogGame);
}

export async function getGameBySlug(slug: string) {
  const game = await prisma.game.findFirst({
    where: {
      slug,
      status: GameStatus.published
    }
  });

  return game ? toCatalogGame(game) : null;
}

export async function getGamesBySlugs(slugs: string[]) {
  if (!slugs.length) {
    return [];
  }

  const games = await getCatalogGames();
  const wanted = slugs.map(normalizeIdentifier);

  return wanted
    .map((identifier) =>
      games.find((game) => normalizeIdentifier(game.slug) === identifier || normalizeIdentifier(game.title) === identifier)
    )
    .filter(Boolean) as CatalogGame[];
}

export async function getReviews() {
  const games = await prisma.game.findMany({
    where: {
      status: GameStatus.published,
      OR: [{ review: { not: null } }, { shortSummary: { not: null } }]
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }]
  });

  return games.map(toReview).filter(Boolean) as Review[];
}

export async function getReviewBySlug(slug: string) {
  const game = await prisma.game.findFirst({
    where: {
      slug,
      status: GameStatus.published,
      OR: [{ review: { not: null } }, { shortSummary: { not: null } }]
    }
  });

  return game ? toReview(game) : null;
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

  const games = await getCatalogGames();
  return games
    .filter((candidate) => candidate.slug !== game.slug)
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

async function getPublishedDbGames() {
  return prisma.game.findMany({
    where: { status: GameStatus.published },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }]
  });
}

function toCatalogGame(game: Game): CatalogGame {
  const duration = parseDuration(game.playtime);

  return {
    id: game.id,
    slug: game.slug,
    title: game.name,
    image: game.imageUrl || "",
    playersMin: game.minPlayers,
    playersMax: game.maxPlayers,
    playersLabel: formatPlayers(game),
    playtime: game.playtime,
    durationMin: duration.min,
    durationMax: duration.max,
    age: game.age,
    ageValue: parseFirstNumber(game.age),
    complexity: game.complexity,
    categories: game.categories,
    mechanics: game.mechanics,
    themes: game.themes,
    description: game.description || game.shortSummary || "",
    reviewSummary: game.shortSummary || game.review || game.description || "",
    pros: game.pros,
    cons: game.cons,
    recommendedFor: game.bestFor || "",
    notRecommendedFor: game.notFor || "",
    similarGames: [],
    buyLinks: game.buyUrl ? [{ store: "Comprar", url: game.buyUrl }] : [],
    addedAt: game.createdAt.toISOString(),
    updatedAt: game.updatedAt.toISOString(),
    publishedAt: game.publishedAt?.toISOString() || null
  };
}

function toReview(game: Game): Review | null {
  const summary = game.shortSummary || game.review || game.description;
  const bodySource = game.review || game.description || game.shortSummary;

  if (!summary || !bodySource) {
    return null;
  }

  return {
    id: `review-${game.id}`,
    slug: game.slug,
    title: `Reseña de ${game.name}`,
    gameSlug: game.slug,
    gameTitle: game.name,
    summary,
    body: splitParagraphs(bodySource),
    publishedAt: (game.publishedAt || game.updatedAt || game.createdAt).toISOString(),
    image: game.imageUrl || ""
  };
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

function formatPlayers(game: Game) {
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
