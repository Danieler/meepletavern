import test from "node:test";
import assert from "node:assert/strict";
import { buildEditorialAutofill } from "@/lib/editorialAutofill";
import { getInitialPrimaryImageInput } from "@/lib/games/editorImage";
import { validateBeforePublish } from "@/lib/validateBeforePublish";

test("el editor reutiliza una portada importada aunque todavía no tenga MediaAsset", () => {
  assert.equal(getInitialPrimaryImageInput({
    primaryImageId: null,
    coverImageUrl: "https://example.com/pengoloo.jpg",
    imageUrl: "https://example.com/pengoloo-fallback.jpg"
  }), "https://example.com/pengoloo.jpg");

  assert.equal(getInitialPrimaryImageInput({
    primaryImageId: "asset-pengoloo",
    coverImageUrl: "https://example.com/pengoloo.jpg",
    imageUrl: null
  }), "asset-pengoloo");
});

test("validateBeforePublish treats editorial fields as warnings, not blockers", () => {
  const game: Parameters<typeof validateBeforePublish>[0] = {
    name: "Los Hombres Lobo de Castronegro",
    title: "Los Hombres Lobo de Castronegro",
    slug: "los-hombres-lobo-de-castronegro",
    year: null,
    players: { min: 8, max: 18 },
    minPlayers: 8,
    maxPlayers: 18,
    playtime: "30 min",
    minAge: 10,
    age: "10+",
    difficulty: null,
    complexity: null,
    categories: [],
    mechanics: [],
    themes: [],
    shortDescription: "Juego social de roles ocultos para grupos grandes.",
    shortSummary: null,
    description: null,
    quickVerdict: null,
    review: null,
    bestFor: null,
    notFor: null,
    pros: [],
    cons: [],
    faq: [],
    faqs: [],
    seoTitle: null,
    seoDescription: null,
    primaryImageId: null,
    imageFallbackAccepted: true
  };
  const validation = validateBeforePublish(game);

  assert.equal(validation.valid, true);
  assert.equal(validation.errors.length, 0);
  assert.ok(validation.warnings.some((warning) => warning.startsWith("Dificultad:")));
  assert.ok(validation.warnings.some((warning) => warning.startsWith("FAQ:")));
});

test("validateBeforePublish blocks invalid factual ranges and contaminated editorial copy", () => {
  const game: Parameters<typeof validateBeforePublish>[0] = {
    name: "Jamaica",
    title: "Jamaica",
    slug: "jamaica",
    year: 1,
    players: { min: 6, max: 2 },
    minPlayers: 6,
    maxPlayers: 2,
    playtime: "999 min",
    minAge: 99,
    age: "99+",
    difficulty: "Medio",
    complexity: null,
    categories: ["Familiar"],
    mechanics: ["Carreras"],
    themes: ["Piratas"],
    shortDescription: "Carrera pirata familiar con gestión de cartas.",
    shortSummary: null,
    description: "Carrera pirata familiar.",
    quickVerdict: "Una carrera accesible.",
    review: null,
    bestFor: "Grupos con moderador y roles ocultos.",
    notFor: "Pendiente",
    pros: ["Faroleo y eliminación"],
    cons: ["n/a"],
    faq: [],
    faqs: [],
    seoTitle: "Jamaica",
    seoDescription: "Ficha de Jamaica.",
    primaryImageId: "image-1",
    imageFallbackAccepted: false
  };

  const validation = validateBeforePublish(game);

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.startsWith("Año:")));
  assert.ok(validation.errors.some((error) => error.startsWith("Jugadores:")));
  assert.ok(validation.errors.some((error) => error.includes("contaminación editorial")));
  assert.ok(validation.errors.length >= 4);
});

test("buildEditorialAutofill infers social deduction fields for Hombres Lobo", () => {
  const autofill = buildEditorialAutofill({
    title: "Los Hombres Lobo de Castronegro",
    description: "Aldeanos, hombres lobo, roles ocultos, noche, votaciones y acusaciones.",
    players: { min: 8, max: 18 },
    playtime: "30 min",
    minAge: 10
  });

  assert.equal(autofill.difficulty, "Fácil");
  assert.deepEqual(autofill.categories, ["Party", "Deducción"]);
  assert.ok(autofill.mechanics.includes("Roles ocultos"));
  assert.ok(autofill.bestFor.includes("Grupos grandes"));
  assert.ok(autofill.faq[0].answer.includes("8 a 18 jugadores"));
});
