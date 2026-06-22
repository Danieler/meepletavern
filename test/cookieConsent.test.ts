import test from "node:test";
import assert from "node:assert/strict";
import {
  COOKIE_CONSENT_CHANGED_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
  COOKIE_CONSENT_VERSION
} from "../lib/cookieConsent";

test("cookie consent identifiers are stable and versioned", () => {
  assert.equal(COOKIE_CONSENT_STORAGE_KEY, "meepletavern_cookie_consent");
  assert.equal(COOKIE_CONSENT_CHANGED_EVENT, "meepletavern:cookie-consent-changed");
  assert.match(COOKIE_CONSENT_VERSION, /^\d{4}-\d{2}-\d{2}$/);
});
