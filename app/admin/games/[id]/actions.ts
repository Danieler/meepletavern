"use server";

import { GameStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { gameRepository } from "@/lib/editorialRepositories";
import { buildEditorialAutofill } from "@/lib/editorialAutofill";
import { normalizeGameFaq, normalizeGamePlayers } from "@/lib/editorialMappers";
import { buildPublicEditorialCopy, needsPublicEditorialRewrite } from "@/lib/publicEditorialCopy";
import {
  revalidatePublicGameCollections,
  revalidatePublicGameDetail,
  revalidatePublishedGame
} from "@/lib/publicGameCache";
import { sanitizeImportedList } from "@/lib/importedTextSanitizer";
import { buildExternalRatingUpdate } from "@/lib/ratings/gameRatings";
import { normalizeCategories, normalizeMechanics } from "@/lib/taxonomy";
import { validateBeforePublish } from "@/lib/validateBeforePublish";

export type GameEditorActionState = {
  errors?: string[];
  warnings?: string[];
  message?: string;
};

export async function saveGameEditorAction(
  _state: GameEditorActionState,
  formData: FormData
): Promise<GameEditorActionState> {
  const id = requiredString(formData.get("id"), "Falta el identificador del juego.");
  const requestedStatus = normalizeGameStatus(formData.get("status"));

  try {
    const editorGame = await gameRepository.getEditorById(id);
    if (!editorGame) {
      throw new Error("No existe ese juego.");
    }

    const savedGame = await gameRepository.update(
      id,
      toGameUpdateInput(formData, requestedStatus, editorGame.mediaAssets, editorGame.publishedAt)
    );
    const savedWithExternalRating = await persistExternalRating(savedGame);
    const validation = validateBeforePublish(savedWithExternalRating);
    revalidateGameAdmin(id);
    if (savedWithExternalRating.status === GameStatus.published) {
      revalidatePublicGameDetail(savedWithExternalRating.slug);
      if (editorGame.status === GameStatus.published && editorGame.slug !== savedWithExternalRating.slug) {
        revalidatePublicGameDetail(editorGame.slug);
      }
      if (
        editorGame.status !== GameStatus.published ||
        affectsPublicGameCollections(editorGame, savedWithExternalRating)
      ) {
        revalidatePublicGameCollections();
      }
    } else if (editorGame.status === GameStatus.published) {
      revalidatePublishedGame(editorGame.slug);
    }
    const statusMessage = {
      [GameStatus.draft]: "Guardado como borrador.",
      [GameStatus.review]: "Guardado en revisión.",
      [GameStatus.published]: "Cambios guardados en la ficha publicada.",
      [GameStatus.archived]: "Guardado como archivado."
    }[savedWithExternalRating.status];

    return validation.warnings.length
      ? { message: statusMessage, warnings: validation.warnings }
      : { message: statusMessage };
  } catch (error) {
    return { errors: [errorMessage(error)] };
  }
}

export async function publishGameEditorAction(
  _state: GameEditorActionState,
  formData: FormData
): Promise<GameEditorActionState> {
  const id = requiredString(formData.get("id"), "Falta el identificador del juego.");

  try {
    const editorGame = await gameRepository.getEditorById(id);
    if (!editorGame) {
      throw new Error("No existe ese juego.");
    }

    const savedGame = await gameRepository.update(
      id,
      toGameUpdateInput(formData, GameStatus.review, editorGame.mediaAssets, editorGame.publishedAt)
    );
    const savedWithExternalRating = await persistExternalRating(savedGame);
    const validation = validateBeforePublish(savedWithExternalRating);

    if (!validation.valid) {
      return { errors: validation.errors, warnings: validation.warnings };
    }

    if (needsPublicEditorialRewrite({
      title: savedWithExternalRating.title || savedWithExternalRating.name,
      shortDescription: savedWithExternalRating.shortDescription,
      shortSummary: savedWithExternalRating.shortSummary,
      description: savedWithExternalRating.description,
      quickVerdict: savedWithExternalRating.quickVerdict || savedWithExternalRating.review,
      review: savedWithExternalRating.review
    })) {
      await gameRepository.update(id, buildPublicEditorialCopy({
        title: savedWithExternalRating.title || savedWithExternalRating.name,
        playersLabel: formatPlayersLabel(savedWithExternalRating.minPlayers, savedWithExternalRating.maxPlayers, null),
        playtime: savedWithExternalRating.playtime,
        complexity: savedWithExternalRating.complexity || savedWithExternalRating.difficulty,
        shortDescription: savedWithExternalRating.shortDescription,
        shortSummary: savedWithExternalRating.shortSummary,
        description: savedWithExternalRating.description,
        quickVerdict: savedWithExternalRating.quickVerdict || savedWithExternalRating.review,
        review: savedWithExternalRating.review
      }));
    }

    await gameRepository.update(id, {
      status: GameStatus.published,
      publishedAt: new Date()
    });
    revalidateGameAdmin(id);
    revalidatePublishedGame(savedWithExternalRating.slug);
    return validation.warnings.length
      ? { message: "Juego publicado. Se puede mejorar la ficha cuando quieras.", warnings: validation.warnings }
      : { message: "Juego publicado. Ficha completa." };
  } catch (error) {
    return { errors: [errorMessage(error)] };
  }
}

export async function autocompleteGameEditorAction(
  _state: GameEditorActionState,
  formData: FormData
): Promise<GameEditorActionState> {
  const id = requiredString(formData.get("id"), "Falta el identificador del juego.");

  try {
    const editorGame = await gameRepository.getEditorById(id);
    if (!editorGame) {
      throw new Error("No existe ese juego.");
    }

    const requestedStatus = normalizeGameStatus(formData.get("status"));
    const safeStatus = requestedStatus === GameStatus.published && editorGame.status !== GameStatus.published
      ? GameStatus.review
      : requestedStatus;
    const baseInput = toGameUpdateInput(formData, safeStatus, editorGame.mediaAssets);
    const completedInput = applyEditorialAutofill(baseInput);
    const savedGame = await gameRepository.update(id, completedInput);
    const savedWithExternalRating = await persistExternalRating(savedGame);
    const validation = validateBeforePublish(savedWithExternalRating);

    revalidateGameAdmin(id);
    if (savedWithExternalRating.status === GameStatus.published) {
      revalidatePublicGameDetail(savedWithExternalRating.slug);
      if (editorGame.status === GameStatus.published && editorGame.slug !== savedWithExternalRating.slug) {
        revalidatePublicGameDetail(editorGame.slug);
      }
      if (
        editorGame.status !== GameStatus.published ||
        affectsPublicGameCollections(editorGame, savedWithExternalRating)
      ) {
        revalidatePublicGameCollections();
      }
    } else if (editorGame.status === GameStatus.published) {
      revalidatePublishedGame(editorGame.slug);
    }
    return validation.warnings.length
      ? {
          message: "Campos editoriales autocompletados. Revisa la ficha antes de publicar.",
          warnings: validation.warnings
        }
      : { message: "Campos editoriales autocompletados. Ficha completa." };
  } catch (error) {
    return { errors: [errorMessage(error)] };
  }
}

export async function deleteGameEditorAction(formData: FormData) {
  const id = requiredString(formData.get("id"), "Falta el identificador del juego.");
  const returnTo = optionalString(formData.get("returnTo")) || "/admin/games";

  const game = await gameRepository.getById(id);
  if (!game) {
    throw new Error("No existe ese juego.");
  }

  await gameRepository.delete(id);
  revalidateGameAdmin(id);
  revalidatePath("/admin/games");
  revalidatePath("/admin/reviews");
  revalidatePath("/admin/candidates");
  if (game.slug) {
    revalidatePublishedGame(game.slug);
  }
  redirect(returnTo);
}

export async function deleteGamesBulkAction(formData: FormData) {
  const ids = readStringList(formData, "ids");
  const returnTo = optionalString(formData.get("returnTo")) || "/admin/games";

  if (!ids.length) {
    throw new Error("Selecciona al menos un juego.");
  }

  for (const id of ids) {
    const deletedGame = await gameRepository.delete(id);
    revalidateGameAdmin(id);
    if (deletedGame.slug) {
      revalidatePublishedGame(deletedGame.slug);
    }
  }

  revalidatePath("/admin/games");
  revalidatePath("/admin/reviews");
  revalidatePath("/admin/candidates");
  redirect(returnTo);
}

function toGameUpdateInput(
  formData: FormData,
  status: GameStatus,
  mediaAssets: Array<{ id: string; url: string }>,
  publishedAt?: Date | null
): Prisma.GameUpdateInput {
  const title = requiredString(formData.get("title"), "El título es obligatorio.");
  const slug = requiredString(formData.get("slug"), "El slug es obligatorio.");
  const minPlayers = optionalPositiveInt(formData.get("minPlayers"));
  const maxPlayers = optionalPositiveInt(formData.get("maxPlayers"));
  const idealPlayers = optionalPositiveInt(formData.get("idealPlayers"));
  const minPlayTime = optionalPositiveInt(formData.get("minPlayTime"));
  const maxPlayTime = optionalPositiveInt(formData.get("maxPlayTime"));
  const minAge = optionalPositiveInt(formData.get("minAge"));
  const difficulty = optionalString(formData.get("difficulty"));
  const shortDescription = optionalString(formData.get("shortDescription"));
  const quickVerdict = optionalString(formData.get("quickVerdict"));
  const primaryImageInput = optionalString(formData.get("primaryImageId"));
  const players = normalizeGamePlayers({
    min: minPlayers,
    max: maxPlayers,
    ideal: idealPlayers,
    label: formatPlayersLabel(minPlayers, maxPlayers, idealPlayers)
  });
  const faq = parseFaq(formData.get("faq"));
  const imageFields = resolveImageFields(primaryImageInput, mediaAssets);

  return {
    title,
    name: title,
    slug,
    originalTitle: optionalString(formData.get("originalTitle")),
    year: optionalPositiveInt(formData.get("year")),
    players: players as unknown as Prisma.InputJsonValue,
    minPlayers,
    maxPlayers,
    playtime: formatPlaytime(minPlayTime, maxPlayTime),
    minAge,
    age: minAge ? `${minAge}+` : null,
    difficulty,
    complexity: difficulty,
    categories: normalizeCategories(parseStringList(formData.get("categories"))),
    mechanics: normalizeMechanics(parseStringList(formData.get("mechanics"))),
    themes: sanitizeImportedList(parseStringList(formData.get("themes")), "themes"),
    publisher: optionalString(formData.get("publisher")),
    spanishPublisher: optionalString(formData.get("spanishPublisher")),
    shortDescription,
    shortSummary: shortDescription,
    description: optionalString(formData.get("description")),
    quickVerdict,
    review: quickVerdict,
    bestFor: optionalString(formData.get("bestFor")),
    notFor: optionalString(formData.get("notFor")),
    pros: parseStringList(formData.get("pros")),
    cons: parseStringList(formData.get("cons")),
    faq: faq as unknown as Prisma.InputJsonValue,
    faqs: faq as unknown as Prisma.InputJsonValue,
    seoTitle: optionalString(formData.get("seoTitle")),
    seoDescription: optionalString(formData.get("seoDescription")),
    primaryImageId: imageFields.primaryImageId,
    ...(imageFields.coverImageUrl ? imageFields : {}),
    imageFallbackAccepted: formData.get("imageFallbackAccepted") === "on",
    status,
    publishedAt: status === GameStatus.published ? publishedAt || new Date() : null
  };
}

function applyEditorialAutofill(input: Prisma.GameUpdateInput): Prisma.GameUpdateInput {
  const title = stringInput(input.title) || stringInput(input.name) || "Nuevo juego";
  const categories = stringArrayInput(input.categories);
  const mechanics = stringArrayInput(input.mechanics);
  const themes = stringArrayInput(input.themes);
  const minPlayers = numberInput(input.minPlayers);
  const maxPlayers = numberInput(input.maxPlayers);
  const autofill = buildEditorialAutofill({
    title,
    publisher: stringInput(input.publisher),
    description: stringInput(input.description),
    shortDescription: stringInput(input.shortDescription) || stringInput(input.shortSummary),
    quickVerdict: stringInput(input.quickVerdict) || stringInput(input.review),
    categories,
    mechanics,
    themes,
    players: { min: minPlayers, max: maxPlayers },
    playtime: stringInput(input.playtime),
    minAge: numberInput(input.minAge)
  });

  return {
    ...input,
    difficulty: stringInput(input.difficulty) || autofill.difficulty,
    complexity: stringInput(input.complexity) || stringInput(input.difficulty) || autofill.difficulty,
    categories: categories.length ? normalizeCategories(categories) : autofill.categories,
    mechanics: mechanics.length ? normalizeMechanics(mechanics) : autofill.mechanics,
    themes: themes.length ? themes : sanitizeImportedList(autofill.themes, "themes"),
    bestFor: stringInput(input.bestFor) || autofill.bestFor,
    notFor: stringInput(input.notFor) || autofill.notFor,
    pros: stringArrayInput(input.pros).length ? input.pros : autofill.pros,
    cons: stringArrayInput(input.cons).length ? input.cons : autofill.cons,
    faq: normalizeGameFaq(input.faq).length ? input.faq : (autofill.faq as unknown as Prisma.InputJsonValue),
    faqs: normalizeGameFaq(input.faq).length ? input.faq : (autofill.faq as unknown as Prisma.InputJsonValue)
  };
}

function stringInput(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberInput(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function stringArrayInput(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : [];
}

function parseStringList(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseFaq(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return [];
  }

  return normalizeGameFaq(
    value
      .split(/\r?\n/)
      .map((line) => {
        const [question, ...answerParts] = line.split("|");
        return { question, answer: answerParts.join("|") };
      })
      .filter((item) => item.question || item.answer)
  );
}

function normalizeGameStatus(value: FormDataEntryValue | null) {
  if (value === GameStatus.review || value === GameStatus.archived || value === GameStatus.published) {
    return value;
  }

  return GameStatus.draft;
}

function requiredString(value: FormDataEntryValue | null, message: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(message);
  }

  return value.trim();
}

function optionalString(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readStringList(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
}

function optionalPositiveInt(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatPlayersLabel(minPlayers: number | null, maxPlayers: number | null, idealPlayers: number | null) {
  const range = minPlayers && maxPlayers && minPlayers !== maxPlayers ? `${minPlayers}-${maxPlayers}` : String(minPlayers || maxPlayers || "");
  const ideal = idealPlayers ? `ideal ${idealPlayers}` : "";

  return [range, ideal].filter(Boolean).join(" · ") || null;
}

function formatPlaytime(minInput: number | null, maxInput: number | null) {
  if (minInput && maxInput && minInput !== maxInput) {
    return `${minInput}-${maxInput} min`;
  }

  if (minInput || maxInput) {
    return `${minInput || maxInput} min`;
  }

  return null;
}

function resolveImageFields(primaryImageInput: string | null, mediaAssets: Array<{ id: string; url: string }>) {
  if (!primaryImageInput) {
    return {
      primaryImageId: null,
      coverImageUrl: null,
      imageUrl: null,
      imageStatus: null
    };
  }

  if (looksLikeUrl(primaryImageInput)) {
    return {
      primaryImageId: primaryImageInput,
      coverImageUrl: primaryImageInput,
      imageUrl: primaryImageInput,
      imageStatus: "verified" as const
    };
  }

  const selectedAsset = mediaAssets.find((asset) => asset.id === primaryImageInput);
  if (selectedAsset) {
    return {
      primaryImageId: selectedAsset.id,
      coverImageUrl: selectedAsset.url,
      imageUrl: selectedAsset.url,
      imageStatus: "verified" as const
    };
  }

  return {
    primaryImageId: primaryImageInput,
    coverImageUrl: null,
    imageUrl: null,
    imageStatus: null
  };
}

function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function errorMessage(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "Ya existe otro juego con ese slug.";
  }

  return error instanceof Error ? error.message : "No se pudo guardar el juego.";
}

function revalidateGameAdmin(id: string) {
  revalidatePath("/admin/games");
  revalidatePath(`/admin/games/${id}`);
  revalidatePath(`/admin/games/${id}/edit`);
}

async function persistExternalRating(game: {
  id: string;
  ratings: Prisma.JsonValue;
  sources: Prisma.JsonValue;
  buyUrl: string | null;
  title: string | null;
  name: string | null;
}) {
  const ratingUpdate = await buildExternalRatingUpdate({
    ...game,
    title: game.title || game.name || "Nuevo juego",
    name: game.name || game.title || "Nuevo juego"
  });
  return gameRepository.update(game.id, {
    ratings: ratingUpdate.ratings
  });
}

function affectsPublicGameCollections(
  previous: {
    status: GameStatus;
    slug: string;
    title: string;
    name: string;
    publishedAt: Date | null;
    coverImageUrl: string | null;
    imageUrl: string | null;
    imageStatus: string;
    shortSummary: string | null;
    shortDescription: string | null;
    quickVerdict: string | null;
    minPlayers: number | null;
    maxPlayers: number | null;
    playtime: string | null;
    age: string | null;
    minAge: number | null;
    publisher: string | null;
    spanishPublisher: string | null;
    complexity: string | null;
    difficulty: string | null;
    categories: string[];
    mechanics: string[];
    themes: string[];
    ratings: Prisma.JsonValue;
  },
  next: {
    status: GameStatus;
    slug: string;
    title: string | null;
    name: string | null;
    publishedAt: Date | null;
    coverImageUrl: string | null;
    imageUrl: string | null;
    imageStatus: string;
    shortSummary: string | null;
    shortDescription: string | null;
    quickVerdict: string | null;
    minPlayers: number | null;
    maxPlayers: number | null;
    playtime: string | null;
    age: string | null;
    minAge: number | null;
    publisher: string | null;
    spanishPublisher: string | null;
    complexity: string | null;
    difficulty: string | null;
    categories: string[];
    mechanics: string[];
    themes: string[];
    ratings: Prisma.JsonValue;
  }
) {
  return (
    previous.status !== next.status ||
    previous.slug !== next.slug ||
    previous.title !== (next.title || "") ||
    previous.name !== (next.name || "") ||
    isoOrEmpty(previous.publishedAt) !== isoOrEmpty(next.publishedAt) ||
    previous.coverImageUrl !== next.coverImageUrl ||
    previous.imageUrl !== next.imageUrl ||
    previous.imageStatus !== next.imageStatus ||
    previous.shortSummary !== next.shortSummary ||
    previous.shortDescription !== next.shortDescription ||
    previous.quickVerdict !== next.quickVerdict ||
    previous.minPlayers !== next.minPlayers ||
    previous.maxPlayers !== next.maxPlayers ||
    previous.playtime !== next.playtime ||
    previous.age !== next.age ||
    previous.minAge !== next.minAge ||
    previous.publisher !== next.publisher ||
    previous.spanishPublisher !== next.spanishPublisher ||
    previous.complexity !== next.complexity ||
    previous.difficulty !== next.difficulty ||
    !sameStringList(previous.categories, next.categories) ||
    !sameStringList(previous.mechanics, next.mechanics) ||
    !sameStringList(previous.themes, next.themes) ||
    JSON.stringify(previous.ratings) !== JSON.stringify(next.ratings)
  );
}

function sameStringList(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isoOrEmpty(value: Date | null) {
  return value ? value.toISOString() : "";
}
