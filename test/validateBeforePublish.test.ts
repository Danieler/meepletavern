import test from "node:test";
import assert from "node:assert/strict";
import { buildEditorialAutofill } from "@/lib/editorialAutofill";
import { validateBeforePublish } from "@/lib/validateBeforePublish";

test("validateBeforePublish treats editorial fields as warnings, not blockers", () => {
  const game: Parameters<typeof validateBeforePublish>[0] = {
    name: "Los Hombres Lobo de Castronegro",
    title: "Los Hombres Lobo de Castronegro",
    slug: "los-hombres-lobo-de-castronegro",
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

test("buildEditorialAutofill infers social deduction fields for Hombres Lobo", () => {
  const autofill = buildEditorialAutofill({
    title: "Los Hombres Lobo de Castronegro",
    description: "Aldeanos, hombres lobo, roles ocultos, noche, votaciones y acusaciones.",
    players: { min: 8, max: 18 },
    playtime: "30 min",
    minAge: 10
  });

  assert.equal(autofill.difficulty, "Fácil");
  assert.deepEqual(autofill.categories, ["Fiesta", "Roles ocultos", "Deducción", "Faroleo"]);
  assert.ok(autofill.mechanics.includes("Deducción social"));
  assert.ok(autofill.bestFor.includes("Grupos grandes"));
  assert.ok(autofill.faq[0].answer.includes("8-18 jugadores"));
});
