import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import type { Game, Prisma } from "@prisma/client";
import { editorialCompletionSchema, type EditorialCompletion } from "@/lib/ai/editorialCompletionSchema";
import { getBedrockRuntimeClient } from "@/lib/ai/bedrockClient";
import { normalizeCandidateMetadata } from "@/lib/editorialMappers";

const DEFAULT_BEDROCK_MODEL = "amazon.nova-micro-v1:0";

type CompletionSourceContext = {
  title?: string | null;
  extractedDescription?: string | null;
  metadata?: Prisma.JsonValue;
};

export class EditorialCompletionError extends Error {
  constructor(
    readonly code: "aws_config" | "bedrock_error" | "invalid_json" | "invalid_schema",
    message: string
  ) {
    super(message);
    this.name = "EditorialCompletionError";
  }
}

export async function completeGameEditorialFieldsWithBedrock(
  game: Game,
  sourceContext?: CompletionSourceContext | null
): Promise<EditorialCompletion> {
  const modelId = process.env.BEDROCK_MODEL_ID?.trim() || DEFAULT_BEDROCK_MODEL;
  const promptInput = buildPromptInput(game, sourceContext);
  const client = readBedrockClient();

  let responseText = "";

  try {
    const response = await client.send(
      new ConverseCommand({
        modelId,
        system: [
          {
            text:
              "Eres un editor experto de juegos de mesa para TheMeepleTavern. " +
              "Escribe en español de España. " +
              "Todo el texto final debe quedar completamente en español de España. " +
              "Si alguna fuente o fragmento está en inglés, tradúcelo y adáptalo por completo antes de responder. " +
              "No mezcles idiomas dentro de una misma frase ni dentro del mismo campo. " +
              "Devuelve solo JSON válido, sin markdown. " +
              "Prioriza especialmente shortDescription y longDescription: deben sonar editoriales, útiles y naturales, no como placeholders. " +
              "No inventes datos objetivos. " +
              "No inventes precio, stock, autor, año, premios, componentes exactos ni expansiones. " +
              "No incluyas textos de Amazon sobre envío, pagos, devoluciones, garantía, ASIN, carrito, vendedores, ofertas o cupones. " +
              "Puedes inferir campos editoriales razonables como dificultad, categorías, mecánicas, temáticas, pros, contras, bestFor, notFor y FAQ. " +
              "Las categorías, mecánicas y temáticas deben ser etiquetas cortas. " +
              "Si faltan datos, omítelos con naturalidad en vez de escribir texto de relleno. " +
              "Si el título parece una editorial o marca, devuelve cleanTitle null y añade warning. " +
              "Devuelve confidence y warnings."
          }
        ],
        messages: [
          {
            role: "user",
            content: [
              {
                text:
                  "Devuelve exactamente un JSON con esta forma:\n" +
                  "{\n" +
                  '  "cleanTitle": string | null,\n' +
                  '  "shortDescription": string,\n' +
                  '  "longDescription": string,\n' +
                  '  "difficulty": "Muy fácil" | "Fácil" | "Media" | "Alta" | "Muy alta",\n' +
                  '  "categories": string[],\n' +
                  '  "mechanics": string[],\n' +
                  '  "themes": string[],\n' +
                  '  "bestFor": string,\n' +
                  '  "notFor": string,\n' +
                  '  "pros": string[],\n' +
                  '  "cons": string[],\n' +
                  '  "faq": [{ "question": string, "answer": string }],\n' +
                  '  "seoTitle": string,\n' +
                  '  "seoDescription": string,\n' +
                  '  "confidence": "low" | "medium" | "high",\n' +
                  '  "warnings": string[]\n' +
                  "}\n\n" +
                  "Restricciones:\n" +
                  "- Todo el contenido textual final debe estar íntegramente en español de España.\n" +
                  "- Si algún bullet, fact o descripción de origen está en inglés, tradúcelo antes de usarlo o descártalo si no aporta valor.\n" +
                  "- No devuelvas frases híbridas con partes en inglés y partes en español.\n" +
                  "- shortDescription debe ser un resumen editorial potente de 1 o 2 frases, útil para catálogo.\n" +
                  "- longDescription debe ser una descripción editorial desarrollada, concreta y sin frases tipo 'importado' o 'pendiente de revisión'.\n" +
                  "- Si conoces rango de jugadores, duración o edad, intégralos con naturalidad en shortDescription o longDescription.\n" +
                  "- Usa título limpio del juego, no la marca o editorial, salvo que sea realmente parte del nombre.\n" +
                  "- shortDescription máximo 300 caracteres.\n" +
                  "- longDescription máximo 1200 caracteres.\n" +
                  "- categories máximo 5.\n" +
                  "- mechanics máximo 6.\n" +
                  "- themes máximo 5.\n" +
                  "- pros entre 3 y 6.\n" +
                  "- cons entre 2 y 5.\n" +
                  "- faq entre 3 y 6 elementos.\n" +
                  "- seoTitle máximo 70 caracteres.\n" +
                  "- seoDescription máximo 160 caracteres.\n\n" +
                  `Datos del juego:\n${JSON.stringify(promptInput, null, 2)}`
              }
            ]
          }
        ],
        inferenceConfig: {
          maxTokens: 1600,
          temperature: 0.2,
          topP: 0.9
        }
      })
    );

    responseText = extractBedrockText(response.output?.message?.content);
  } catch (error) {
    throw new EditorialCompletionError(
      "bedrock_error",
      error instanceof Error ? `Bedrock failed: ${error.message}` : "Bedrock failed"
    );
  }

  const parsed = parseJsonResponse(responseText);
  const validation = editorialCompletionSchema.safeParse(parsed);

  if (!validation.success) {
    throw new EditorialCompletionError(
      "invalid_schema",
      `Bedrock returned JSON outside the editorial schema: ${validation.error.issues[0]?.message || "invalid payload"}`
    );
  }

  return validation.data;
}

function buildPromptInput(game: Game, sourceContext?: CompletionSourceContext | null) {
  const metadata = normalizeCandidateMetadata(sourceContext?.metadata);
  const amazonFeatures = toStringList(metadata.features).slice(0, 8).map((item) => truncate(item, 180));

  return {
    title: compact(game.title || game.name, 160),
    publisher: compact(game.publisher, 120),
    brand: compact(readMetadataString(metadata, ["brand", "manufacturer", "publisher"]), 120),
    amazonTitle: compact(readMetadataString(metadata, ["amazonTitleOriginal"]) || sourceContext?.title || null, 220),
    amazonDescription: compact(sourceContext?.extractedDescription, 700),
    amazonBullets: amazonFeatures,
    facts: extractFacts(metadata),
    description: compact(game.description, 700),
    shortDescription: compact(game.shortDescription || game.shortSummary, 320),
    players: game.players,
    age: compact(game.age || (typeof metadata.minAge === "number" ? `${metadata.minAge}+` : null), 80),
    duration: compact(game.playtime, 80),
    language: compact(readMetadataString(metadata, ["language"]) || readFact(metadata, ["Idioma", "Language"]), 80),
    existingCategories: game.categories.slice(0, 5),
    existingMechanics: game.mechanics.slice(0, 6),
    existingThemes: game.themes.slice(0, 5)
  };
}

function extractFacts(metadata: Prisma.JsonObject) {
  const facts = metadata.facts;

  if (!facts || typeof facts !== "object" || Array.isArray(facts)) {
    return {};
  }

  const cleanFacts = Object.entries(facts)
    .filter(([, value]) => typeof value === "string" && value.trim())
    .slice(0, 8)
    .map(([key, value]) => [key, truncate(String(value).replace(/\s+/g, " ").trim(), 120)]);

  return Object.fromEntries(cleanFacts);
}

function readBedrockClient() {
  try {
    return getBedrockRuntimeClient();
  } catch (error) {
    if (error instanceof Error && error.message === "Bedrock credentials are not configured") {
      throw new EditorialCompletionError("aws_config", error.message);
    }

    throw error;
  }
}

function extractBedrockText(content: Array<{ text?: string } | null | undefined> | undefined) {
  const text = (content || [])
    .map((item) => (item && typeof item.text === "string" ? item.text : ""))
    .join("")
    .trim();

  if (!text) {
    throw new EditorialCompletionError("bedrock_error", "Bedrock returned an empty response");
  }

  return text;
}

function parseJsonResponse(value: string) {
  const jsonCandidate = value.trim().startsWith("{")
    ? value.trim()
    : value.slice(value.indexOf("{"), value.lastIndexOf("}") + 1).trim();

  try {
    return JSON.parse(jsonCandidate);
  } catch {
    throw new EditorialCompletionError("invalid_json", "Bedrock returned invalid JSON");
  }
}

function compact(value: string | null | undefined, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized ? truncate(normalized, maxLength) : null;
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function toStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
}

function readMetadataString(metadata: Prisma.JsonObject, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function readFact(metadata: Prisma.JsonObject, keys: string[]) {
  const facts = metadata.facts;
  if (!facts || typeof facts !== "object" || Array.isArray(facts)) {
    return null;
  }

  for (const key of keys) {
    const value = facts[key as keyof typeof facts];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}
