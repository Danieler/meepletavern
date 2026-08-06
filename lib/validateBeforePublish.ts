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
    errors.push("Título: escribe el nombre del juego en Datos principales.");
  }

  if (!text(game.slug)) {
    errors.push("Identificador URL: escribe el texto que se usará en la dirección pública, por ejemplo `pengoloo`.");
  }

  if (!minPlayers || !maxPlayers) {
    errors.push("Jugadores: indica jugadores mínimos y máximos en la sección Mesa.");
  } else if (minPlayers > maxPlayers) {
    errors.push("Jugadores: el mínimo no puede ser mayor que el máximo; corrige ambos valores en Mesa.");
  } else if (minPlayers < 1 || maxPlayers > 99) {
    errors.push("Jugadores: el rango debe estar entre 1 y 99; corrígelo en Mesa.");
  }

  if (!text(game.playtime)) {
    errors.push("Duración: indica la duración mínima o máxima en la sección Mesa.");
  } else if (!durationMinutes || durationMinutes < 1 || durationMinutes > 600) {
    errors.push("Duración: usa un valor entre 1 y 600 minutos en la sección Mesa.");
  }

  if (!minAge) {
    errors.push("Edad mínima: indica la edad recomendada en la sección Mesa.");
  } else if (minAge < 2 || minAge > 21) {
    errors.push("Edad mínima: usa una edad entre 2 y 21 años en la sección Mesa.");
  }

  if (game.year !== null && game.year !== undefined && (game.year < 1900 || game.year > new Date().getFullYear() + 1)) {
    errors.push(`Año: usa un año entre 1900 y ${new Date().getFullYear() + 1}, o deja el campo vacío si no se conoce.`);
  }

  if (!text(game.shortDescription || game.shortSummary)) {
    errors.push("Descripción breve: añade al menos una frase que explique qué tipo de juego es.");
  }

  if (!text(game.description)) {
    warnings.push("Descripción: completa la explicación editorial para que la ficha resulte útil.");
  }

  if (!text(game.quickVerdict || game.review)) {
    warnings.push("Veredicto rápido: añade una conclusión breve sobre para quién funciona el juego.");
  }

  if (!text(game.difficulty || game.complexity)) {
    warnings.push("Dificultad: indica si es fácil, media o alta en Datos principales.");
  }

  if (!game.categories.length) {
    warnings.push("Categorías: añade al menos una, por ejemplo Familiar, Party o Estrategia.");
  }

  if (!game.mechanics.length) {
    warnings.push("Mecánicas: añade al menos una para que el juego se pueda filtrar correctamente.");
  }

  if (!game.themes.length) {
    warnings.push("Temáticas: no detectadas. Puedes autocompletarlas o dejarlas vacías.");
  }

  if (!text(game.bestFor)) {
    warnings.push("Ideal para: explica en una frase qué grupo disfrutará más el juego.");
  } else {
    collectEditorialTextIssues("Para quién es", game.bestFor, game, errors);
  }

  if (!text(game.notFor)) {
    warnings.push("No recomendado para: explica qué tipo de grupo debería evitarlo.");
  } else {
    collectEditorialTextIssues("Para quién no es", game.notFor, game, errors);
  }

  if (!game.pros.length) {
    warnings.push("Pros: añade al menos un punto a favor, uno por línea.");
  } else {
    game.pros.forEach((item, index) => collectEditorialTextIssues(`Pros ${index + 1}`, item, game, errors));
  }

  if (!game.cons.length) {
    warnings.push("Contras: añade al menos un punto en contra, uno por línea.");
  } else {
    game.cons.forEach((item, index) => collectEditorialTextIssues(`Contras ${index + 1}`, item, game, errors));
  }

  if (!faq.length) {
    warnings.push("FAQ: añade al menos una línea con el formato `Pregunta | Respuesta`.");
  }

  if (!text(game.seoTitle)) {
    warnings.push("Título SEO: añade el título que aparecerá en buscadores.");
  }

  if (!text(game.seoDescription)) {
    warnings.push("Descripción SEO: añade un resumen para buscadores.");
  }

  if (!text(game.primaryImageId) && !game.imageFallbackAccepted) {
    errors.push("Imagen principal: selecciona una portada o marca «Aceptar fallback de imagen».");
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
