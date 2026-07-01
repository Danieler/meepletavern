import test from "node:test";
import assert from "node:assert/strict";
import {
  buildInstagramHubUrl,
  buildInstagramReviewHref,
  buildInstagramReviewUrl,
  buildReviewInstagramCaption,
  normalizeInstagramHashtags
} from "../lib/instagramSharing";

test("instagram review caption includes hashtags and finishes with link in bio", () => {
  const caption = buildReviewInstagramCaption({
    authorName: "Admin MeepleTavern",
    gameTitle: "Azul: Pabellon de Verano",
    hashtags: "#eurogames, juegosdemesa #MesaBonita",
    rating: 8.4,
    reviewTitle: "Azul Pabellon de Verano: resena",
    summary: "Una reseña directa para saber si encaja en tu mesa."
  });

  assert.match(caption, /Link in bio\./);
  assert.ok(caption.trim().endsWith("Link in bio."));
  assert.match(caption, /Nota MeepleTavern: 8\.4\/10/);
  assert.match(caption, /#eurogames/);
  assert.match(caption, /#juegosdemesa/);
  assert.match(caption, /#MeepleTavern/);
  assert.match(caption, /#AzulPabellonDeVerano/);
  assert.ok(caption.length <= 2200);
});

test("instagram hashtag normalization deduplicates and adds defaults", () => {
  assert.deepEqual(
    normalizeInstagramHashtags("#BoardGames boardgames, party-games", ["Toma 6"]).slice(0, 5),
    ["#BoardGames", "#partygames", "#MeepleTavern", "#JuegosDeMesa", "#ResenasJuegosDeMesa"]
  );
});

test("instagram URL helpers create stable campaign links", () => {
  assert.equal(
    buildInstagramHubUrl("https://meepletavern.com/"),
    "https://meepletavern.com/instagram?utm_source=instagram&utm_medium=social&utm_campaign=link_in_bio"
  );
  assert.equal(
    buildInstagramReviewUrl("azul", "https://meepletavern.com", "caption"),
    "https://meepletavern.com/resenas/azul?utm_source=instagram&utm_medium=social&utm_campaign=review&utm_content=caption"
  );
  assert.equal(
    buildInstagramReviewHref("azul", "featured_review"),
    "/resenas/azul?utm_source=instagram&utm_medium=social&utm_campaign=link_in_bio&utm_content=featured_review"
  );
});
