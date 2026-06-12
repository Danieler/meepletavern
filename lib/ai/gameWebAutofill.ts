import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { tavily } from "@tavily/core";
import { Prisma, GameImportProposalStatus, type Game, type GameImportProposal } from "@prisma/client";
import { z } from "zod";
import { getBedrockRuntimeClient } from "@/lib/ai/bedrockClient";
import { prisma } from "@/lib/prisma";

const DEFAULT_BEDROCK_MODEL = process.env.BEDROCK_MODEL_ID?.trim() || "amazon.nova-micro-v1:0";
const PROPOSAL_PROVIDER = "tavily_nova_micro";

const tavilyResultSchema = z.object({
  title: z.string().nullish().transform((value) => value || null),
  url: z.string().url(),
  content: z.string().nullish().transform((value) => value || null),
  score: z.number().nullish().transform((value) => value ?? null)
});

const nullableStringFromLooseInput = z
  .union([z.string(), z.array(z.string()), z.null(), z.undefined()])
  .transform((value) => {
    if (Array.isArray(value)) {
      const first = value.find((item) => typeof item === "string" && item.trim().length > 0);
      return first?.trim() || null;
    }

    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
  });

const sourceRefSchema = z.object({
  value: z.any(),
  confidence: z.number().min(0).max(1),
  sourceUrl: nullableStringFromLooseInput,
  sourceTitle: nullableStringFromLooseInput
});

const aiProposalSchema = z.object({
  players: sourceRefSchema,
  playTime: sourceRefSchema,
  age: sourceRefSchema,
  designer: sourceRefSchema,
  artist: sourceRefSchema,
  publisher: sourceRefSchema,
  year: sourceRefSchema,
  categories: sourceRefSchema,
  mechanics: sourceRefSchema,
  description: sourceRefSchema,
  externalSources: z.array(
    z.object({
      name: z.string(),
      url: z.string().url(),
      type: z.string(),
      confidence: z.number().min(0).max(1)
    })
  ).default([]),
  needsHumanReview: z.boolean().default(true),
  notes: z.array(z.string()).default([])
});

export type AiWebProposal = z.infer<typeof aiProposalSchema>;
type TavilyResult = z.infer<typeof tavilyResultSchema>;
type AiWebProposalField = Exclude<keyof AiWebProposal, "externalSources" | "needsHumanReview" | "notes">;

const AI_WEB_PROPOSAL_FIELDS: AiWebProposalField[] = [
  "players",
  "playTime",
  "age",
  "designer",
  "artist",
  "publisher",
  "year",
  "categories",
  "mechanics",
  "description"
];

export type SerializableGameImportProposal = {
  id: string;
  gameId: string;
  provider: string;
  status: GameImportProposalStatus;
  query: string;
  extractedFields: AiWebProposal;
  createdAt: string;
  updatedAt: string;
};

export function buildBoardGameSearchQuery(game: Game) {
  const parts = [
    exact(game.title || game.name),
    game.originalTitle ? exact(game.originalTitle) : null,
    game.publisher,
    game.year ? String(game.year) : null,
    game.buyUrl,
    readSourceValue(game.sources, "ean"),
    readSourceValue(game.sources, "asin"),
    "board game juego de mesa players age play time designer publisher mechanics"
  ].filter(Boolean);

  return parts.join(" ").slice(0, 400);
}

export async function searchBoardGameWithTavily(game: Game) {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing TAVILY_API_KEY");
  }

  const client = tavily({ apiKey });
  const query = buildBoardGameSearchQuery(game);
  console.info("[ai-web-autofill] Tavily request started", { gameId: game.id });

  const result = await client.search(query, {
    searchDepth: "basic",
    topic: "general",
    maxResults: 7,
    includeAnswer: false,
    includeRawContent: false,
    includeImages: false
  });

  const searchResults = z.array(tavilyResultSchema).parse(result.results || []);
  const directSourceResults = await extractKnownSourceWithTavily(client, game);
  const results = dedupeTavilyResults([...directSourceResults, ...searchResults]);
  console.info("[ai-web-autofill] Tavily results", { gameId: game.id, count: results.length });

  return { query, results };
}

export async function extractBoardGameFieldsWithNova(input: {
  game: Game;
  tavilyResults: TavilyResult[];
}) {
  const fallbackProposal = buildFallbackProposal(input.game, input.tavilyResults);
  const region = process.env.AWS_REGION?.trim();
  if (!region) {
    if (hasAnyProposalValue(fallbackProposal)) {
      return {
        ...fallbackProposal,
        notes: [...fallbackProposal.notes, "Nova no se ejecutó porque falta AWS_REGION; se conservó lo disponible."]
      };
    }
    throw new Error("Missing AWS_REGION");
  }

  console.info("[ai-web-autofill] Bedrock request started", { gameId: input.game.id });

  const prompt = {
    game: {
      title: input.game.title || input.game.name,
      originalTitle: input.game.originalTitle,
      publisher: input.game.publisher,
      year: input.game.year,
      minPlayers: input.game.minPlayers,
      maxPlayers: input.game.maxPlayers,
      playtime: input.game.playtime,
      age: input.game.age,
      minAge: input.game.minAge,
      categories: input.game.categories,
      mechanics: input.game.mechanics,
      description: input.game.description
    },
    sources: input.tavilyResults.slice(0, 4).map((result) => ({
      title: result.title,
      url: result.url,
      snippet: truncate(result.content, 900)
    }))
  };

  const body = {
    schemaVersion: "messages-v1",
    system: [
      {
        text:
          "You are a board game metadata extractor for a CMS. " +
          "Use only the provided web sources and the current game record. Return valid JSON only. " +
          "Treat the current game record as an allowed fallback source: if it already has a value and the web sources do not contradict it, keep that value instead of returning null. " +
          "Read players and play time carefully from titles and snippets, including formats like '1-6 jugadores', '1 a 6 players', '60 minutos' and '60-90 min'. " +
          "If a value is not clearly supported by the sources or current record, return null. " +
          "Every extracted field must include value, confidence, sourceUrl, sourceTitle. " +
          "If sources conflict, prefer official publisher sources and reduce confidence. " +
          "Do not copy long descriptions verbatim. Summarize descriptions in Spanish. " +
          "Set needsHumanReview true if any important field has confidence below 0.75. " +
          "Keep arrays short and descriptions below 500 characters."
      }
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            text:
              "Return JSON with exactly this shape. players.value and playTime.value must be objects like {\"min\": 1, \"max\": 6}; age.value and year.value must be numbers; publisher/categories/mechanics must be string arrays; sourceUrl and sourceTitle must be strings or null: " +
              JSON.stringify({
                players: { value: null, confidence: 0, sourceUrl: null, sourceTitle: null },
                playTime: { value: null, confidence: 0, sourceUrl: null, sourceTitle: null },
                age: { value: null, confidence: 0, sourceUrl: null, sourceTitle: null },
                designer: { value: [], confidence: 0, sourceUrl: null, sourceTitle: null },
                artist: { value: [], confidence: 0, sourceUrl: null, sourceTitle: null },
                publisher: { value: [], confidence: 0, sourceUrl: null, sourceTitle: null },
                year: { value: null, confidence: 0, sourceUrl: null, sourceTitle: null },
                categories: { value: [], confidence: 0, sourceUrl: null, sourceTitle: null },
                mechanics: { value: [], confidence: 0, sourceUrl: null, sourceTitle: null },
                description: { value: null, confidence: 0, sourceUrl: null, sourceTitle: null },
                externalSources: [{ name: "string", url: "https://example.com", type: "metadata", confidence: 0 }],
                needsHumanReview: true,
                notes: []
              }) +
              "\nUse this data:\n" +
              JSON.stringify(prompt, null, 2)
          }
        ]
      }
    ],
    inferenceConfig: {
      temperature: 0,
      maxTokens: 1800
    }
  };

  const client = getBedrockRuntimeClient();
  const response = await client.send(
    new InvokeModelCommand({
      modelId: DEFAULT_BEDROCK_MODEL,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(body)
    })
  );

  const raw = new TextDecoder().decode(response.body);
  try {
    const parsedOuter = JSON.parse(raw);
    const responseText = extractBedrockResponseText(parsedOuter);
    const parsedJson = parseLooseJson(responseText);
    const extracted = aiProposalSchema.parse(parsedJson);
    const merged = mergeProposals(extracted, fallbackProposal);
    console.info("[ai-web-autofill] JSON parse success", { gameId: input.game.id });
    return merged;
  } catch (error) {
    if (hasAnyProposalValue(fallbackProposal)) {
      console.info("[ai-web-autofill] Nova parse failed; using fallback proposal", { gameId: input.game.id });
      return {
        ...fallbackProposal,
        notes: [
          ...fallbackProposal.notes,
          error instanceof Error
            ? `Nova devolvió una respuesta incompleta: ${error.message}`
            : "Nova devolvió una respuesta incompleta."
        ]
      };
    }

    throw error;
  }
}

export async function saveGameImportProposal(input: {
  gameId: string;
  query: string;
  rawSearchResults: Prisma.InputJsonValue;
  extractedFields: AiWebProposal;
}) {
  try {
    await prisma.gameImportProposal.updateMany({
      where: {
        gameId: input.gameId,
        provider: PROPOSAL_PROVIDER,
        status: GameImportProposalStatus.pending
      },
      data: {
        status: GameImportProposalStatus.rejected
      }
    });

    const proposal = await prisma.gameImportProposal.create({
      data: {
        gameId: input.gameId,
        provider: PROPOSAL_PROVIDER,
        query: input.query,
        rawSearchResults: input.rawSearchResults,
        extractedFields: input.extractedFields as unknown as Prisma.InputJsonValue
      }
    });

    console.info("[ai-web-autofill] proposal saved", { proposalId: proposal.id, gameId: input.gameId });
    return proposal;
  } catch (error) {
    if (isMissingProposalTableError(error)) {
      throw new Error("Falta aplicar la migración de GameImportProposal en la base de datos.");
    }

    throw error;
  }
}

export async function getPendingGameImportProposal(gameId: string) {
  try {
    const proposal = await prisma.gameImportProposal.findFirst({
      where: {
        gameId,
        provider: PROPOSAL_PROVIDER,
        status: GameImportProposalStatus.pending
      },
      orderBy: { createdAt: "desc" }
    });

    return proposal ? serializeProposal(proposal) : null;
  } catch (error) {
    if (isMissingProposalTableError(error)) {
      return null;
    }

    throw error;
  }
}

export async function rejectGameImportProposal(gameId: string, proposalId: string) {
  try {
    await prisma.gameImportProposal.updateMany({
      where: { id: proposalId, gameId },
      data: { status: GameImportProposalStatus.rejected }
    });
  } catch (error) {
    if (isMissingProposalTableError(error)) {
      throw new Error("Falta aplicar la migración de GameImportProposal en la base de datos.");
    }

    throw error;
  }
}

export async function applyGameImportProposalFields(input: {
  gameId: string;
  proposalId: string;
  fields: string[];
  emptyOnly?: boolean;
}) {
  let game;
  let proposal;

  try {
    [game, proposal] = await Promise.all([
      prisma.game.findUnique({ where: { id: input.gameId } }),
      prisma.gameImportProposal.findUnique({ where: { id: input.proposalId } })
    ]);
  } catch (error) {
    if (isMissingProposalTableError(error)) {
      throw new Error("Falta aplicar la migración de GameImportProposal en la base de datos.");
    }

    throw error;
  }

  if (!game || !proposal || proposal.gameId !== input.gameId) {
    throw new Error("No se encontró la propuesta.");
  }

  const extracted = aiProposalSchema.parse(proposal.extractedFields);
  const update: Prisma.GameUpdateInput = {};
  const appliedFields: string[] = [];

  for (const field of input.fields) {
    if (field === "publisher") {
      const value = arrayFirst(extracted.publisher.value);
      if (value && canApply(input.emptyOnly, game.publisher)) {
        update.publisher = value;
        appliedFields.push(field);
      }
    }

    if (field === "year" && typeof extracted.year.value === "number" && canApply(input.emptyOnly, game.year)) {
      update.year = extracted.year.value;
      appliedFields.push(field);
    }

    if (field === "categories" && Array.isArray(extracted.categories.value) && extracted.categories.value.length && canApply(input.emptyOnly, game.categories)) {
      update.categories = sanitizeStringList(extracted.categories.value);
      appliedFields.push(field);
    }

    if (field === "mechanics" && Array.isArray(extracted.mechanics.value) && extracted.mechanics.value.length && canApply(input.emptyOnly, game.mechanics)) {
      update.mechanics = sanitizeStringList(extracted.mechanics.value);
      appliedFields.push(field);
    }

    if (field === "description" && typeof extracted.description.value === "string" && extracted.description.value.trim() && canApply(input.emptyOnly, game.description)) {
      update.description = extracted.description.value.trim();
      update.shortDescription = extracted.description.value.trim().slice(0, 300);
      update.shortSummary = extracted.description.value.trim().slice(0, 300);
      appliedFields.push(field);
    }

    if (field === "players") {
      const players = normalizeRange(extracted.players.value);
      if (players && canApplyStructuredField(input.emptyOnly, game.minPlayers, game.maxPlayers)) {
        update.minPlayers = players.min;
        update.maxPlayers = players.max;
        update.players = {
          min: players.min,
          max: players.max,
          label: players.min && players.max ? `${players.min}-${players.max}` : String(players.min || players.max || "")
        } as unknown as Prisma.InputJsonValue;
        appliedFields.push(field);
      }
    }

    if (field === "playTime") {
      const playTime = normalizeRange(extracted.playTime.value);
      if (playTime && canApply(input.emptyOnly, game.playtime)) {
        update.playtime =
          playTime.min && playTime.max && playTime.min !== playTime.max
            ? `${playTime.min}-${playTime.max} min`
            : `${playTime.min || playTime.max} min`;
        appliedFields.push(field);
      }
    }

    if (field === "age") {
      const age = normalizeNumber(extracted.age.value);
      if (age && canApplyStructuredField(input.emptyOnly, game.minAge, game.age)) {
        update.minAge = age;
        update.age = `${age}+`;
        appliedFields.push(field);
      }
    }
  }

  if (appliedFields.length) {
    await prisma.game.update({ where: { id: input.gameId }, data: update });
  }

  await prisma.gameImportProposal.update({
    where: { id: proposal.id },
    data: {
      status: GameImportProposalStatus.applied
    }
  });

  return appliedFields;
}

export function serializeProposal(proposal: GameImportProposal): SerializableGameImportProposal {
  return {
    id: proposal.id,
    gameId: proposal.gameId,
    provider: proposal.provider,
    status: proposal.status,
    query: proposal.query,
    extractedFields: aiProposalSchema.parse(proposal.extractedFields),
    createdAt: proposal.createdAt.toISOString(),
    updatedAt: proposal.updatedAt.toISOString()
  };
}

export function getMissingAiWebFields(game: Game) {
  return [
    !game.minPlayers || !game.maxPlayers ? "players" : null,
    !game.playtime ? "playTime" : null,
    !game.minAge ? "age" : null,
    !game.publisher ? "publisher" : null,
    !game.year ? "year" : null,
    !game.categories.length ? "categories" : null,
    !game.mechanics.length ? "mechanics" : null,
    !game.description ? "description" : null
  ].filter(Boolean) as string[];
}

function buildFallbackProposal(game: Game, tavilyResults: TavilyResult[]) {
  return mergeProposals(buildTavilyTextProposal(tavilyResults), buildCurrentGameProposal(game));
}

function buildCurrentGameProposal(game: Game): AiWebProposal {
  const proposal = createEmptyProposal();
  const currentSource = { sourceUrl: null, sourceTitle: "Ficha actual" };
  const players =
    game.minPlayers || game.maxPlayers
      ? {
          min: game.minPlayers || game.maxPlayers!,
          max: game.maxPlayers || game.minPlayers!
        }
      : null;
  const playTime = game.playtime ? normalizeRange(game.playtime) || game.playtime : null;
  const age = game.minAge || normalizeNumber(game.age);

  if (players) {
    proposal.players = sourceRef(players, 0.99, currentSource);
  }
  if (playTime) {
    proposal.playTime = sourceRef(playTime, 0.99, currentSource);
  }
  if (age) {
    proposal.age = sourceRef(age, 0.99, currentSource);
  }
  if (game.publisher) {
    proposal.publisher = sourceRef([game.publisher], 0.99, currentSource);
  }
  if (game.year) {
    proposal.year = sourceRef(game.year, 0.99, currentSource);
  }
  if (game.categories.length) {
    proposal.categories = sourceRef(game.categories, 0.99, currentSource);
  }
  if (game.mechanics.length) {
    proposal.mechanics = sourceRef(game.mechanics, 0.99, currentSource);
  }
  if (game.description) {
    proposal.description = sourceRef(game.description, 0.99, currentSource);
  }

  if (hasAnyProposalValue(proposal)) {
    proposal.notes.push("Se conservan los valores existentes de la ficha cuando la IA no aporta uno mejor.");
  }

  return proposal;
}

function buildTavilyTextProposal(results: TavilyResult[]): AiWebProposal {
  const proposal = createEmptyProposal();
  const usedSources = new Map<string, TavilyResult>();
  const players = detectFromTavilyResults(results, parsePlayersFromText);
  const playTime = detectFromTavilyResults(results, parsePlayTimeFromText);
  const age = detectFromTavilyResults(results, parseAgeFromText);

  if (players) {
    proposal.players = sourceRef(players.value, 0.82, sourceFromTavilyResult(players.result));
    usedSources.set(players.result.url, players.result);
  }
  if (playTime) {
    proposal.playTime = sourceRef(playTime.value, 0.82, sourceFromTavilyResult(playTime.result));
    usedSources.set(playTime.result.url, playTime.result);
  }
  if (age) {
    proposal.age = sourceRef(age.value, 0.78, sourceFromTavilyResult(age.result));
    usedSources.set(age.result.url, age.result);
  }

  proposal.externalSources = [...usedSources.values()].map((result) => ({
    name: result.title || result.url,
    url: result.url,
    type: "metadata",
    confidence: result.score ?? 0.75
  }));

  if (hasAnyProposalValue(proposal)) {
    proposal.notes.push("Se completaron campos básicos leyendo los textos recuperados por Tavily.");
  }

  return proposal;
}

function mergeProposals(primary: AiWebProposal, fallback: AiWebProposal): AiWebProposal {
  const merged = cloneProposal(primary);

  for (const field of AI_WEB_PROPOSAL_FIELDS) {
    if (!hasSourceRefValue(merged[field]) && hasSourceRefValue(fallback[field])) {
      merged[field] = fallback[field];
    }
  }

  merged.externalSources = mergeExternalSources(primary.externalSources, fallback.externalSources);
  merged.notes = [...new Set([...primary.notes, ...fallback.notes])];
  merged.needsHumanReview = primary.needsHumanReview || fallback.needsHumanReview;

  return merged;
}

function createEmptyProposal(notes: string[] = []): AiWebProposal {
  return {
    players: sourceRef(null, 0),
    playTime: sourceRef(null, 0),
    age: sourceRef(null, 0),
    designer: sourceRef([], 0),
    artist: sourceRef([], 0),
    publisher: sourceRef([], 0),
    year: sourceRef(null, 0),
    categories: sourceRef([], 0),
    mechanics: sourceRef([], 0),
    description: sourceRef(null, 0),
    externalSources: [],
    needsHumanReview: true,
    notes
  };
}

function sourceRef(
  value: unknown,
  confidence: number,
  source: { sourceUrl?: string | null; sourceTitle?: string | null } = {}
) {
  return {
    value,
    confidence,
    sourceUrl: source.sourceUrl || null,
    sourceTitle: source.sourceTitle || null
  };
}

function cloneProposal(proposal: AiWebProposal): AiWebProposal {
  return {
    players: { ...proposal.players },
    playTime: { ...proposal.playTime },
    age: { ...proposal.age },
    designer: { ...proposal.designer },
    artist: { ...proposal.artist },
    publisher: { ...proposal.publisher },
    year: { ...proposal.year },
    categories: { ...proposal.categories },
    mechanics: { ...proposal.mechanics },
    description: { ...proposal.description },
    externalSources: [...proposal.externalSources],
    needsHumanReview: proposal.needsHumanReview,
    notes: [...proposal.notes]
  };
}

function hasAnyProposalValue(proposal: AiWebProposal) {
  return AI_WEB_PROPOSAL_FIELDS.some((field) => hasSourceRefValue(proposal[field]));
}

function hasSourceRefValue(ref: AiWebProposal[AiWebProposalField]) {
  const value = ref?.value;

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (value && typeof value === "object") {
    return Object.values(value).some(Boolean);
  }

  return Boolean(value);
}

function mergeExternalSources(...sourceLists: AiWebProposal["externalSources"][]) {
  const byUrl = new Map<string, AiWebProposal["externalSources"][number]>();

  for (const source of sourceLists.flat()) {
    if (!byUrl.has(source.url)) {
      byUrl.set(source.url, source);
    }
  }

  return [...byUrl.values()].slice(0, 8);
}

function detectFromTavilyResults<T>(
  results: TavilyResult[],
  parser: (value: string) => T | null
) {
  for (const result of results) {
    const parsed = parser(`${result.title || ""} ${result.content || ""}`);
    if (parsed) {
      return { value: parsed, result };
    }
  }

  return null;
}

function sourceFromTavilyResult(result: TavilyResult) {
  return {
    sourceUrl: result.url,
    sourceTitle: result.title || result.url
  };
}

function parsePlayersFromText(value: string) {
  const compact = normalizeSearchText(value);
  const labelledRange =
    /(?:n[uú]mero de jugadores|n[ºo]\s*de jugadores|jugadores?|players?)\D{0,24}(\d{1,2})\s*(?:-|–|—|a|to)\s*(\d{1,2})/i.exec(compact);
  const trailingRange = /(\d{1,2})\s*(?:-|–|—|a|to)\s*(\d{1,2})\s*(?:jugadores?|players?)/i.exec(compact);
  const single = /(\d{1,2})\s*(?:jugadores?|players?)/i.exec(compact);
  const match = labelledRange || trailingRange;

  if (match) {
    return normalizeDetectedRange(Number(match[1]), Number(match[2]), 99);
  }
  if (single) {
    const count = Number(single[1]);
    return normalizeDetectedRange(count, count, 99);
  }

  return null;
}

function parsePlayTimeFromText(value: string) {
  const compact = normalizeSearchText(value);
  const labelledRange =
    /(?:tiempo de juego estimado|tiempo de juego|duraci[oó]n|playtime)\D{0,24}(\d{1,3})\s*(?:-|–|—|a|to)\s*(\d{1,3})/i.exec(compact);
  const labelledSingle =
    /(?:tiempo de juego estimado|tiempo de juego|duraci[oó]n|playtime)\D{0,24}(\d{1,3})/i.exec(compact);
  const trailingRange = /(\d{1,3})\s*(?:-|–|—|a|to)\s*(\d{1,3})\s*(?:minutos?|mins?|minutes?)/i.exec(compact);
  const trailingSingle = /(\d{1,3})\s*(?:minutos?|mins?|minutes?)/i.exec(compact);
  const match = labelledRange || trailingRange;

  if (match) {
    return normalizeDetectedRange(Number(match[1]), Number(match[2]), 600);
  }
  if (labelledSingle || trailingSingle) {
    const minutes = Number((labelledSingle || trailingSingle)![1]);
    return normalizeDetectedRange(minutes, minutes, 600);
  }

  return null;
}

function parseAgeFromText(value: string) {
  const compact = normalizeSearchText(value);
  const labelled = /(?:edad|age|ages?|a partir de|desde)\D{0,16}(\d{1,2})\s*\+?/i.exec(compact);
  const trailing = /(\d{1,2})\s*\+?\s*(?:a[nñ]os|years?|yrs?)/i.exec(compact);
  const age = Number((labelled || trailing)?.[1] || 0);

  return Number.isFinite(age) && age > 0 && age <= 21 ? age : null;
}

function normalizeDetectedRange(min: number, max: number, maxAllowed: number) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0 || min > maxAllowed || max > maxAllowed) {
    return null;
  }

  return {
    min: Math.min(min, max),
    max: Math.max(min, max)
  };
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

function exact(value: string) {
  return `"${value.replaceAll('"', "")}"`;
}

function readSourceValue(value: Prisma.JsonValue | null, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  return typeof record[key] === "string" ? record[key] : null;
}

function truncate(value: string | null, max: number) {
  if (!value) {
    return null;
  }
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}

function extractBedrockResponseText(value: any): string {
  const messageText =
    value?.output?.message?.content?.map((item: any) => item?.text || "").join("").trim() ||
    value?.content?.map((item: any) => item?.text || "").join("").trim() ||
    value?.outputText ||
    "";

  if (!messageText) {
    throw new Error("AI extraction failed");
  }

  return messageText;
}

function parseLooseJson(value: string) {
  const cleaned = value.replace(/^```json\s*|\s*```$/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        const repaired = repairCommonJsonBreakage(cleaned.slice(start, end + 1));
        if (repaired) {
          return repaired;
        }
      }
    }

    const partial = parsePartialProposalJson(cleaned);
    if (partial) {
      return partial;
    }

    console.info("[ai-web-autofill] JSON parse failure");
    throw new Error("La IA devolvió JSON inválido. Pulsa Regenerar para intentarlo de nuevo.");
  }
}

function repairCommonJsonBreakage(value: string) {
  const candidates = [
    value,
    value.replace(/,\s*([}\]])/g, "$1"),
    closeJsonContainers(value.replace(/,\s*([}\]])/g, "$1"))
  ];

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next repair candidate.
    }
  }

  return null;
}

function closeJsonContainers(value: string) {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (const char of value) {
    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      stack.push("}");
    } else if (char === "[") {
      stack.push("]");
    } else if ((char === "}" || char === "]") && stack[stack.length - 1] === char) {
      stack.pop();
    }
  }

  return `${value}${stack.reverse().join("")}`;
}

function parsePartialProposalJson(value: string) {
  const fields = [
    "players",
    "playTime",
    "age",
    "designer",
    "artist",
    "publisher",
    "year",
    "categories",
    "mechanics",
    "description"
  ];
  const proposal: Record<string, unknown> = {
    externalSources: [],
    needsHumanReview: true,
    notes: ["JSON reparado parcialmente por respuesta incompleta de IA."]
  };

  for (const field of fields) {
    const parsed = extractTopLevelField(value, field);
    proposal[field] = parsed || { value: null, confidence: 0, sourceUrl: null, sourceTitle: null };
  }

  return Object.values(proposal).some((item) => item && typeof item === "object")
    ? proposal
    : null;
}

function extractTopLevelField(value: string, key: string) {
  const keyIndex = value.indexOf(`"${key}"`);
  if (keyIndex < 0) {
    return null;
  }

  const colonIndex = value.indexOf(":", keyIndex);
  const objectStart = value.indexOf("{", colonIndex);
  if (colonIndex < 0 || objectStart < 0) {
    return null;
  }

  const objectText = sliceBalancedObject(value, objectStart);
  if (!objectText) {
    return null;
  }

  try {
    return JSON.parse(objectText.replace(/,\s*([}\]])/g, "$1"));
  } catch {
    return null;
  }
}

function sliceBalancedObject(value: string, start: number) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < value.length; index += 1) {
    const char = value[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return value.slice(start, index + 1);
      }
    }
  }

  return null;
}

function canApply(emptyOnly: boolean | undefined, currentValue: unknown) {
  if (!emptyOnly) {
    return true;
  }

  if (Array.isArray(currentValue)) {
    return currentValue.length === 0;
  }

  return currentValue === null || currentValue === undefined || currentValue === "";
}

function canApplyStructuredField(emptyOnly: boolean | undefined, ...currentValues: unknown[]) {
  if (!emptyOnly) {
    return true;
  }

  return currentValues.some((value) => {
    if (Array.isArray(value)) {
      return value.length === 0;
    }

    return value === null || value === undefined || value === "";
  });
}

function normalizeRange(value: unknown) {
  if (Array.isArray(value)) {
    const numbers = value.map(normalizeNumber).filter((item): item is number => typeof item === "number");
    if (numbers.length >= 2) {
      return { min: Math.min(numbers[0], numbers[1]), max: Math.max(numbers[0], numbers[1]) };
    }
    if (numbers.length === 1) {
      return { min: numbers[0], max: numbers[0] };
    }

    const joined = value.filter((item): item is string => typeof item === "string").join(" ");
    if (joined) {
      return normalizeRange(joined);
    }
  }

  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return { min: value, max: value };
  }

  if (typeof value === "string") {
    const match = value.match(/(\d+)\s*(?:-|a|to|–|—)\s*(\d+)/i);
    if (match) {
      return { min: Number(match[1]), max: Number(match[2]) };
    }
    const single = value.match(/(\d+)/);
    if (single) {
      const parsed = Number(single[1]);
      return { min: parsed, max: parsed };
    }
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const min = normalizeNumber(
      record.min ?? record.minimum ?? record.minPlayers ?? record.playersMin ?? record.from
    );
    const max = normalizeNumber(
      record.max ?? record.maximum ?? record.maxPlayers ?? record.playersMax ?? record.to
    );
    if (min || max) {
      return { min: min || max!, max: max || min! };
    }

    const label = record.value ?? record.label ?? record.range ?? record.text;
    if (label) {
      return normalizeRange(label);
    }
  }

  return null;
}

function normalizeNumber(value: unknown): number | null {
  if (Array.isArray(value)) {
    return value.map(normalizeNumber).find((item): item is number => typeof item === "number") || null;
  }

  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const match = value.match(/\d+/);
    if (match) {
      const parsed = Number(match[0]);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return normalizeNumber(record.value ?? record.age ?? record.minAge ?? record.year);
  }
  return null;
}

function sanitizeStringList(value: unknown) {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()))].slice(0, 8)
    : [];
}

function arrayFirst(value: unknown) {
  return Array.isArray(value)
    ? value.find((item): item is string => typeof item === "string" && item.trim().length > 0) || null
    : typeof value === "string" && value.trim()
      ? value.trim()
      : null;
}

function isMissingProposalTableError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
}

async function extractKnownSourceWithTavily(client: ReturnType<typeof tavily>, game: Game) {
  if (!game.buyUrl?.startsWith("http")) {
    return [];
  }

  try {
    const extracted = await client.extract([game.buyUrl], {
      extractDepth: "basic",
      format: "text",
      includeImages: false
    });

    return extracted.results.map((result) => ({
      title: result.title || game.title || game.name,
      url: result.url,
      content: truncate(result.rawContent, 2500),
      score: 1
    }));
  } catch {
    return [];
  }
}

function dedupeTavilyResults(results: Array<z.infer<typeof tavilyResultSchema>>) {
  const seen = new Set<string>();
  return results.filter((result) => {
    if (seen.has(result.url)) {
      return false;
    }

    seen.add(result.url);
    return true;
  });
}
