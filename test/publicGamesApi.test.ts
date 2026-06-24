import test from "node:test";
import assert from "node:assert/strict";
import type { CatalogGame, GameFilterInput } from "@/lib/catalog";
import {
  getPublicGamesResponse,
  invalidQueryResponse,
  parsePublicGamesQuery,
  toPublicGameListItem,
  createPublicGamesRouteHandler,
  type CatalogGamesPage,
  type LoadCatalogGames
} from "@/lib/publicGamesApi";

test("default request returns page 1 with page size 20", async () => {
  let forwarded: GameFilterInput | undefined;
  const response = await getPublicGamesResponse(new URLSearchParams(), async (input) => {
    forwarded = input;
    return pageResult(input, []);
  });

  assert.equal(forwarded?.page, 1);
  assert.equal(forwarded?.pageSize, 20);
  assert.deepEqual(response, {
    items: [],
    pagination: {
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
      hasNextPage: false
    }
  });
});

test("pagination parameters are applied correctly", async () => {
  let forwarded: GameFilterInput | undefined;

  await getPublicGamesResponse(new URLSearchParams("page=2&pageSize=5"), async (input) => {
    forwarded = input;
    return pageResult(input, [catalogGame()]);
  });

  assert.equal(forwarded?.page, 2);
  assert.equal(forwarded?.pageSize, 5);
});

test("page=0 returns HTTP 400", async () => {
  const handler = createPublicGamesRouteHandler(emptyLoader);
  const response = await handler(new Request("https://meepletavern.test/api/v1/games?page=0"));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), invalidQueryResponse({ page: ["page must be greater than or equal to 1."] }));
});

test("a page size above 100 returns HTTP 400", async () => {
  const handler = createPublicGamesRouteHandler(emptyLoader);
  const response = await handler(new Request("https://meepletavern.test/api/v1/games?pageSize=101"));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), invalidQueryResponse({ pageSize: ["pageSize must be less than or equal to 100."] }));
});

test("search is forwarded correctly to catalogue logic", async () => {
  let forwarded: GameFilterInput | undefined;

  await getPublicGamesResponse(new URLSearchParams("search=%20Ark%20Nova%20"), async (input) => {
    forwarded = input;
    return pageResult(input, []);
  });

  assert.equal(forwarded?.q, "Ark Nova");
});

test("category filtering is forwarded correctly", async () => {
  let forwarded: GameFilterInput | undefined;

  await getPublicGamesResponse(new URLSearchParams("category=Familiar&category=Estrategia"), async (input) => {
    forwarded = input;
    return pageResult(input, []);
  });

  assert.deepEqual(forwarded?.category, ["Familiar", "Estrategia"]);
});

test("mechanic filtering is forwarded correctly", async () => {
  let forwarded: GameFilterInput | undefined;

  await getPublicGamesResponse(new URLSearchParams("mechanic=Deckbuilding&mechanic=Draft"), async (input) => {
    forwarded = input;
    return pageResult(input, []);
  });

  assert.deepEqual(forwarded?.mechanic, ["Deckbuilding", "Draft"]);
});

test("supported sorting is applied correctly", async () => {
  let forwarded: GameFilterInput | undefined;

  await getPublicGamesResponse(new URLSearchParams("sort=valoracion"), async (input) => {
    forwarded = input;
    return pageResult(input, []);
  });

  assert.equal(forwarded?.sort, "valoracion");
});

test("unsupported sorting returns HTTP 400", async () => {
  const handler = createPublicGamesRouteHandler(emptyLoader);
  const response = await handler(new Request("https://meepletavern.test/api/v1/games?sort=random"));
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, "INVALID_QUERY_PARAMETERS");
  assert.deepEqual(body.error.details.sort, [
    "Unsupported sort value. Supported values: nombre, valoracion, fecha, dificultad."
  ]);
});

test("unpublished games are not returned by the public API response", async () => {
  const response = await getPublicGamesResponse(new URLSearchParams(), async (input) =>
    pageResult(input, [catalogGame({ id: "published-game", slug: "published-game", title: "Published Game" })])
  );

  assert.deepEqual(response.items.map((item) => item.id), ["published-game"]);
  assert.equal("status" in response.items[0]!, false);
});

test("empty results return valid pagination metadata", async () => {
  const response = await getPublicGamesResponse(new URLSearchParams("page=3&pageSize=10"), async (input) =>
    pageResult(input, [])
  );

  assert.deepEqual(response.items, []);
  assert.deepEqual(response.pagination, {
    page: 3,
    pageSize: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false
  });
});

test("Prisma-specific values are serialized to JSON primitives", () => {
  const dto = toPublicGameListItem(
    catalogGame({
      durationMax: BigInt(60) as unknown as number,
      ratings: { combined: externalRating(8.25), users: { votesCount: 0, enabled: false } }
    })
  );

  assert.deepEqual(dto, {
    id: "game-1",
    slug: "ark-nova",
    name: "Ark Nova",
    imageURL: "https://cdn.example.com/ark-nova.webp",
    minPlayers: 1,
    maxPlayers: 4,
    playingTime: 60,
    minimumAge: 10,
    rating: 8.25
  });
  assert.equal(JSON.parse(JSON.stringify(dto)).rating, 8.25);
});

test("internal errors return a stable HTTP 500 contract without leaking details", async () => {
  const handler = createPublicGamesRouteHandler(async () => {
    throw new Error("DATABASE_URL=postgres://secret");
  });
  const response = await handler(new Request("https://meepletavern.test/api/v1/games"));
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.deepEqual(body, {
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "The games catalogue could not be loaded."
    }
  });
  assert.equal(JSON.stringify(body).includes("DATABASE_URL"), false);
});

test("parsePublicGamesQuery ignores unknown query parameters", () => {
  assert.deepEqual(parsePublicGamesQuery(new URLSearchParams("page=1&unknown=value")), {
    page: 1,
    pageSize: 20,
    category: [],
    mechanic: []
  });
});

function pageResult(input: GameFilterInput, games: CatalogGame[]): CatalogGamesPage {
  const pageSize = Number(input.pageSize);
  const page = Number(input.page);
  const total = games.length;

  return {
    games,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
}

const emptyLoader: LoadCatalogGames = async (input) => pageResult(input, []);

function catalogGame(overrides: Partial<CatalogGame> = {}): CatalogGame {
  return {
    id: "game-1",
    slug: "ark-nova",
    title: "Ark Nova",
    coverImageUrl: "https://cdn.example.com/ark-nova.webp",
    coverImageAlt: "Ark Nova cover",
    imageSourceName: "Publisher",
    imageSourceUrl: null,
    imageLicenseNote: null,
    imageStatus: "verified",
    placeholderKind: "general",
    playersMin: 1,
    playersMax: 4,
    playersLabel: "1-4",
    playtime: "60 min",
    durationMin: 60,
    durationMax: 60,
    age: "10+",
    ageValue: 10,
    complexity: "Media",
    categories: ["Estrategia"],
    mechanics: ["Draft"],
    themes: [],
    ratings: { combined: externalRating(8.2), users: { votesCount: 0, enabled: false } },
    description: "A game about conservation.",
    reviewSummary: "Strong tactical puzzle.",
    pros: [],
    cons: [],
    recommendedFor: "",
    notRecommendedFor: "",
    similarGames: [],
    buyLinks: [],
    galleryImages: [],
    howToPlayVideos: [],
    addedAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-02T00:00:00.000Z",
    publishedAt: "2026-06-03T00:00:00.000Z",
    ...overrides
  };
}

function externalRating(score: number) {
  return {
    score,
    label: "Muy recomendado" as const,
    confidence: "high" as const,
    source: "external_signals" as const,
    sourcesCount: 1,
    explanation: "Fixture rating.",
    lastCheckedAt: "2026-06-01T00:00:00.000Z",
    signals: []
  };
}
