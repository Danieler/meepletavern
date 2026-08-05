const { CANONICAL_CATEGORIES, CANONICAL_MECHANICS } = require("../../lib/taxonomy");

module.exports = (output) => {
  try {
    const parsed = JSON.parse(output);
    const categories = Array.isArray(parsed.categories) ? parsed.categories : [];
    const mechanics = Array.isArray(parsed.mechanics) ? parsed.mechanics : [];

    const invalidCategories = categories.filter((cat) => !CANONICAL_CATEGORIES.includes(cat));
    const invalidMechanics = mechanics.filter((mech) => !CANONICAL_MECHANICS.includes(mech));

    const isPass = invalidCategories.length === 0 && invalidMechanics.length === 0;

    return {
      pass: isPass,
      score: isPass ? 1 : 0,
      reason: isPass
        ? `All categories (${categories.length}) and mechanics (${mechanics.length}) are canonical.`
        : `Non-canonical terms detected: Invalid categories=[${invalidCategories.join(", ")}], Invalid mechanics=[${invalidMechanics.join(", ")}]`
    };
  } catch (err) {
    return {
      pass: false,
      score: 0,
      reason: `Error verifying canonical taxonomy: ${err instanceof Error ? err.message : String(err)}`
    };
  }
};
