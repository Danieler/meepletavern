import type { Game } from "@prisma/client";
import { normalizeGameFaq, normalizeGamePlayers } from "@/lib/editorialMappers";

export type PublishValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  complete: boolean;
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
  | "themes"
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
  const warnings: string[] = [];
  const players = normalizeGamePlayers(game.players);
  const faq = normalizeGameFaq(game.faq || game.faqs);
  const minPlayers = players.min ?? game.minPlayers;
  const maxPlayers = players.max ?? game.maxPlayers;
  const minAge = game.minAge || parseFirstNumber(game.age);

  if (!text(game.title || game.name)) {
    errors.push("Nombre / title: falta el título.");
  }

  if (!text(game.slug)) {
    errors.push("Slug: falta el slug para la ruta pública.");
  }

  if (!minPlayers || !maxPlayers) {
    errors.push("Jugadores: falta el número de jugadores.");
  }

  if (!text(game.playtime)) {
    errors.push("Duración: falta la duración.");
  }

  if (!minAge) {
    errors.push("Edad mínima: falta la edad mínima.");
  }

  if (!text(game.shortDescription || game.shortSummary)) {
    errors.push("Descripción corta: añade una descripción breve.");
  }

  if (!text(game.description)) {
    warnings.push("Descripción: completa la descripción editorial.");
  }

  if (!text(game.quickVerdict || game.review)) {
    warnings.push("Veredicto rápido: falta el veredicto rápido.");
  }

  if (!text(game.difficulty || game.complexity)) {
    warnings.push("Dificultad: falta la dificultad.");
  }

  if (!game.categories.length) {
    warnings.push("Categorías: añade al menos una categoría.");
  }

  if (!game.mechanics.length) {
    warnings.push("Mecánicas: añade al menos una mecánica.");
  }

  if (!game.themes.length) {
    warnings.push("Temáticas: no detectadas. Puedes autocompletarlas o dejarlas vacías.");
  }

  if (!text(game.bestFor)) {
    warnings.push("Para quién es: falta este texto.");
  }

  if (!text(game.notFor)) {
    warnings.push("Para quién no es: falta este texto.");
  }

  if (!game.pros.length) {
    warnings.push("Pros: añade al menos un pro.");
  }

  if (!game.cons.length) {
    warnings.push("Contras: añade al menos un contra.");
  }

  if (!faq.length) {
    warnings.push("FAQ: añade al menos una pregunta frecuente.");
  }

  if (!text(game.seoTitle)) {
    warnings.push("SEO title: falta el SEO title.");
  }

  if (!text(game.seoDescription)) {
    warnings.push("SEO description: falta el SEO description.");
  }

  if (!text(game.primaryImageId) && !game.imageFallbackAccepted) {
    errors.push("Imagen principal: falta una imagen válida o aceptar placeholder.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    complete: errors.length === 0 && warnings.length === 0
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
