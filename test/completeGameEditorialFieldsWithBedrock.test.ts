import test from "node:test";
import assert from "node:assert/strict";
import { normalizeEditorialCompletionPayload } from "@/lib/ai/completeGameEditorialFieldsWithBedrock";

test("normalizeEditorialCompletionPayload unwraps nested Bedrock payloads and tolerates partial output", () => {
  const normalized = normalizeEditorialCompletionPayload({
    completion: {
      clean_title: "Sky Team",
      publisher: "Le Scorpion Masqué",
      min_players: 2,
      max_players: 2,
      min_play_time: 15,
      max_play_time: 20,
      min_age: 12,
      short_description: "Cooperativo para dos con tensión constante en cabina.",
      long_description:
        "Sky Team propone coordinar cada decisión de aterrizaje con información limitada y mucha presión compartida.",
      dificultad: "alta",
      categories: "Cooperativo, Estrategia",
      mechanics: ["Coordinación", "Gestión de dados"],
      tematicas: ["Aviación"],
      best_for: "Parejas o dúos que disfrutan decidir bajo presión.",
      not_for: "Quien prefiera solitarios multijugador o poca conversación en mesa.",
      pros: "Escala perfecto a dos\nTensión muy bien medida\nDecisiones compartidas",
      cons: ["Puede frustrar al principio", "Requiere compenetración"],
      faq: [
        { pregunta: "¿Es solo para dos?", respuesta: "Sí, está diseñado específicamente para dos personas." },
        { q: "¿Tiene rejugabilidad?", a: "Sí, los aeropuertos y módulos cambian bastante el ritmo." }
      ],
      meta_title: "Sky Team ficha editorial",
      confianza: "alta",
      avisos: "Revisar si el título incluye editorial",
      extraField: "Bedrock sometimes adds this"
    }
  });

  assert.equal(normalized.cleanTitle, "Sky Team");
  assert.equal(normalized.publisher, "Le Scorpion Masqué");
  assert.equal(normalized.minPlayers, 2);
  assert.equal(normalized.maxPlayers, 2);
  assert.equal(normalized.minPlayTime, 15);
  assert.equal(normalized.maxPlayTime, 20);
  assert.equal(normalized.minAge, 12);
  assert.equal(normalized.shortDescription, "Cooperativo para dos con tensión constante en cabina.");
  assert.equal(normalized.longDescription, "Sky Team propone coordinar cada decisión de aterrizaje con información limitada y mucha presión compartida.");
  assert.equal(normalized.difficulty, "Alta");
  assert.deepEqual(normalized.categories, ["Cooperativo", "Estrategia"]);
  assert.deepEqual(normalized.mechanics, ["Coordinación", "Gestión de dados"]);
  assert.deepEqual(normalized.themes, ["Aviación"]);
  assert.deepEqual(normalized.pros, [
    "Escala perfecto a dos",
    "Tensión muy bien medida",
    "Decisiones compartidas"
  ]);
  assert.deepEqual(normalized.cons, ["Puede frustrar al principio", "Requiere compenetración"]);
  assert.deepEqual(normalized.faq, [
    {
      question: "¿Es solo para dos?",
      answer: "Sí, está diseñado específicamente para dos personas."
    },
    {
      question: "¿Tiene rejugabilidad?",
      answer: "Sí, los aeropuertos y módulos cambian bastante el ritmo."
    }
  ]);
  assert.equal(normalized.seoTitle, "Sky Team ficha editorial");
  assert.equal(normalized.confidence, "high");
  assert.deepEqual(normalized.warnings, ["Revisar si el título incluye editorial"]);
});

test("normalizeEditorialCompletionPayload provides safe defaults for sparse responses", () => {
  const normalized = normalizeEditorialCompletionPayload({
    result: {
      cleanTitle: "",
      shortDescription: "Juego táctico de carreras con mucha lectura de mesa.",
      confidence: "unknown"
    }
  });

  assert.equal(normalized.cleanTitle, null);
  assert.equal(normalized.publisher, null);
  assert.equal(normalized.minPlayers, null);
  assert.equal(normalized.maxPlayers, null);
  assert.equal(normalized.minPlayTime, null);
  assert.equal(normalized.maxPlayTime, null);
  assert.equal(normalized.minAge, null);
  assert.equal(normalized.shortDescription, "Juego táctico de carreras con mucha lectura de mesa.");
  assert.equal(normalized.longDescription, "");
  assert.equal(normalized.difficulty, "");
  assert.deepEqual(normalized.categories, []);
  assert.deepEqual(normalized.faq, []);
  assert.equal(normalized.seoTitle, "");
  assert.equal(normalized.seoDescription, "Juego táctico de carreras con mucha lectura de mesa.");
  assert.equal(normalized.confidence, "medium");
  assert.deepEqual(normalized.warnings, []);
});
