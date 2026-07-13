import test from "node:test";
import assert from "node:assert/strict";
import { getSafeInternalPath } from "@/lib/safeNextPath";

test("getSafeInternalPath accepts only same-origin paths", () => {
  assert.equal(getSafeInternalPath("/comunidad/tabernas?id=1#miembros"), "/comunidad/tabernas?id=1#miembros");
  assert.equal(getSafeInternalPath("//evil.example/path"), "/mi-perfil");
  assert.equal(getSafeInternalPath("/\\evil.example"), "/mi-perfil");
  assert.equal(getSafeInternalPath("https://evil.example"), "/mi-perfil");
  assert.equal(getSafeInternalPath(null, "/"), "/");
});
