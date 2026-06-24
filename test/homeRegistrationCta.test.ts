import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("home promotes registration with concrete benefits for signed-out visitors", () => {
  const source = readFileSync(new URL("../components/home/HomeAuthControls.tsx", import.meta.url), "utf8");

  assert.match(source, /\/auth\?mode=register/);
  assert.match(source, /Crear mi ludoteca gratis/);
  assert.match(source, /ludoteca gratis/);
  assert.match(source, /{!user \? \(/);
});
