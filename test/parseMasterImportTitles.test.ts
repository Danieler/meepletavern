import assert from "node:assert/strict";
import test from "node:test";
import { parseMasterImportTitles } from "@/lib/import/parseMasterImportTitles";

test("parseMasterImportTitles accepts one title per line and removes bullets", () => {
  assert.deepEqual(parseMasterImportTitles("- Cascadia\n2. Ark Nova\n• Brass Birmingham"), [
    "Cascadia",
    "Ark Nova",
    "Brass Birmingham"
  ]);
});

test("parseMasterImportTitles accepts JSON arrays", () => {
  assert.deepEqual(parseMasterImportTitles('["Catan", "Terraforming Mars", "Catan"]'), [
    "Catan",
    "Terraforming Mars"
  ]);
});

test("parseMasterImportTitles returns an empty array for blank input", () => {
  assert.deepEqual(parseMasterImportTitles("   "), []);
});
