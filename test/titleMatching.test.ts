import test from "node:test";
import assert from "node:assert/strict";
import {
  assessBaseGameTitleMatch,
  canonicalGameTitleKey,
  isExpansionOrAccessory,
  isSuspiciousEditionVariant,
  normalizeTitleForMatching
} from "@/lib/import/titleMatching";

test("normalizeTitleForMatching normaliza apóstrofes sin perder palabras", () => {
  assert.equal(normalizeTitleForMatching("Can't Stop"), normalizeTitleForMatching("Cant Stop"));
  assert.equal(normalizeTitleForMatching("Aeon's End"), normalizeTitleForMatching("Aeons End"));
});

test("canonicalGameTitleKey conserva números reales del título", () => {
  assert.equal(canonicalGameTitleKey("Flip 7"), "flip-7");
  assert.equal(canonicalGameTitleKey("Flip7"), "flip-7");
});

test("assessBaseGameTitleMatch preserva números y rechaza secuelas numéricas incorrectas", () => {
  assert.equal(assessBaseGameTitleMatch("Flip 7", "Flip7").matched, true);
  assert.equal(assessBaseGameTitleMatch("Flip 7", "Flip 8").matched, false);
});

test("assessBaseGameTitleMatch protege títulos genéricos de una palabra", () => {
  assert.equal(assessBaseGameTitleMatch("Earth", "Earth Castellano").matched, true);
  assert.equal(assessBaseGameTitleMatch("Earth", "One Earth").matched, false);
  assert.equal(assessBaseGameTitleMatch("Earth", "Escape From Earth").matched, false);
  assert.equal(assessBaseGameTitleMatch("Earth", "Last Night on Earth").matched, false);
});

test("assessBaseGameTitleMatch acepta variantes base seguras", () => {
  assert.equal(assessBaseGameTitleMatch("Rummikub", "Rummikub Original").matched, true);
  assert.equal(assessBaseGameTitleMatch("Rummikub", "Rummikub Estándar").matched, true);
  assert.equal(assessBaseGameTitleMatch("Cluedo", "Cluedo Clásico Edición Refresh").matched, true);
});

test("assessBaseGameTitleMatch rechaza variantes sospechosas o expansiones", () => {
  assert.equal(assessBaseGameTitleMatch("Rummikub", "Rummikub Junior").matched, false);
  assert.equal(assessBaseGameTitleMatch("Rummikub", "Rummikub Compact Travel").matched, false);
  assert.equal(assessBaseGameTitleMatch("Cluedo", "Cluedo Junior").matched, false);
  assert.equal(assessBaseGameTitleMatch("Cluedo", "Cluedo Viaje").matched, false);
  assert.equal(assessBaseGameTitleMatch("Dice Forge", "Dice Forge Rebellion").matched, false);
  assert.equal(assessBaseGameTitleMatch("Earth", "Earth Abundancia").matched, false);
  assert.equal(isExpansionOrAccessory("Bang! El juego de dados: expansión"), true);
  assert.equal(isSuspiciousEditionVariant("Dobble Harry Potter"), true);
});

test("assessBaseGameTitleMatch aplica equivalencias controladas", () => {
  assert.equal(assessBaseGameTitleMatch("Bang! El juego de dados", "BANG! The Dice Game").matched, true);
  assert.equal(assessBaseGameTitleMatch("Bang! El juego de dados", "Bang! El juego de cartas").matched, false);
  assert.equal(assessBaseGameTitleMatch("Dobble El Señor de los Anillos", "Dobble El Hobbit y El Señor de los Anillos").matched, true);
  assert.equal(assessBaseGameTitleMatch("Dobble El Señor de los Anillos", "Dobble Harry Potter").matched, false);
});
