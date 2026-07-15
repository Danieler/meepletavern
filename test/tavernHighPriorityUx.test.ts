import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("first tavern creation leads directly to inviting members", () => {
  const dashboard = readFileSync("components/taverns/TavernDashboardClient.tsx", "utf8");

  assert.match(dashboard, /router\.push\(`\/comunidad\/tabernas\/\$\{payload\.tavern\.id\}\/miembros`\)/);
  assert.match(dashboard, /renderCreateTavernPanel\(true\)/);
  assert.match(dashboard, /Crea tu primera taberna/);
  assert.doesNotMatch(dashboard, /DashboardStep/);
});

test("sensitive tavern administration actions use an accessible confirmation dialog", () => {
  const dialog = readFileSync("components/taverns/TavernConfirmDialog.tsx", "utf8");
  const members = readFileSync("components/taverns/TavernMembersClient.tsx", "utf8");
  const settings = readFileSync("components/taverns/TavernSettingsClient.tsx", "utf8");

  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(dialog, /event\.key === "Escape"/);
  assert.match(members, /Podrá invitar y expulsar miembros, cambiar roles, renombrar la taberna y eliminarla definitivamente/);
  assert.match(members, /<TavernConfirmDialog/);
  assert.match(settings, /<TavernConfirmDialog/);
  assert.doesNotMatch(members, /window\.confirm/);
  assert.doesNotMatch(settings, /window\.confirm/);
});

test("tavern play copy describes registration rather than scheduling", () => {
  const plays = readFileSync("components/taverns/TavernPlaysClient.tsx", "utf8");

  assert.match(plays, /Registro de partida/);
  assert.match(plays, /Registrar partida/);
  assert.doesNotMatch(plays, /agendar|programar/i);
});
