import type { Game } from "@prisma/client";
import { normalizeGameFaq, normalizeGamePlayers } from "@/lib/editorialMappers";

export type PublishValidationResult = {
  valid: boolean;
  errors: string[];
};

type PublishableGame = Pick<
  Game,
  | "title"
  | "name"
  | "slug"
  | "players"
  | "minPlayers"
  | "maxPlayers"
  | "playtime"
  | "minAge"
  | "age"
  | "difficulty"
  | "complexity"
  | "categories"
  | "mechanics"
  | "shortDescription"
  | "shortSummary"
  | "description"
  | "quickVerdict"
  | "review"
  | "bestFor"
  | "notFor"
  | "pros"
  | "cons"
  | "faq"
  | "faqs"
  | "seoTitle"
  | "seoDescription"
  | "primaryImageId"
  | "imageFallbackAccepted"
>;

export function validateBeforePublish(game: PublishableGame): PublishValidationResult {
  const errors: string[] = [];
  const players = normalizeGamePlayers(game.players);
  const faq = normalizeGameFaq(game.faq || game.faqs);
  const minPlayers = players.min ?? game.minPlayers;
  const maxPlayers = players.max ?? game.maxPlayers;
  const minAge = game.minAge || parseFirstNumber(game.age);

  if (!text(game.title || game.name)) {
    errors.push("Falta el título.");
  }

  if (!text(game.slug)) {
    errors.push("Falta el slug.");
  }

  if (!minPlayers || !maxPlayers) {
    errors.push("Faltan jugadores mínimos y máximos.");
  }

  if (!text(game.playtime)) {
    errors.push("Falta la duración.");
  }

  if (!minAge) {
    errors.push("Falta la edad mínima.");
  }

  if (!text(game.difficulty || game.complexity)) {
    errors.push("Falta la dificultad.");
  }

  if (!game.categories.length) {
    errors.push("Añade al menos una categoría.");
  }

  if (!game.mechanics.length) {
    errors.push("Añade al menos una mecánica.");
  }

  if (!text(game.shortDescription || game.shortSummary)) {
    errors.push("Falta la descripción corta.");
  }

  if (!text(game.description)) {
    errors.push("Falta la descripción.");
  }

  if (!text(game.quickVerdict || game.review)) {
    errors.push("Falta el veredicto rápido.");
  }

  if (!text(game.bestFor)) {
    errors.push("Falta 'Para quién es'.");
  }

  if (!text(game.notFor)) {
    errors.push("Falta 'Para quién no es'.");
  }

  if (!game.pros.length) {
    errors.push("Añade al menos un pro.");
  }

  if (!game.cons.length) {
    errors.push("Añade al menos un contra.");
  }

  if (!faq.length) {
    errors.push("Añade al menos una FAQ.");
  }

  if (!text(game.seoTitle)) {
    errors.push("Falta el SEO title.");
  }

  if (!text(game.seoDescription)) {
    errors.push("Falta el SEO description.");
  }

  if (!text(game.primaryImageId) && !game.imageFallbackAccepted) {
    errors.push("Selecciona una imagen principal o acepta fallback de imagen.");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function text(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function parseFirstNumber(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/\d+/);
  return match ? Number(match[0]) : null;
}
