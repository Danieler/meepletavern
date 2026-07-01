import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeAnalyticsUrl, shouldTrackAnalyticsPath } from "../lib/analyticsPrivacy";

test("analytics excludes private and authoring routes", () => {
  assert.equal(shouldTrackAnalyticsPath("/admin/games"), false);
  assert.equal(shouldTrackAnalyticsPath("/auth"), false);
  assert.equal(shouldTrackAnalyticsPath("/mi-perfil/listas"), false);
  assert.equal(shouldTrackAnalyticsPath("/juegos/carcassonne/resena"), false);
  assert.equal(shouldTrackAnalyticsPath("/juegos/carcassonne"), true);
});

test("analytics removes queries and redacts public profile identifiers", () => {
  assert.equal(
    sanitizeAnalyticsUrl("https://meepletavern.com/u/daniel/listas/favoritos?ref=email"),
    "https://meepletavern.com/u/[username]/listas/[listSlug]"
  );
  assert.equal(
    sanitizeAnalyticsUrl("https://meepletavern.com/juegos?q=Daniel#resultados"),
    "https://meepletavern.com/juegos"
  );
});

test("analytics keeps safe campaign parameters for public attribution", () => {
  assert.equal(
    sanitizeAnalyticsUrl("https://meepletavern.com/resenas/azul?utm_source=instagram&utm_medium=social&utm_campaign=review&utm_content=azul&q=Daniel"),
    "https://meepletavern.com/resenas/azul?utm_source=instagram&utm_medium=social&utm_campaign=review&utm_content=azul"
  );
  assert.equal(
    sanitizeAnalyticsUrl("/instagram?utm_source=instagram&utm_campaign=link_in_bio&utm_content=<script>"),
    "/instagram?utm_source=instagram&utm_campaign=link_in_bio"
  );
});

test("analytics drops private URLs and safely normalizes relative paths", () => {
  assert.equal(sanitizeAnalyticsUrl("https://meepletavern.com/auth/callback?code=secret"), null);
  assert.equal(sanitizeAnalyticsUrl("/categorias?origen=menu"), "/categorias");
});
