import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeAmazonImportedText, sanitizeImportedList, sanitizeImportedTitle } from "@/lib/importedTextSanitizer";

test("sanitizeAmazonImportedText rejects Amazon payment/legal fragments", () => {
  assert.equal(sanitizeAmazonImportedText("de seguridad de pagos encripta tu información durante la tra"), null);
  assert.equal(sanitizeAmazonImportedText("Tu información de seguridad de pagos se encripta durante la transacción"), null);
  assert.equal(sanitizeAmazonImportedText("Devoluciones gratis y envío gratis por Amazon"), null);
});

test("sanitizeImportedList keeps short game terms and removes garbage", () => {
  assert.deepEqual(
    sanitizeImportedList(
      ["Fantasía", "de seguridad de pagos encripta tu información durante la tra", "Roles ocultos", "Compra verificada"],
      "themes"
    ),
    ["Fantasía"]
  );
});

test("sanitizeImportedList normalizes category and mechanic aliases to canonical taxonomy", () => {
  assert.deepEqual(
    sanitizeImportedList(["Fiesta", "Familiares", "Campaña", "Colocación de losetas"], "categories"),
    ["Familiar", "Party", "Campaña / Legacy"]
  );
  assert.deepEqual(
    sanitizeImportedList(["Construcción de mazos", "Colección de sets", "Control de áreas", "Draft", "Dados"], "mechanics"),
    ["Deckbuilding", "Set collection", "Draft de cartas", "Area control"]
  );
});

test("sanitizeImportedTitle removes trailing Amazon-style codes", () => {
  assert.equal(sanitizeImportedTitle("Virus (TRG-01vir) (1138753.62)"), "Virus");
  assert.equal(sanitizeImportedTitle("Virus (edición española)"), "Virus (edición española)");
});

test("sanitizeImportedTitle normalizes noisy marketplace Risk title", () => {
  assert.equal(
    sanitizeImportedTitle(
      "Hasbro Gaming, Risk: El Juego de la Conquista Estratégica, Ejército de Juguete, Tablero Mundial, 42 Territorios, 6 Continentes, Estrategia, Juegos para Fiestas, Regalo Multijugador, Acción y Aventura"
    ),
    "Risk"
  );
});
