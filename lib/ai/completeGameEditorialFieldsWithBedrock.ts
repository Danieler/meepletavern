import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import type { Game, Prisma } from "@prisma/client";
import {
  EDITORIAL_CONFIDENCE_LEVELS,
  EDITORIAL_DIFFICULTIES,
  editorialCompletionSchema,
  type EditorialCompletion
} from "@/lib/ai/editorialCompletionSchema";
import { getBedrockRuntimeClient } from "@/lib/ai/bedrockClient";
import { normalizeCandidateMetadata } from "@/lib/editorialMappers";
import { sanitizeImportedTitle } from "@/lib/importedTextSanitizer";

const DEFAULT_BEDROCK_MODEL = "amazon.nova-lite-v1:0";
const EDITORIAL_DIFFICULTY_SET = new Set<string>(EDITORIAL_DIFFICULTIES);
const EDITORIAL_CONFIDENCE_SET = new Set<string>(EDITORIAL_CONFIDENCE_LEVELS);
const EDITORIAL_PAYLOAD_KEYS = ["completion", "editorial", "result", "data", "payload", "response"] as const;

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
              "Ignora y elimina cualquier código interno de catálogo o Amazon en el título o en la descripción, como (TRG-01vir), (1138753.62) o referencias parecidas. " +
              "Devuelve solo JSON válido, sin markdown. " +
              "Prioriza especialmente shortDescription y longDescription: deben sonar editoriales, útiles y naturales, no como placeholders. " +
              "No inventes datos objetivos. " +
              "No inventes precio, stock, autor, año, premios, componentes exactos ni expansiones. " +
              "No incluyas textos de Amazon sobre envío, pagos, devoluciones, garantía, ASIN, carrito, vendedores, ofertas o cupones. " +
              "Puedes inferir campos editoriales razonables como dificultad, categorías, mecánicas, temáticas, pros, contras, bestFor, notFor y FAQ. " +
              "Si el juego es conocido y el título coincide claramente con una edición real, también puedes completar jugadores, duración, edad y editorial usando conocimiento general fiable de catálogo. " +
              "Si no tienes suficiente seguridad en un dato objetivo, devuelve null en ese campo. " +
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
                  '  "publisher": string | null,\n' +
                  '  "minPlayers": number | null,\n' +
                  '  "maxPlayers": number | null,\n' +
                  '  "minPlayTime": number | null,\n' +
                  '  "maxPlayTime": number | null,\n' +
                  '  "minAge": number | null,\n' +
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
                  "- Elimina cualquier código interno de catálogo o Amazon en el título o en la descripción, como (TRG-01vir), (1138753.62) o referencias similares.\n" +
                  "- No copies referencias técnicas, ASIN, SKU, códigos de producto ni sufijos de inventario.\n" +
                  "- publisher debe ser la editorial o marca solo si aparece claramente en la fuente o se puede inferir con mucha seguridad.\n" +
                  "- minPlayers, maxPlayers, minPlayTime, maxPlayTime y minAge deben ir como número o null. Si no estás bastante seguro, devuelve null.\n" +
                  "- Si el título coincide claramente con un juego publicado y conoces su ficha estándar con seguridad alta, prioriza completar esos campos estructurados.\n" +
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
  const normalized = normalizeEditorialCompletionPayload(parsed);
  const validation = editorialCompletionSchema.safeParse(normalized);

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
  const sourceFeatures = toStringList(metadata.features).slice(0, 8).map((item) => truncate(item, 180));

  return {
    title: compact(sanitizeImportedTitle(game.title || game.name || ""), 160),
    publisher: compact(game.publisher, 120),
    brand: compact(readMetadataString(metadata, ["brand", "manufacturer", "publisher"]), 120),
    sourceTitle: compact(
      sanitizeImportedTitle(
        readMetadataString(metadata, ["sourceTitleOriginal", "amazonTitleOriginal"]) || sourceContext?.title || ""
      ),
      220
    ),
    sourceDescription: compact(sourceContext?.extractedDescription, 900),
    sourceBullets: sourceFeatures,
    sourceFacts: extractFacts(metadata),
    sourcePrice: readMetadataNumber(metadata, ["price"]),
    sourceCurrency: compact(readMetadataString(metadata, ["currency"]), 20),
    sourceAvailability: compact(readMetadataString(metadata, ["availability"]), 120),
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
  const trimmed = value.trim();
  const objectIndex = trimmed.indexOf("{");
  const arrayIndex = trimmed.indexOf("[");
  const startIndex = [objectIndex, arrayIndex].filter((index) => index >= 0).sort((left, right) => left - right)[0] ?? -1;
  const endIndex = Math.max(trimmed.lastIndexOf("}"), trimmed.lastIndexOf("]"));
  const jsonCandidate =
    trimmed.startsWith("{") || trimmed.startsWith("[")
      ? trimmed
      : startIndex >= 0 && endIndex > startIndex
        ? trimmed.slice(startIndex, endIndex + 1).trim()
        : trimmed;

  try {
    return JSON.parse(jsonCandidate);
  } catch {
    throw new EditorialCompletionError("invalid_json", "Bedrock returned invalid JSON");
  }
}

export function normalizeEditorialCompletionPayload(input: unknown): EditorialCompletion {
  const record = unwrapEditorialRecord(input);
  const cleanTitle = normalizeNullableString(readFirst(record, ["cleanTitle", "clean_title", "tituloLimpio", "titulo_limpio"]), 160);
  const shortDescription = normalizeString(
    readFirst(record, ["shortDescription", "short_description", "descripcionCorta", "descripcion_corta", "resumen", "summary"]),
    300
  );
  const longDescription = normalizeString(
    readFirst(record, ["longDescription", "long_description", "descripcionLarga", "descripcion_larga", "description"]),
    1200
  );
  const seoTitle = normalizeString(readFirst(record, ["seoTitle", "seo_title", "metaTitle", "meta_title"]), 70);
  const seoDescription = normalizeString(
    readFirst(record, ["seoDescription", "seo_description", "metaDescription", "meta_description"]),
    160
  );

  return {
    cleanTitle,
    publisher: normalizeNullableString(readFirst(record, ["publisher", "editorial", "brand", "marca"]), 120),
    minPlayers: normalizePositiveInt(readFirst(record, ["minPlayers", "min_players", "jugadoresMin", "jugadores_min"]), 20),
    maxPlayers: normalizePositiveInt(readFirst(record, ["maxPlayers", "max_players", "jugadoresMax", "jugadores_max"]), 20),
    minPlayTime: normalizePositiveInt(readFirst(record, ["minPlayTime", "min_play_time", "duracionMin", "duracion_min"]), 600),
    maxPlayTime: normalizePositiveInt(readFirst(record, ["maxPlayTime", "max_play_time", "duracionMax", "duracion_max"]), 600),
    minAge: normalizePositiveInt(readFirst(record, ["minAge", "min_age", "edadMin", "edad_min"]), 30),
    shortDescription,
    longDescription,
    difficulty: normalizeDifficulty(readFirst(record, ["difficulty", "dificultad"])),
    categories: normalizeStringList(readFirst(record, ["categories", "categorias"]), 5, 40),
    mechanics: normalizeStringList(readFirst(record, ["mechanics", "mecanicas"]), 6, 40),
    themes: normalizeStringList(readFirst(record, ["themes", "tematicas"]), 5, 40),
    bestFor: normalizeString(readFirst(record, ["bestFor", "best_for", "paraQuienEs", "para_quien_es"]), 260),
    notFor: normalizeString(readFirst(record, ["notFor", "not_for", "paraQuienNoEs", "para_quien_no_es"]), 260),
    pros: normalizeStringList(readFirst(record, ["pros", "ventajas"]), 6, 220),
    cons: normalizeStringList(readFirst(record, ["cons", "contras"]), 5, 220),
    faq: normalizeFaqItems(readFirst(record, ["faq", "faqs", "preguntasFrecuentes", "preguntas_frecuentes"])),
    seoTitle: seoTitle || buildFallbackSeoTitle(cleanTitle, shortDescription),
    seoDescription: seoDescription || normalizeString(shortDescription || longDescription, 160),
    confidence: normalizeConfidence(readFirst(record, ["confidence", "confianza"])),
    warnings: normalizeStringList(readFirst(record, ["warnings", "warning", "avisos", "notas"]), 12, 220)
  };
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

function unwrapEditorialRecord(input: unknown): Record<string, unknown> {
  if (isRecord(input)) {
    for (const key of EDITORIAL_PAYLOAD_KEYS) {
      if (isRecord(input[key])) {
        return input[key];
      }
    }

    return input;
  }

  if (Array.isArray(input)) {
    const firstRecord = input.find((item) => isRecord(item));
    if (firstRecord) {
      return unwrapEditorialRecord(firstRecord);
    }
  }

  return {};
}

function readFirst(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }

  return undefined;
}

function normalizeNullableString(value: unknown, maxLength: number) {
  const normalized = normalizeString(value, maxLength);
  return normalized || null;
}

function normalizeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return truncate(value.replace(/\s+/g, " ").trim(), maxLength);
}

function normalizePositiveInt(value: unknown, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const normalized = Math.trunc(value);
  return normalized > 0 && normalized <= max ? normalized : null;
}

function normalizeStringList(value: unknown, maxItems: number, maxLength: number) {
  const rawItems = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\r?\n|[,;]|(?:^|\s)[-•]\s+/)
      : [];

  const unique = new Set<string>();

  for (const item of rawItems) {
    const normalized = normalizeString(item, maxLength);
    if (!normalized) {
      continue;
    }

    unique.add(normalized);
    if (unique.size >= maxItems) {
      break;
    }
  }

  return [...unique];
}

function normalizeFaqItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      return {
        question: normalizeString(readFirst(item, ["question", "pregunta", "q"]), 140),
        answer: normalizeString(readFirst(item, ["answer", "respuesta", "a"]), 320)
      };
    })
    .filter(
      (item): item is { question: string; answer: string } =>
        Boolean(item && item.question && item.answer)
    )
    .slice(0, 6);
}

function normalizeDifficulty(value: unknown): EditorialCompletion["difficulty"] {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  if (EDITORIAL_DIFFICULTY_SET.has(normalized)) {
    return normalized as EditorialCompletion["difficulty"];
  }

  const lower = normalized.toLocaleLowerCase("es");
  if (lower === "muy facil") {
    return "Muy fácil";
  }

  const mappedDifficulty: Record<string, typeof EDITORIAL_DIFFICULTIES[number]> = {
    facil: "Fácil",
    media: "Media",
    medio: "Media",
    moderada: "Media",
    alta: "Alta",
    dificil: "Alta",
    "muy dificil": "Muy alta"
  };

  return mappedDifficulty[lower.replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ")] || "";
}

function normalizeConfidence(value: unknown): EditorialCompletion["confidence"] {
  if (typeof value !== "string") {
    return "medium";
  }

  const normalized = value.replace(/\s+/g, " ").trim().toLocaleLowerCase("en");
  if (EDITORIAL_CONFIDENCE_SET.has(normalized)) {
    return normalized as EditorialCompletion["confidence"];
  }

  const mappedConfidence: Record<string, EditorialCompletion["confidence"]> = {
    baja: "low",
    low: "low",
    media: "medium",
    medio: "medium",
    moderate: "medium",
    alta: "high",
    high: "high"
  };

  return mappedConfidence[normalized] || "medium";
}

function buildFallbackSeoTitle(cleanTitle: string | null, shortDescription: string) {
  const title = cleanTitle || "";
  if (!title) {
    return "";
  }

  if (!shortDescription) {
    return truncate(title, 70);
  }

  const combined = `${title}: ${shortDescription}`;
  return truncate(combined, 70);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

function readMetadataNumber(metadata: Prisma.JsonObject, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
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
