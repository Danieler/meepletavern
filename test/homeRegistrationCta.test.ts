import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("home promotes registration with concrete benefits for signed-out visitors", () => {
  const source = readFileSync(new URL("../components/home/HomeAuthControls.tsx", import.meta.url), "utf8");

  assert.match(source, /AuthCtaButton context="home"/);
  assert.match(source, /buildAuthHref\(\{ mode: "register"/);
  assert.match(source, /Guardar mi primer juego/);
  assert.match(source, /Guardar mi ludoteca/);
  assert.match(source, /Gratis/);
  assert.match(source, /{!user \? \(/);
});
