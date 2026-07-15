import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("catalog search orders textual matches by relevance before alphabetical fallback", () => {
  const catalog = readFileSync("lib/catalog.ts", "utf8");

  assert.match(catalog, /buildCatalogRawOrderBy\(filters\.sort, filters\.query\)/);
  assert.match(catalog, /catalogSearchRelevanceSql\(query\)/);
  assert.match(catalog, /when \$\{displayName\} = \$\{exactQuery\}/);
  assert.match(catalog, /when \$\{displayName\} like \$\{startsQuery\}/);
  assert.match(catalog, /unnest\("categories"\)/);
  assert.match(catalog, /unnest\("mechanics"\)/);
});
