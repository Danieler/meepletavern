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
  | "year"
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
  const durationMinutes = parseFirstNumber(game.playtime);

  if (!text(game.title || game.name)) {
    errors.push("Nombre / title: falta el título.");
  }

  if (!text(game.slug)) {
    errors.push("Slug: falta el slug para la ruta pública.");
  }

  if (!minPlayers || !maxPlayers) {
    errors.push("Jugadores: falta el número de jugadores.");
  } else if (minPlayers > maxPlayers) {
    errors.push("Jugadores: el mínimo no puede ser mayor que el máximo.");
  } else if (minPlayers < 1 || maxPlayers > 99) {
    errors.push("Jugadores: revisa el rango, parece fuera de escala.");
  }

  if (!text(game.playtime)) {
    errors.push("Duración: falta la duración.");
  } else if (!durationMinutes || durationMinutes < 1 || durationMinutes > 600) {
    errors.push("Duración: revisa la duración, parece fuera de escala.");
  }

  if (!minAge) {
    errors.push("Edad mínima: falta la edad mínima.");
  } else if (minAge < 2 || minAge > 21) {
    errors.push("Edad mínima: revisa la edad, parece fuera de escala.");
  }

  if (game.year !== null && game.year !== undefined && (game.year < 1900 || game.year > new Date().getFullYear() + 1)) {
    errors.push("Año: revisa el año de publicación, parece inválido.");
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
  } else {
    collectEditorialTextIssues("Para quién es", game.bestFor, game, errors);
  }

  if (!text(game.notFor)) {
    warnings.push("Para quién no es: falta este texto.");
  } else {
    collectEditorialTextIssues("Para quién no es", game.notFor, game, errors);
  }

  if (!game.pros.length) {
    warnings.push("Pros: añade al menos un pro.");
  } else {
    game.pros.forEach((item, index) => collectEditorialTextIssues(`Pros ${index + 1}`, item, game, errors));
  }

  if (!game.cons.length) {
    warnings.push("Contras: añade al menos un contra.");
  } else {
    game.cons.forEach((item, index) => collectEditorialTextIssues(`Contras ${index + 1}`, item, game, errors));
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

function collectEditorialTextIssues(
  field: string,
  value: string | null | undefined,
  game: PublishableGame,
  errors: string[]
) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return;

  if (normalized.length < 12) {
    errors.push(`${field}: el texto es demasiado genérico.`);
  }

  if (/pendiente|por completar|lorem|todo|n\/a|sin datos/i.test(normalized)) {
    errors.push(`${field}: contiene texto pendiente o placeholder.`);
  }

  if (
    /\bmoderador(?:a|es)?\b|\broles ocultos\b|\beliminaci[oó]n\b|\bfaroleo\b/.test(normalized) &&
    !isSocialDeductionGame(game)
  ) {
    errors.push(`${field}: revisa posible contaminación editorial de otro juego.`);
  }
}

function isSocialDeductionGame(game: PublishableGame) {
  const haystack = [
    game.title,
    game.name,
    ...(game.categories || []),
    ...(game.mechanics || []),
    ...(game.themes || [])
  ].join(" ").toLowerCase();

  return /deducci[oó]n|roles ocultos|party|hombres lobo|werewolf|secret hitler|resistencia|avalon|spyfall/.test(haystack);
}
