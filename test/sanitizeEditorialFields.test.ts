import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeEditorialFields } from "@/lib/import/sanitizeEditorialFields";
import type { EditorialCompletion } from "@/lib/ai/editorialCompletionSchema";

test("sanitizeEditorialFields removes Amazon garbage from editorial output", () => {
  const input: EditorialCompletion = {
    cleanTitle: "Heat",
    shortDescription: "Juego de carreras con seguridad de pagos encripta tu información durante la transacción.",
    longDescription: "Carreras tácticas para grupos que disfrutan optimizando el riesgo.",
    difficulty: "Media",
    categories: ["Carreras", "Añadir al carrito"],
    mechanics: ["Gestión de mano", "Comprar ahora"],
    themes: ["Motor", "Amazon"],
    bestFor: "Mesas que quieren interacción directa.",
    notFor: "Quien busque una política de devoluciones flexible.",
    pros: ["Alta tensión en cada curva", "Oferta relámpago"],
    cons: ["Puede castigar errores tempranos", "Menos amable con análisis largos"],
    faq: [
      {
        question: "¿Tiene interacción?",
        answer: "Sí, compites por trazada y tempo."
      },
      {
        question: "¿Incluye envío gratis?",
        answer: "No debería guardarse."
      },
      {
        question: "¿Escala bien a dos?",
        answer: "Funciona, aunque brilla más con más coches."
      }
    ],
    seoTitle: "Heat",
    seoDescription: "Carreras tensas con gestión de mano y riesgo medido.",
    confidence: "high",
    warnings: ["Contiene cupón de Amazon"]
  };

  const sanitized = sanitizeEditorialFields(input);

  assert.equal(sanitized.shortDescription, "");
  assert.deepEqual(sanitized.categories, ["Carreras"]);
  assert.deepEqual(sanitized.mechanics, ["Gestión de mano"]);
  assert.deepEqual(sanitized.themes, ["Motor"]);
  assert.equal(sanitized.notFor, "");
  assert.deepEqual(sanitized.pros, ["Alta tensión en cada curva"]);
  assert.equal(sanitized.faq.length, 2);
  assert.deepEqual(sanitized.warnings, []);
});
