import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("public navigation prioritizes core product areas", () => {
  const navigation = readFileSync("components/PublicNavigation.tsx", "utf8");
  const header = readFileSync("components/PublicHeader.tsx", "utf8");

  assert.match(navigation, /label: "Juegos"/);
  assert.match(navigation, /label: "Comunidad"/);
  assert.match(navigation, /label: "Mis tabernas"/);
  assert.match(navigation, /label: "Rankings"/);
  assert.match(navigation, /label: "Reseñas"/);
  assert.match(navigation, /profileLabel="Mi ludoteca"/);
  assert.doesNotMatch(navigation, /label: "Categorías"/);
  assert.doesNotMatch(navigation, /label: "Mecánicas"/);
  assert.match(header, /juegos · ludotecas · tabernas/);
});

test("mobile navigation behaves as a modal menu", () => {
  const navigation = readFileSync("components/PublicNavigation.tsx", "utf8");

  assert.match(navigation, /aria-modal="true"/);
  assert.match(navigation, /event\.key === "Escape"/);
  assert.match(navigation, /document\.body\.style\.overflow = "hidden"/);
  assert.match(navigation, /buttonRef\.current\?\.focus\(\)/);
});

test("taxonomy page avoids internal SEO wording", () => {
  const categoriesPage = readFileSync("app/categorias/page.tsx", "utf8");

  assert.doesNotMatch(categoriesPage, /puertas SEO/);
});
