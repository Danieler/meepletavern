import test from "node:test";
import assert from "node:assert/strict";
import { parseAmazonInput } from "@/lib/amazon/parseAmazonInput";

test("parseAmazonInput accepts a direct ASIN", () => {
  assert.deepEqual(parseAmazonInput("b0abc123de"), {
    asin: "B0ABC123DE",
    inputType: "asin"
  });
});

test("parseAmazonInput extracts ASINs from Amazon URLs", () => {
  assert.deepEqual(parseAmazonInput("https://www.amazon.es/dp/B0ABC123DE?ref_=abc"), {
    asin: "B0ABC123DE",
    inputType: "url"
  });
  assert.deepEqual(parseAmazonInput("https://www.amazon.es/gp/product/B0ABC123DE"), {
    asin: "B0ABC123DE",
    inputType: "url"
  });
  assert.deepEqual(parseAmazonInput("https://www.amazon.es/gp/aw/d/B07KV2215N/?_encoding=UTF8&ref_=sbx__sbtcd2_asin_0_title"), {
    asin: "B07KV2215N",
    inputType: "url"
  });
});

test("parseAmazonInput rejects invalid input", () => {
  assert.deepEqual(parseAmazonInput("https://example.com/product"), {
    asin: null,
    inputType: "invalid"
  });
});
