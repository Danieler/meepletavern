import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { getMobileGameFilterError } from "@/lib/mobile/mobileCatalog";

test("catalog middleware stops oversized searches and extreme pages before rendering", async () => {
  const oversizedSearch = await middleware(
    new NextRequest(`http://localhost/juegos?q=${"x".repeat(81)}`)
  );
  const extremePage = await middleware(
    new NextRequest("http://localhost/juegos?page=101")
  );

  assert.equal(oversizedSearch.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.match(await oversizedSearch.text(), /Demasiados filtros combinados/);
  assert.equal(extremePage.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.match(await extremePage.text(), /Demasiados filtros combinados/);
});

test("catalog canonicalizes invalid scalar options without reaching the page", async () => {
  const response = await middleware(
    new NextRequest("http://localhost/juegos?sort=not-a-sort&welcome=no")
  );

  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "http://localhost/juegos");
});

test("mobile catalog rejects cache-fragmenting and unbounded filters", () => {
  assert.equal(getMobileGameFilterError(new URLSearchParams("unknown=value")), "Parámetro de catálogo no admitido.");
  assert.equal(getMobileGameFilterError(new URLSearchParams(`q=${"x".repeat(81)}`)), "Un filtro es demasiado largo.");
  assert.equal(getMobileGameFilterError(new URLSearchParams("q=catan&q=azul")), "Un parámetro simple está repetido.");
  assert.equal(getMobileGameFilterError(new URLSearchParams("page=101")), "Página no válida.");
  assert.equal(getMobileGameFilterError(new URLSearchParams("duration=anything")), "Valor de filtro no admitido.");
  assert.equal(getMobileGameFilterError(new URLSearchParams("q=catan&players=2&page=2&limit=20")), null);
});

test("catalog normalizes request input before building the database cache key", () => {
  const catalog = readFileSync("lib/catalog.ts", "utf8");
  const search = readFileSync("components/GameSearch.tsx", "utf8");

  assert.match(catalog, /const normalizedInput = normalizeCatalogFilterInput\(input\)/);
  assert.match(catalog, /getDeterministicFilterKey\(normalizedInput\)/);
  assert.match(catalog, /getCachedFilterGamesFromDb\(cacheKey, normalizedInput\)/);
  assert.match(search, /maxLength=\{80\}/);
});
