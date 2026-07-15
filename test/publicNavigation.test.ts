import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("public navigation prioritizes core product areas", () => {
  const navigation = readFileSync("components/PublicNavigation.tsx", "utf8");
  const header = readFileSync("components/PublicHeader.tsx", "utf8");
  const authControls = readFileSync("components/PublicAuthControls.tsx", "utf8");

  assert.match(navigation, /label: "Juegos"/);
  assert.match(navigation, /label: "Comunidad"/);
  assert.match(navigation, /label: "Rankings"/);
  assert.match(navigation, /label: "Reseñas"/);
  assert.doesNotMatch(navigation, /href: "\/comunidad\/tabernas"/);
  assert.match(authControls, /href: "\/comunidad\/tabernas"/);
  assert.match(authControls, /label: "Mis tabernas"/);
  assert.match(navigation, /profileLabel="Mi ludoteca"/);
  assert.match(navigation, /header-nav-list/);
  assert.doesNotMatch(navigation, /navGroups/);
  assert.doesNotMatch(navigation, /label: "Categorías"/);
  assert.doesNotMatch(navigation, /label: "Mecánicas"/);
  assert.doesNotMatch(header, /juegos · ludotecas · tabernas/);
  assert.match(header, /public-header-layout/);
  assert.match(header, /header-search-button/);
  assert.match(navigation, /min-\[1120px\]:flex/);
  assert.doesNotMatch(navigation, /className="hidden xl:inline-flex"/);
});

test("mobile navigation behaves as a modal menu", () => {
  const navigation = readFileSync("components/PublicNavigation.tsx", "utf8");

  assert.match(navigation, /aria-modal="true"/);
  assert.match(navigation, /event\.key === "Escape"/);
  assert.match(navigation, /document\.body\.style\.overflow = "hidden"/);
  assert.match(navigation, /const menuButton = buttonRef\.current/);
  assert.match(navigation, /menuButton\?\.focus\(\)/);
  assert.match(navigation, /mobile-nav-panel-header/);
  assert.match(navigation, /aria-label="Cerrar menú"/);
  assert.match(navigation, /aria-labelledby=\{panelTitleId\}/);
  assert.match(navigation, /className="mt-2 grid gap-1"/);
  assert.doesNotMatch(navigation, /grid grid-cols-2 gap-2/);
});

test("authenticated mobile account actions are separated from public navigation", () => {
  const authControls = readFileSync("components/PublicAuthControls.tsx", "utf8");

  assert.match(authControls, /if \(vertical\)/);
  assert.match(authControls, /mobile-account-link/);
  assert.match(authControls, /mobile-account-signout/);
  assert.match(authControls, /Cerrar sesión/);
});

test("desktop account options are grouped in one accessible control", () => {
  const authControls = readFileSync("components/PublicAuthControls.tsx", "utf8");

  assert.match(authControls, /className="header-account-trigger"/);
  assert.match(authControls, /aria-expanded=\{accountOpen\}/);
  assert.match(authControls, /header-account-popover/);
  assert.match(authControls, /event\.key === "Escape"/);
  assert.match(authControls, /document\.addEventListener\("pointerdown"/);
  assert.match(authControls, /href: "\/mi-perfil\/listas"/);
  assert.match(authControls, /href: "\/mi-perfil\/ajustes"/);
  assert.doesNotMatch(authControls, />\s*Salir\s*</);
});

test("taxonomy page avoids internal SEO wording", () => {
  const categoriesPage = readFileSync("app/categorias/page.tsx", "utf8");

  assert.doesNotMatch(categoriesPage, /puertas SEO/);
});
