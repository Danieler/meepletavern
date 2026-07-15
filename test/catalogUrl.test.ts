import test from "node:test";
import assert from "node:assert/strict";
import { buildCatalogSearchParams, buildCatalogUrl, catalogFilterValues } from "@/lib/catalogUrl";

test("catalog urls preserve active filters but drop transient params", () => {
  const href = buildCatalogUrl({
    q: "azul",
    category: ["Familiar", "Eurogame"],
    players: "2",
    page: "4",
    welcome: "true"
  });

  assert.equal(href, "/juegos?category=Familiar&category=Eurogame&players=2&q=azul");
});

test("catalog url mutations reset pagination and keep repeated values", () => {
  const href = buildCatalogUrl(
    {
      q: "terraforming",
      category: ["Eurogame", "Ciencia ficción"],
      mechanic: ["drafting"],
      page: "3"
    },
    { category: ["Ciencia ficción"], players: "4" }
  );

  assert.equal(href, "/juegos?mechanic=drafting&q=terraforming&category=Ciencia+ficci%C3%B3n&players=4");
});

test("catalog search params can intentionally include the next page", () => {
  assert.equal(buildCatalogUrl({ q: "root", page: "5" }, { page: "2" }), "/juegos?q=root&page=2");
  assert.equal(buildCatalogSearchParams({ q: "root", welcome: "true", page: "5" }).toString(), "q=root");
});

test("catalog filter values normalize strings, numbers and arrays", () => {
  assert.deepEqual(catalogFilterValues(["2", "", "4"]), ["2", "4"]);
  assert.deepEqual(catalogFilterValues(14), ["14"]);
  assert.deepEqual(catalogFilterValues(undefined), []);
});
