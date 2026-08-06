import { ChatBedrockConverse } from "@langchain/aws";
import { tavily } from "@tavily/core";
import { z } from "zod";
import {
  assertCatalogueAgentExternalCallsEnabled
} from "@/lib/catalogueAgent/config";
import type {
  CatalogueAgentModelInvoker,
  CatalogueAgentModelResponse,
  CatalogueSearchCandidate
} from "@/lib/catalogueAgent/catalogueAgent";

export const CATALOGUE_AGENT_DEFAULT_MODEL = "amazon.nova-micro-v1:0";

export const CATALOGUE_AGENT_IMPORT_DOMAINS = [
  "juegosdelamesaredonda.com",
  "dungeonmarvels.com",
  "mathom.es",
  "dracotienda.com",
  "zacatrus.es",
  "masqueoca.com"
] as const;

type BedrockToolChoiceValue = "auto" | "any" | "tool";

/**
 * LangChain 1.4.x does not infer tool-choice support for Amazon Nova models,
 * even though Bedrock Converse supports it. Without this explicit capability
 * list, bindTools() throws locally before a request reaches Bedrock.
 */
export function catalogueAgentToolChoiceSupport(modelId: string): BedrockToolChoiceValue[] | undefined {
  return modelId.includes("amazon.nova-") ? ["auto", "any", "tool"] : undefined;
}

const tavilySearchResultSchema = z.object({
  title: z.string().trim().min(1),
  url: z.string().url(),
  content: z.unknown().optional(),
  rawContent: z.unknown().optional(),
  score: z.number().finite().nullish()
});

export function createBedrockCatalogueModelInvoker(): CatalogueAgentModelInvoker {
  assertCatalogueAgentExternalCallsEnabled();
  const region = requiredEnvironmentValue("AWS_REGION");
  const accessKeyId = requiredEnvironmentValue("AWS_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnvironmentValue("AWS_SECRET_ACCESS_KEY");
  const sessionToken = process.env.AWS_SESSION_TOKEN?.trim();
  const modelId = process.env.BEDROCK_MODEL_ID?.trim() || CATALOGUE_AGENT_DEFAULT_MODEL;
  const supportsToolChoiceValues = catalogueAgentToolChoiceSupport(modelId);
  const model = new ChatBedrockConverse({
    model: modelId,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
      ...(sessionToken ? { sessionToken } : {})
    },
    temperature: 0,
    maxTokens: 1200,
    maxRetries: 0,
    timeout: 15_000,
    ...(supportsToolChoiceValues ? { supportsToolChoiceValues } : {}),
    additionalModelRequestFields: {
      inferenceConfig: { topK: 1 }
    }
  });

  return async ({ messages, tools, signal, toolChoice }) => {
    assertCatalogueAgentExternalCallsEnabled();
    const response = await model.bindTools(tools, { tool_choice: toolChoice }).invoke(messages, { signal });
    return response as CatalogueAgentModelResponse;
  };
}

export async function searchCatalogueCandidatesWithTavily(input: {
  query: string;
  signal: AbortSignal;
}): Promise<CatalogueSearchCandidate[]> {
  assertCatalogueAgentExternalCallsEnabled();
  throwIfAborted(input.signal);
  const apiKey = requiredEnvironmentValue("TAVILY_API_KEY");
  const client = tavily({ apiKey, clientName: "meepletavern-catalogue-agent" });
  const response = await raceWithAbort(
    client.search(input.query, {
      searchDepth: "basic",
      topic: "general",
      maxResults: 8,
      // Every selected result should be directly usable by the existing importer.
      // This avoids choosing a recommendation article for a game that none of the
      // configured store connectors can enrich.
      includeDomains: [...CATALOGUE_AGENT_IMPORT_DOMAINS],
      includeAnswer: false,
      includeRawContent: "text",
      includeImages: false,
      timeout: 12
    }),
    input.signal
  );

  return normalizeTavilyCatalogueResults(response.results);
}

export function normalizeTavilyCatalogueResults(input: unknown): CatalogueSearchCandidate[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.slice(0, 8).flatMap((value) => {
    const parsed = tavilySearchResultSchema.safeParse(value);
    if (!parsed.success) {
      return [];
    }

    const content = typeof parsed.data.content === "string" ? parsed.data.content : null;
    const rawContent = typeof parsed.data.rawContent === "string" ? parsed.data.rawContent : null;
    const score = parsed.data.score === null || parsed.data.score === undefined
      ? null
      : Math.max(0, Math.min(1, parsed.data.score));

    const candidate = {
      title: parsed.data.title,
      sourceUrl: parsed.data.url,
      snippet: [content, rawContent].filter(Boolean).join("\n\n").slice(0, 1200) || null,
      score
    };

    return isCatalogueImportUrl(candidate.sourceUrl) ? [candidate] : [];
  });
}

export function isCatalogueImportUrl(value: string) {
  try {
    const hostname = new URL(value).hostname.replace(/^www\./i, "").toLowerCase();
    return CATALOGUE_AGENT_IMPORT_DOMAINS.some((domain) =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

function requiredEnvironmentValue(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta la configuración ${name} para el agente de catálogo.`);
  }
  return value;
}

function raceWithAbort<T>(promise: Promise<T>, signal: AbortSignal) {
  if (signal.aborted) {
    return Promise.reject(abortReason(signal));
  }

  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(abortReason(signal));
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      }
    );
  });
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) {
    throw abortReason(signal);
  }
}

function abortReason(signal: AbortSignal) {
  return signal.reason instanceof Error ? signal.reason : new Error("La ejecución del agente excedió el tiempo permitido.");
}
