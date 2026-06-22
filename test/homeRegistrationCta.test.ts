import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("home promotes registration with concrete benefits for signed-out visitors", () => {
  const source = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /\/auth\?mode=register/);
  assert.match(source, /Crear cuenta gratis/);
  assert.match(source, /Guarda tu ludoteca/);
  assert.match(source, /Crear mi cuenta gratis/);
  assert.match(source, /!user \? \(/);
});
