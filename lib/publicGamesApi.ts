import type { CatalogGame, GameFilterInput } from "@/lib/catalog";
import { CATALOG_SORT_VALUES, filterGames, getEffectiveRatingScore } from "@/lib/catalog";
import { NextResponse } from "next/server";

export const PUBLIC_GAMES_DEFAULT_PAGE = 1;
export const PUBLIC_GAMES_DEFAULT_PAGE_SIZE = 20;
export const PUBLIC_GAMES_MAX_PAGE_SIZE = 100;

export type PublicGamesQuery = {
  page: number;
  pageSize: number;
  search?: string;
  category?: string[];
  mechanic?: string[];
  sort?: string;
};

export type PublicGameListItem = {
  id: string;
  slug: string;
  name: string;
  imageURL: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playingTime: number | null;
  minimumAge: number | null;
  rating: number | null;
};

export type PublicGamesResponse = {
  items: PublicGameListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
};

export type CatalogGamesPage = {
  games: CatalogGame[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type LoadCatalogGames = (input: GameFilterInput) => Promise<CatalogGamesPage>;

type QueryDetails = Record<string, string[]>;

export class PublicGamesQueryError extends Error {
  readonly details: QueryDetails;

  constructor(details: QueryDetails) {
    super("One or more query parameters are invalid.");
    this.name = "PublicGamesQueryError";
    this.details = details;
  }
}

export const publicGamesSortValues = CATALOG_SORT_VALUES;

export async function getPublicGamesResponse(
  searchParams: URLSearchParams,
  loadCatalogGames: LoadCatalogGames = filterGames
): Promise<PublicGamesResponse> {
  const query = parsePublicGamesQuery(searchParams);
  const result = await loadCatalogGames(toCatalogFilterInput(query));

  return toPublicGamesResponse(result);
}

export function createPublicGamesRouteHandler(loadCatalogGames?: LoadCatalogGames) {
  return async function GET(request: Request) {
    try {
      const response = await getPublicGamesResponse(new URL(request.url).searchParams, loadCatalogGames);
      return NextResponse.json(response);
    } catch (error) {
      if (error instanceof PublicGamesQueryError) {
        return NextResponse.json(invalidQueryResponse(error.details), { status: 400 });
      }

      console.error("Public games catalogue failed");
      return NextResponse.json(internalServerErrorResponse(), { status: 500 });
    }
  };
}

export function parsePublicGamesQuery(searchParams: URLSearchParams): PublicGamesQuery {
  const details: QueryDetails = {};
  const page = parseIntegerParam(searchParams.get("page"), "page", {
    defaultValue: PUBLIC_GAMES_DEFAULT_PAGE,
    min: 1,
    details
  });
  const pageSize = parseIntegerParam(searchParams.get("pageSize"), "pageSize", {
    defaultValue: PUBLIC_GAMES_DEFAULT_PAGE_SIZE,
    min: 1,
    max: PUBLIC_GAMES_MAX_PAGE_SIZE,
    details
  });
  const search = normalizeSingleParam(searchParams.get("search"));
  const sort = normalizeSingleParam(searchParams.get("sort"));

  if (sort && !isPublicGamesSortValue(sort)) {
    details.sort = [`Unsupported sort value. Supported values: ${publicGamesSortValues.join(", ")}.`];
  }

  if (Object.keys(details).length) {
    throw new PublicGamesQueryError(details);
  }

  return {
    page,
    pageSize,
    ...(search ? { search } : {}),
    category: getRepeatedValues(searchParams, "category"),
    mechanic: getRepeatedValues(searchParams, "mechanic"),
    ...(sort ? { sort } : {})
  };
}

export function toCatalogFilterInput(query: PublicGamesQuery): GameFilterInput {
  return {
    ...(query.search ? { q: query.search } : {}),
    ...(query.category?.length ? { category: query.category } : {}),
    ...(query.mechanic?.length ? { mechanic: query.mechanic } : {}),
    ...(query.sort ? { sort: query.sort } : {}),
    page: query.page,
    pageSize: query.pageSize
  };
}

export function toPublicGamesResponse(result: CatalogGamesPage): PublicGamesResponse {
  const page = toSafeInteger(result.page, PUBLIC_GAMES_DEFAULT_PAGE);
  const pageSize = toSafeInteger(result.pageSize, PUBLIC_GAMES_DEFAULT_PAGE_SIZE);
  const total = toSafeInteger(result.total, 0);
  const totalPages = toSafeInteger(result.totalPages, 0);

  return {
    items: result.games.map(toPublicGameListItem),
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages
    }
  };
}

export function toPublicGameListItem(game: CatalogGame): PublicGameListItem {
  return {
    id: String(game.id),
    slug: String(game.slug),
    name: String(game.title),
    imageURL: toNullableString(game.coverImageUrl),
    minPlayers: toNullableInteger(game.playersMin),
    maxPlayers: toNullableInteger(game.playersMax),
    playingTime: toNullableInteger(game.durationMax),
    minimumAge: toNullableInteger(game.ageValue),
    rating: toNullableNumber(getEffectiveRatingScore(game))
  };
}

export function invalidQueryResponse(details: QueryDetails = {}) {
  return {
    error: {
      code: "INVALID_QUERY_PARAMETERS",
      message: "One or more query parameters are invalid.",
      details
    }
  };
}

export function internalServerErrorResponse() {
  return {
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "The games catalogue could not be loaded."
    }
  };
}

function parseIntegerParam(
  value: string | null,
  key: string,
  options: {
    defaultValue: number;
    min: number;
    max?: number;
    details: QueryDetails;
  }
) {
  if (value === null) {
    return options.defaultValue;
  }

  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    options.details[key] = [`${key} must be an integer.`];
    return options.defaultValue;
  }

  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed < options.min) {
    options.details[key] = [`${key} must be greater than or equal to ${options.min}.`];
    return options.defaultValue;
  }

  if (options.max && parsed > options.max) {
    options.details[key] = [`${key} must be less than or equal to ${options.max}.`];
    return options.defaultValue;
  }

  return parsed;
}

function normalizeSingleParam(value: string | null) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function getRepeatedValues(searchParams: URLSearchParams, key: "category" | "mechanic") {
  return searchParams.getAll(key).map((value) => value.trim()).filter(Boolean);
}

function isPublicGamesSortValue(value: string): value is (typeof CATALOG_SORT_VALUES)[number] {
  return CATALOG_SORT_VALUES.includes(value as (typeof CATALOG_SORT_VALUES)[number]);
}

function toNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function toNullableInteger(value: unknown) {
  const numeric = toNullableNumber(value);
  return numeric === null ? null : Math.trunc(numeric);
}

function toNullableNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "bigint") {
    const numeric = Number(value);
    return Number.isSafeInteger(numeric) ? numeric : null;
  }

  if (value && typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    const numeric = value.toNumber();
    return typeof numeric === "number" && Number.isFinite(numeric) ? numeric : null;
  }

  return null;
}

function toSafeInteger(value: unknown, fallback: number) {
  const numeric = toNullableInteger(value);
  return numeric === null ? fallback : numeric;
}
