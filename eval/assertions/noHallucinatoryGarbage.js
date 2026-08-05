const { containsEditorialGarbage } = require("../../lib/import/sanitizeEditorialFields");

const CATALOG_CODE_PATTERN = /\b(TRG-\w+|\d{6,}\.\d{2}|ASIN|SKU|\bB0[A-Z0-9]{8}\b)\b/i;

module.exports = (output) => {
  try {
    const rawOutput = typeof output === "string" ? output : JSON.stringify(output);

    // 1. Check for e-commerce / Amazon garbage
    const hasGarbage = containsEditorialGarbage(rawOutput);

    // 2. Check for catalog codes or ASIN numbers
    const hasCatalogCodes = CATALOG_CODE_PATTERN.test(rawOutput);

    const isPass = !hasGarbage && !hasCatalogCodes;

    const issues = [];
    if (hasGarbage) issues.push("Detected Amazon/E-commerce shopping noise (shipping, seller coupons, ASIN, cart)");
    if (hasCatalogCodes) issues.push("Detected internal catalog/ASIN/SKU codes (e.g. TRG-01vir, B0xxxx)");

    return {
      pass: isPass,
      score: isPass ? 1 : 0,
      reason: isPass
        ? "No hallucinatory e-commerce noise or internal catalog codes detected."
        : `Hallucination warning: ${issues.join("; ")}`
    };
  } catch (err) {
    return {
      pass: false,
      score: 0,
      reason: `Error checking hallucinations: ${err instanceof Error ? err.message : String(err)}`
    };
  }
};
