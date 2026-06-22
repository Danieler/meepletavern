import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("feedback button renders an accessible lightweight trigger without an embed", () => {
  const source = readFileSync(new URL("../components/FeedbackButton.tsx", import.meta.url), "utf8");

  assert.match(source, /💬 Ayúdanos a mejorar/);
  assert.match(source, /aria-label="Enviar feedback sobre MeepleTavern"/);
  assert.match(source, /aria-haspopup="dialog"/);
  assert.doesNotMatch(source, /<iframe|<script/);
});

test("Tally is only injected from the explicit click flow", () => {
  const source = readFileSync(new URL("../components/FeedbackButton.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /useEffect/);
  assert.match(source, /document\.createElement\("script"\)/);
  assert.match(source, /if \(tallyLoadPromise\)/);
  assert.match(source, /await loadTallyOnDemand\(\)/);
  assert.match(source, /tally\.openPopup\(TALLY_FEEDBACK_FORM_ID/);
  assert.match(source, /catch \{\s+openFallbackForm\(\)/);
  assert.match(source, /https:\/\/tally\.so\/r\/WOQK0N/);
});
