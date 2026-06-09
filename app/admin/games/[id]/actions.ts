"use server";

import { GameStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { gameRepository } from "@/lib/editorialRepositories";
import { normalizeGameFaq, normalizeGamePlayers } from "@/lib/editorialMappers";
import { validateBeforePublish } from "@/lib/validateBeforePublish";

export type GameEditorActionState = {
  errors?: string[];
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
    await gameRepository.update(id, toGameUpdateInput(formData, requestedStatus));
    revalidateGameAdmin(id);
    return { message: "Juego guardado." };
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
    const savedGame = await gameRepository.update(id, toGameUpdateInput(formData, GameStatus.review));
    const validation = validateBeforePublish(savedGame);

    if (!validation.valid) {
      return { errors: validation.errors };
    }

    await gameRepository.update(id, {
      status: GameStatus.published,
      publishedAt: new Date()
    });
    revalidateGameAdmin(id);
    revalidatePublicGame(savedGame.slug);
    return { message: "Juego publicado." };
  } catch (error) {
    return { errors: [errorMessage(error)] };
  }
}

function toGameUpdateInput(formData: FormData, status: GameStatus): Prisma.GameUpdateInput {
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
  const players = normalizeGamePlayers({
    min: minPlayers,
    max: maxPlayers,
    ideal: idealPlayers,
    label: formatPlayersLabel(minPlayers, maxPlayers, idealPlayers)
  });
  const faq = parseFaq(formData.get("faq"));

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
    categories: parseStringList(formData.get("categories")),
    mechanics: parseStringList(formData.get("mechanics")),
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
    primaryImageId: optionalString(formData.get("primaryImageId")),
    imageFallbackAccepted: formData.get("imageFallbackAccepted") === "on",
    status,
    publishedAt: status === GameStatus.published ? new Date() : null
  };
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
