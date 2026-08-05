const { editorialCompletionSchema } = require("../../lib/ai/editorialCompletionSchema");

module.exports = (output) => {
  try {
    const parsed = JSON.parse(output);
    const result = editorialCompletionSchema.safeParse(parsed);
    return {
      pass: result.success,
      score: result.success ? 1 : 0,
      reason: result.success
        ? "JSON passed editorial Zod schema validation"
        : `Zod schema validation error: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`
    };
  } catch (err) {
    return {
      pass: false,
      score: 0,
      reason: `Invalid JSON output: ${err instanceof Error ? err.message : String(err)}`
    };
  }
};
