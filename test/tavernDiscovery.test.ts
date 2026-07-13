import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("community explains private taverns before asking users to enter", () => {
  const discovery = readFileSync("components/taverns/TavernDiscoveryCard.tsx", "utf8");
  const community = readFileSync("app/comunidad/page.tsx", "utf8");

  assert.match(discovery, /La ludoteca de todo el grupo/);
  assert.match(discovery, /Una taberna es el espacio privado/);
  assert.match(discovery, /cuántas copias tenéis de cada juego/);
  assert.match(discovery, /sin modificar los contadores personales/);
  assert.match(discovery, /next="\/comunidad\/tabernas"/);
  assert.match(community, /<TavernDiscoveryCard \/>/);
});
