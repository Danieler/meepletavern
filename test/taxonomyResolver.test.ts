import test from "node:test";
import assert from "node:assert/strict";
import { resolveImportTaxonomy } from "@/lib/import/taxonomyResolver";

test("taxonomy resolver maps the nine regression games without generic dice/card mistakes", () => {
  const cases = [
    {
      title: "Earth",
      text: "motor ecosistema hábitats flora cartas combos recursos crecimiento puntuación",
      categories: ["Estrategia", "Eurogame", "Cartas"],
      mechanics: ["Engine building", "Gestión de recursos", "Set collection"]
    },
    {
      title: "Can't Stop",
      text: "tentar la suerte plantarse seguir tirando dados columnas carrera",
      categories: ["Familiar"],
      mechanics: ["Push your luck"],
      notMechanics: ["Combate con dados"]
    },
    {
      title: "Rummikub",
      text: "números series grupos escaleras fichas clásico",
      categories: ["Familiar", "Abstracto", "Clásicos modernos"],
      mechanics: ["Set collection"],
      notMechanics: ["Gestión de mano"]
    },
    {
      title: "Flip 7",
      text: "robar cartas plantarse tentar la suerte no repetir número sumar puntos",
      categories: ["Party", "Familiar", "Cartas"],
      mechanics: ["Push your luck", "Set collection"]
    },
    {
      title: "Cluedo",
      text: "sospechoso arma habitación pistas resolver misterio",
      categories: ["Familiar", "Deducción", "Clásicos modernos"],
      mechanics: ["Deducción"]
    },
    {
      title: "Aeon's End",
      text: "cooperativo magos Némesis mazo cartas brechas hechizos",
      categories: ["Cooperativo", "Cartas", "Fantasía"],
      mechanics: ["Deckbuilding", "Cooperativo"],
      notMechanics: ["Gestión de mano"]
    },
    {
      title: "Dice Forge",
      text: "forjar dados caras de dados recursos oro fragmentos mejoras",
      categories: ["Familiar", "Estrategia"],
      mechanics: ["Gestión de recursos"],
      notMechanics: ["Combate con dados"]
    },
    {
      title: "Dobble El Señor de los Anillos",
      text: "símbolos rapidez visual encontrar coincidencia reflejos observación cartas",
      categories: ["Party", "Familiar", "Cartas", "Fantasía"],
      mechanics: []
    },
    {
      title: "Bang! El juego de dados",
      text: "sheriff forajidos renegado roles ocultos dados disparos cerveza",
      categories: ["Party", "Deducción", "Temático"],
      mechanics: ["Roles ocultos", "Push your luck"],
      notMechanics: ["Combate con dados"]
    }
  ];

  for (const entry of cases) {
    const resolution = resolveImportTaxonomy({
      requestedTitle: entry.title,
      descriptions: [entry.text]
    });

    for (const category of entry.categories) {
      assert.ok(resolution.categories.includes(category), `${entry.title} missing category ${category}`);
    }

    for (const mechanic of entry.mechanics) {
      assert.ok(resolution.mechanics.includes(mechanic), `${entry.title} missing mechanic ${mechanic}`);
    }

    for (const mechanic of entry.notMechanics || []) {
      assert.equal(resolution.mechanics.includes(mechanic), false, `${entry.title} should not include ${mechanic}`);
    }
  }
});

test("taxonomy resolver warns instead of inventing a speed-observation mechanic", () => {
  const resolution = resolveImportTaxonomy({
    requestedTitle: "Dobble El Señor de los Anillos",
    descriptions: ["símbolos rapidez visual encontrar coincidencia reflejos observación cartas"]
  });

  assert.deepEqual(resolution.mechanics, []);
  assert.equal(resolution.warnings.some((warning) => /observación|rapidez visual/i.test(warning)), true);
});
