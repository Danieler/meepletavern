import { completeGameEditorialFieldsWithMetrics } from "../lib/ai/completeGameEditorialFieldsWithBedrock";
import { prisma } from "../lib/prisma";

export default class EditorialPipelineProvider {
  id() {
    return "meeple-editorial-pipeline";
  }

  async callApi(promptText: string, context?: { vars?: Record<string, any> }) {
    let slug = context?.vars?.slug;

    if (!slug) {
      const match = promptText.match(/Slug:\s*(\S+)/i);
      if (match) {
        slug = match[1];
      } else {
        try {
          const parsed = JSON.parse(promptText);
          slug = parsed.slug || promptText;
        } catch {
          slug = promptText.trim();
        }
      }
    }

    const game = await prisma.game.findFirst({ where: { slug } });
    if (!game) {
      return {
        output: "",
        error: `Game with slug "${slug}" not found in database.`
      };
    }

    try {
      const result = await completeGameEditorialFieldsWithMetrics(game);

      return {
        output: JSON.stringify(result.completion, null, 2),
        tokenUsage: {
          prompt: result.meta.inputTokens,
          completion: result.meta.outputTokens,
          total: result.meta.inputTokens + result.meta.outputTokens
        },
        latencyMs: result.meta.latencyMs
      };
    } catch (error) {
      return {
        output: "",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
