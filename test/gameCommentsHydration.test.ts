import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("game comments waits for client hydration before rendering session-dependent copy", () => {
  const source = readFileSync(new URL("../components/GameComments.tsx", import.meta.url), "utf8");

  assert.match(source, /const \[hydrated, setHydrated\] = useState\(false\)/);
  assert.match(source, /useEffect\(\(\) => \{\s*setHydrated\(true\);\s*\}, \[\]\)/);
  assert.match(source, /!hydrated \? \([\s\S]*Comprobando tu sesión[\s\S]*: !isConfigured \?/);
});
