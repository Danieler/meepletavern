"use server";

import { GameStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { gameRepository } from "@/lib/editorialRepositories";
import { buildEditorialAutofill } from "@/lib/editorialAutofill";
import { normalizeGameFaq, normalizeGamePlayers } from "@/lib/editorialMappers";
import { buildPublicEditorialCopy, needsPublicEditorialRewrite } from "@/lib/publicEditorialCopy";
import { sanitizeImportedList } from "@/lib/importedTextSanitizer";
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

  if (requestedStatus === GameStatus.published) {
    return { errors: ["Usa el botón Publicar para cambiar a published."] };
  }

  try {
    const editorGame = await gameRepository.getEditorById(id);
    if (!editorGame) {
      throw new Error("No existe ese juego.");
    }

    const savedGame = await gameRepository.update(id, toGameUpdateInput(formData, requestedStatus, editorGame.mediaAssets));
    const validation = validateBeforePublish(savedGame);
    revalidateGameAdmin(id);
    return validation.warnings.length
      ? { message: "Juego guardado. Se puede publicar, pero la ficha está incompleta.", warnings: validation.warnings }
      : { message: "Juego guardado. Ficha completa." };
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
      toGameUpdateInput(formData, GameStatus.review, editorGame.mediaAssets)
    );
    const validation = validateBeforePublish(savedGame);

    if (!validation.valid) {
      return { errors: validation.errors, warnings: validation.warnings };
    }

    if (needsPublicEditorialRewrite({
      title: savedGame.title || savedGame.name,
      shortDescription: savedGame.shortDescription,
      shortSummary: savedGame.shortSummary,
      description: savedGame.description,
      quickVerdict: savedGame.quickVerdict || savedGame.review,
      review: savedGame.review
    })) {
      await gameRepository.update(id, buildPublicEditorialCopy({
        title: savedGame.title || savedGame.name,
        playersLabel: formatPlayersLabel(savedGame.minPlayers, savedGame.maxPlayers, null),
        playtime: savedGame.playtime,
        complexity: savedGame.complexity || savedGame.difficulty,
        shortDescription: savedGame.shortDescription,
        shortSummary: savedGame.shortSummary,
        description: savedGame.description,
        quickVerdict: savedGame.quickVerdict || savedGame.review,
        review: savedGame.review
      }));
    }

    await gameRepository.update(id, {
      status: GameStatus.published,
      publishedAt: new Date()
    });
    revalidateGameAdmin(id);
    revalidatePublicGame(savedGame.slug);
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
    const validation = validateBeforePublish(savedGame);

    revalidateGameAdmin(id);
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
    revalidatePublicGame(game.slug);
  }
  redirect(returnTo);
}

function toGameUpdateInput(formData: FormData, status: GameStatus, mediaAssets: Array<{ id: string; url: string }>): Prisma.GameUpdateInput {
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
    categories: sanitizeImportedList(parseStringList(formData.get("categories")), "categories"),
    mechanics: sanitizeImportedList(parseStringList(formData.get("mechanics")), "mechanics"),
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
    publishedAt: status === GameStatus.published ? new Date() : null
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
    categories: categories.length ? categories : autofill.categories,
    mechanics: mechanics.length ? mechanics : autofill.mechanics,
    themes: themes.length ? themes : autofill.themes,
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

function revalidatePublicGame(slug: string) {
  revalidatePath("/");
  revalidatePath("/juegos");
  revalidatePath(`/juegos/${slug}`);
  revalidatePath("/rankings");
  revalidatePath("/resenas");
}
