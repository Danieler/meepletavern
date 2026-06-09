import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeAmazonImportedText, sanitizeImportedList } from "@/lib/importedTextSanitizer";

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
    ["Fantasía", "Roles ocultos"]
  );
});
