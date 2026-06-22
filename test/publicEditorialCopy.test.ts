import test from "node:test";
import assert from "node:assert/strict";
import { getPublicGameDescription, getPublicReviewSummary } from "@/lib/publicEditorialCopy";

test("getPublicGameDescription strips trailing BGG source fragments", () => {
  assert.equal(
    getPublicGameDescription({
      title: "Brass: Birmingham",
      description: "Un euro exigente de desarrollo industrial y rutas. Página del Juego en la BGG."
    }),
    "Un euro exigente de desarrollo industrial y rutas."
  );
});

test("getPublicReviewSummary strips trailing BGG source fragments", () => {
  assert.equal(
    getPublicReviewSummary({
      title: "Ark Nova",
      shortDescription: "Construye tu zoo moderno y optimiza cartas. página del Juego en la BGG"
    }),
    "Construye tu zoo moderno y optimiza cartas."
  );
});
