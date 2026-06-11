import type { Game, Prisma } from "@prisma/client";
import type { EditorialCompletion } from "@/lib/ai/editorialCompletionSchema";
import { containsEditorialGarbage } from "@/lib/import/sanitizeEditorialFields";
import { normalizeGameFaq, normalizeGamePlayers } from "@/lib/editorialMappers";
import { sanitizeImportedTitle } from "@/lib/importedTextSanitizer";
import { slugify } from "@/lib/slug";

const VALID_DIFFICULTIES = new Set(["Muy fácil", "Fácil", "Media", "Alta", "Muy alta"]);
const SUSPICIOUS_TITLES = new Set(["maldito games", "asmodee", "devir", "zygomatic", "hasbro"]);
const PLACEHOLDER_PATTERN =
  /(pendiente de revisi[oó]n editorial|ficha importada|borrador importado|fuente original:|revisi[oó]n editorial|por confirmar|se ha importado desde una fuente comercial aprobada|meepletavern|revisa y completa la ficha antes de publicar|no es una ficha lista para p[úu]blico|datos detectados:)/i;

export type SafeEditorialPatchResult = {
  patch: Prisma.GameUpdateInput;
  appliedFields: string[];
  suggestedTitle: string | null;
};

type BuildSafeEditorialPatchOptions = {
  mode?: "conservative" | "prefer_completion";
};

export function buildSafeEditorialPatch(
  game: Game,
  completion: EditorialCompletion,
  options?: BuildSafeEditorialPatchOptions
): SafeEditorialPatchResult {
  const patch: Prisma.GameUpdateInput = {};
  const appliedFields: string[] = [];
  const mode = options?.mode || "conservative";
  const suggestedTitle = buildSuggestedTitle(game, completion);

  if (mode === "prefer_completion" && suggestedTitle) {
    patch.title = suggestedTitle;
    patch.name = suggestedTitle;
    patch.slug = slugify(suggestedTitle) || game.slug;
    appliedFields.push("title");
  }

  applyTextField({
    field: "publisher",
    currentValue: game.publisher,
    nextValue: completion.publisher,
    shouldReplaceCurrent: isReplaceableText,
    assign(value) {
      patch.publisher = value;
    }
  });

  applyStructuredFields();

  applyTextField({
    field: "shortDescription",
    currentValue: game.shortDescription || game.shortSummary,
    nextValue: completion.shortDescription,
    shouldReplaceCurrent: isReplaceableText,
    assign(value) {
      patch.shortDescription = value;
    }
  });

  if ("shortDescription" in patch) {
    patch.shortSummary = completion.shortDescription;
  }

  applyTextField({
    field: "longDescription",
    currentValue: game.description,
    nextValue: completion.longDescription,
    shouldReplaceCurrent: isReplaceableText,
    assign(value) {
      patch.description = value;
    }
  });

  applyTextField({
    field: "difficulty",
    currentValue: game.difficulty || game.complexity,
    nextValue: completion.difficulty,
    shouldReplaceCurrent: isReplaceableDifficulty,
    assign(value) {
      patch.difficulty = value;
      patch.complexity = value;
    }
  });

  applyListField("categories", game.categories, completion.categories);
  applyListField("mechanics", game.mechanics, completion.mechanics);
  applyListField("themes", game.themes, completion.themes);

  applyTextField({
    field: "bestFor",
    currentValue: game.bestFor,
    nextValue: completion.bestFor,
    shouldReplaceCurrent: isReplaceableText,
    assign(value) {
      patch.bestFor = value;
    }
  });

  applyTextField({
    field: "notFor",
    currentValue: game.notFor,
    nextValue: completion.notFor,
    shouldReplaceCurrent: isReplaceableText,
    assign(value) {
      patch.notFor = value;
    }
  });

  applyListField("pros", game.pros, completion.pros, 3);
  applyListField("cons", game.cons, completion.cons, 2);

  const currentFaq = normalizeGameFaq(game.faq || game.faqs);
  if (completion.faq.length >= 3 && (mode === "prefer_completion" || isReplaceableFaq(currentFaq))) {
    patch.faq = completion.faq as unknown as Prisma.InputJsonValue;
    patch.faqs = completion.faq as unknown as Prisma.InputJsonValue;
    appliedFields.push("faq");
  }

  applyTextField({
    field: "seoTitle",
    currentValue: game.seoTitle,
    nextValue: completion.seoTitle,
    shouldReplaceCurrent: isReplaceableSeoTitle,
    assign(value) {
      patch.seoTitle = value;
    }
  });

  applyTextField({
    field: "seoDescription",
    currentValue: game.seoDescription,
    nextValue: completion.seoDescription,
    shouldReplaceCurrent: isReplaceableText,
    assign(value) {
      patch.seoDescription = value;
    }
  });

  return {
    patch,
    appliedFields,
    suggestedTitle
  };

  function applyTextField(input: {
    field: string;
    currentValue: string | null;
    nextValue: string | null | undefined;
    shouldReplaceCurrent: (value: string | null) => boolean;
    assign: (value: string) => void;
  }) {
    const nextValue = normalizeText(input.nextValue);

    if (!isUsefulText(nextValue)) {
      return;
    }

    if (mode !== "prefer_completion" && !input.shouldReplaceCurrent(input.currentValue)) {
      return;
    }

    input.assign(nextValue);
    appliedFields.push(input.field);
  }

  function applyListField(
    field: "categories" | "mechanics" | "themes" | "pros" | "cons",
    currentValue: string[],
    nextValue: string[],
    minItems = 1
  ) {
    if (nextValue.length < minItems) {
      return;
    }

    if (mode !== "prefer_completion" && !isReplaceableList(currentValue)) {
      return;
    }

    patch[field] = nextValue;
    appliedFields.push(field);
  }

  function applyStructuredFields() {
    if (mode !== "prefer_completion") {
      return;
    }

    const currentPlayers = normalizeGamePlayers(game.players);
    const currentMinPlayers = currentPlayers.min ?? game.minPlayers;
    const currentMaxPlayers = currentPlayers.max ?? game.maxPlayers;
    const currentMinAge = game.minAge || parseFirstNumber(game.age);
    const hasStructuredCompletion =
      hasPositiveInteger(completion.minPlayers) &&
      hasPositiveInteger(completion.maxPlayers) &&
      hasPositiveInteger(completion.minPlayTime) &&
      hasPositiveInteger(completion.maxPlayTime) &&
      hasPositiveInteger(completion.minAge);

    if (!hasStructuredCompletion) {
      return;
    }

    if (currentMinPlayers && currentMaxPlayers && game.playtime && currentMinAge) {
      return;
    }

    patch.players = normalizeGamePlayers({
      min: completion.minPlayers,
      max: completion.maxPlayers,
      ideal: currentPlayers.ideal ?? null,
      label: formatPlayersLabel(completion.minPlayers, completion.maxPlayers)
    }) as unknown as Prisma.InputJsonValue;
    patch.minPlayers = completion.minPlayers;
    patch.maxPlayers = completion.maxPlayers;
    patch.playtime = formatPlaytime(completion.minPlayTime, completion.maxPlayTime);
    patch.minAge = completion.minAge;
    patch.age = `${completion.minAge}+`;
    appliedFields.push("structuredData");
  }
}

function buildSuggestedTitle(game: Game, completion: EditorialCompletion) {
  const currentTitle = normalizeText(game.title || game.name);
  const cleanTitle = normalizeText(sanitizeImportedTitle(completion.cleanTitle || ""));

  if (!cleanTitle || cleanTitle.toLocaleLowerCase("es") === currentTitle.toLocaleLowerCase("es")) {
    return null;
  }

  if (!isSuspiciousTitle(currentTitle) || !["medium", "high"].includes(completion.confidence)) {
    return null;
  }

  if (isSuspiciousTitle(cleanTitle)) {
    return null;
  }

  return cleanTitle;
}

function isSuspiciousTitle(value: string | null) {
  const normalized = normalizeText(value).toLocaleLowerCase("es");
  if (SUSPICIOUS_TITLES.has(normalized)) {
    return true;
  }

  const cleaned = normalizeText(sanitizeImportedTitle(value || ""));
  return Boolean(normalized && cleaned && cleaned !== normalizeText(value));
}

function isReplaceableText(value: string | null) {
  const normalized = normalizeText(value);
  return !normalized || containsEditorialGarbage(normalized) || PLACEHOLDER_PATTERN.test(normalized);
}

function isReplaceableSeoTitle(value: string | null) {
  const normalized = normalizeText(value);
  return (
    !normalized ||
    containsEditorialGarbage(normalized) ||
    PLACEHOLDER_PATTERN.test(normalized) ||
    /\|\s*MeepleTavern$/i.test(normalized)
  );
}

function isReplaceableDifficulty(value: string | null) {
  const normalized = normalizeText(value);
  return !normalized || !VALID_DIFFICULTIES.has(normalized) || containsEditorialGarbage(normalized) || PLACEHOLDER_PATTERN.test(normalized);
}

function isReplaceableList(values: string[]) {
  if (!values.length) {
    return true;
  }

  return values.every((value) => isReplaceableText(value));
}

function isReplaceableFaq(faq: Array<{ question: string; answer: string }>) {
  if (!faq.length) {
    return true;
  }

  return faq.every((item) => isReplaceableText(item.question) || isReplaceableText(item.answer));
}

function isUsefulText(value: string | null | undefined) {
  const normalized = normalizeText(value);
  return Boolean(normalized && !containsEditorialGarbage(normalized) && !PLACEHOLDER_PATTERN.test(normalized));
}

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function hasPositiveInteger(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function formatPlayersLabel(minPlayers: number | null, maxPlayers: number | null) {
  if (!hasPositiveInteger(minPlayers) && !hasPositiveInteger(maxPlayers)) {
    return null;
  }

  if (hasPositiveInteger(minPlayers) && hasPositiveInteger(maxPlayers) && minPlayers !== maxPlayers) {
    return `${minPlayers}-${maxPlayers}`;
  }

  return String(minPlayers || maxPlayers || "");
}

function formatPlaytime(minPlayTime: number | null, maxPlayTime: number | null) {
  if (!hasPositiveInteger(minPlayTime) && !hasPositiveInteger(maxPlayTime)) {
    return null;
  }

  if (hasPositiveInteger(minPlayTime) && hasPositiveInteger(maxPlayTime) && minPlayTime !== maxPlayTime) {
    return `${minPlayTime}-${maxPlayTime} min`;
  }

  return `${minPlayTime || maxPlayTime} min`;
}

function parseFirstNumber(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/\d+/);
  return match ? Number(match[0]) : null;
}
