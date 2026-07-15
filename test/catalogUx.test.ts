import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("catalog page focuses the hero on search and defers results with a stable skeleton", () => {
  const page = readFileSync("app/juegos/page.tsx", "utf8");

  assert.doesNotMatch(page, /CommunityHeroWidget/);
  assert.doesNotMatch(page, /getPublicUsersPage/);
  assert.match(page, /<GameSearch query=\{filters\.q\} active=\{filters\} variant="hero" \/>/);
  assert.match(page, /<Suspense key=\{resultsKey\} fallback=\{<CatalogResultsSkeleton \/>\}>/);
});

test("catalog keeps search and filter context across interactions", () => {
  const search = readFileSync("components/GameSearch.tsx", "utf8");
  const filters = readFileSync("components/GameFilters.tsx", "utf8");
  const pagination = readFileSync("components/Pagination.tsx", "utf8");

  assert.match(search, /buildCatalogSearchParams\(active, \["q"\]\)/);
  assert.match(search, /type="hidden"/);
  assert.match(filters, /key === "page" \|\| key === "sort" \|\| key === "welcome"/);
  assert.match(pagination, /buildCatalogUrl/);
});

test("catalog cards avoid exposing internal placeholders as content", () => {
  const card = readFileSync("components/GameCard.tsx", "utf8");

  assert.doesNotMatch(card, /Jugadores pendiente/);
  assert.doesNotMatch(card, /Duración pendiente/);
  assert.doesNotMatch(card, /Dificultad pendiente/);
  assert.doesNotMatch(card, />MT</);
});

test("catalog search order includes title relevance before alphabetical fallback", () => {
  const catalog = readFileSync("lib/catalog.ts", "utf8");

  assert.match(catalog, /buildCatalogRawOrderBy\(filters\.sort, filters\.query\)/);
  assert.match(catalog, /catalogSearchRelevanceSql\(query\)/);
  assert.match(catalog, /when \$\{displayName\} = \$\{exactQuery\}/);
});
