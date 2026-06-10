import test from "node:test";
import assert from "node:assert/strict";
import { buildEditorialSeedCopy } from "@/lib/editorialSeedCopy";

test("buildEditorialSeedCopy writes stronger shortDescription and description from available metadata", () => {
  const copy = buildEditorialSeedCopy({
    title: "El Señor de los Anillos: El Destino de la Comunidad",
    publisher: "Asmodee",
    playersLabel: "1-5",
    playtime: "60-90 min",
    minAge: 14,
    categories: ["Cooperativo", "Aventura"],
    mechanics: ["Cartas", "Gestión de mano"],
    themes: ["Fantasía"],
    features: ["Partidas narrativas con decisiones compartidas", "Cartas de personaje y presión de escenario"]
  });

  assert.match(copy.shortDescription, /juego cooperativo de cartas/i);
  assert.match(copy.shortDescription, /1-5 jugadores/i);
  assert.ok(!/meepletavern|importad|revisi[oó]n editorial/i.test(copy.shortDescription));

  assert.match(copy.description, /experiencia cooperativa/i);
  assert.match(copy.description, /aventura|fantasía/i);
  assert.ok(copy.description.length > copy.shortDescription.length);
  assert.ok(!/meepletavern|importad|revisi[oó]n editorial/i.test(copy.description));
});
