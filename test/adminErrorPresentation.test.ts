import test from "node:test";
import assert from "node:assert/strict";
import {
  formatImportError,
  presentAdminOperationError,
  safeAdminErrorLog
} from "@/lib/adminErrorPresentation";

test("presentAdminOperationError explica cómo resolver un slug duplicado", () => {
  const result = presentAdminOperationError({
    code: "P2002",
    meta: { target: ["slug"] },
    message: "Unique constraint failed"
  }, "game_publish", "ref-slug");

  assert.match(result.message, /identificador URL/i);
  assert.ok(result.details.some((detail) => /cambia/i.test(detail)));
  assert.equal(result.reference, "ref-slug");
});

test("presentAdminOperationError distingue un candidato procesado en otra pestaña", () => {
  const result = presentAdminOperationError(
    new Error("El candidato ya está convertido."),
    "candidate_conversion",
    "ref-candidate"
  );

  assert.match(result.message, /ya tiene una ficha/i);
  assert.ok(result.details.some((detail) => /ficha enlazada/i.test(detail)));
});

test("presentAdminOperationError no expone el detalle técnico desconocido al administrador", () => {
  const result = presentAdminOperationError(
    new Error("provider failed with token=secret-token"),
    "game_save",
    "ref-private"
  );

  assert.doesNotMatch(result.message, /secret-token/);
  assert.ok(result.details.some((detail) => detail.includes("ref-private")));
});

test("formatImportError convierte bloqueos HTTP y timeouts en instrucciones útiles", () => {
  assert.match(
    formatImportError(new Error("[Tienda] No se pudo leer la ficha original (403): forbidden")),
    /rechazó el acceso/i
  );
  assert.match(
    formatImportError(new Error("request timed out after 10000ms")),
    /tardó demasiado/i
  );
  assert.match(
    formatImportError(new Error("La ficha de tienda seleccionada no corresponde al título elegido")),
    /producto distinto/i
  );
});

test("formatImportError conserva errores de entrada claros y oculta fallos internos", () => {
  assert.match(
    formatImportError(new Error("La URL no pertenece a la fuente Zacatrus.")),
    /selecciona la tienda correcta/i
  );
  assert.doesNotMatch(
    formatImportError(new Error("AWS secret AKIAABCDEFGHIJKLMNOP provider exploded")),
    /AKIA|provider exploded/i
  );
});

test("safeAdminErrorLog redacta credenciales conocidas", () => {
  const log = safeAdminErrorLog(new Error("Bearer abc.def tvly-super-secret AKIAABCDEFGHIJKLMNOP"));

  assert.doesNotMatch(log.message, /abc\.def|tvly-super-secret|AKIAABCDEFGHIJKLMNOP/);
  assert.match(log.message, /ocult/i);
});
