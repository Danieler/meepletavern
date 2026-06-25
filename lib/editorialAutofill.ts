import { normalizeGameFaq } from "@/lib/editorialMappers";
import { normalizeCategories, normalizeMechanics } from "@/lib/taxonomy";

export type EditorialAutofillInput = {
  title: string;
  publisher?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  quickVerdict?: string | null;
  categories?: string[];
  mechanics?: string[];
  themes?: string[];
  players?: {
    min?: number | null;
    max?: number | null;
  };
  playtime?: string | null;
  minAge?: number | null;
};

export type EditorialAutofillResult = {
  difficulty: string;
  categories: string[];
  mechanics: string[];
  themes: string[];
  bestFor: string;
  notFor: string;
  pros: string[];
  cons: string[];
  faq: Array<{ question: string; answer: string }>;
};

type EditorialAutofillProfile = {
  difficulty: string;
  categories: string[];
  mechanics: string[];
  themes: string[];
  bestFor: (title: string, input: EditorialAutofillInput) => string;
  notFor: (title: string, input: EditorialAutofillInput) => string;
  pros: (title: string, input: EditorialAutofillInput) => string[];
  cons: (title: string, input: EditorialAutofillInput) => string[];
  faq: (title: string, input: EditorialAutofillInput) => Array<{ question: string; answer: string }>;
};

export function buildEditorialAutofill(input: EditorialAutofillInput): EditorialAutofillResult {
  const title = cleanTitle(input.title);
  const text = [
    input.title,
    input.publisher,
    input.description,
    input.shortDescription,
    input.quickVerdict,
    ...(input.categories || []),
    ...(input.mechanics || []),
    ...(input.themes || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const profile = detectProfile(text, input);
  const categories = normalizeCategories(mergeUnique(input.categories || [], profile.categories));
  const mechanics = normalizeMechanics(mergeUnique(input.mechanics || [], profile.mechanics));
  const themes = mergeUnique(input.themes || [], profile.themes);

  return {
    difficulty: profile.difficulty,
    categories,
    mechanics,
    themes,
    bestFor: profile.bestFor(title, input),
    notFor: profile.notFor(title, input),
    pros: profile.pros(title, input),
    cons: profile.cons(title, input),
    faq: normalizeGameFaq(profile.faq(title, input))
  };
}

function detectProfile(text: string, input: EditorialAutofillInput): EditorialAutofillProfile {
  if (/(hombres lobo|castronegro|werewolf|aldeanos|roles?|moderador|noche|votaci[oó]n|acusaciones?|faroleo)/i.test(text)) {
    return socialDeductionProfile;
  }

  if (/(cooperativ|zombicide|zombie|supervivencia)/i.test(text)) {
    return cooperativeProfile;
  }

  if (/(party|fiesta|reuni[oó]n|grupos? grandes?|familiar)/i.test(text) || (input.players?.max || 0) >= 8) {
    return partyProfile;
  }

  if (/(infantil|ni[nñ]os|peques|familia)/i.test(text) || (input.minAge && input.minAge <= 8)) {
    return familyProfile;
  }

  return genericProfile;
}

const socialDeductionProfile = {
  difficulty: "Fácil",
  categories: ["Party", "Deducción"],
  mechanics: ["Roles ocultos", "Deducción"],
  themes: ["Fiesta", "Roles ocultos", "Deducción"],
  bestFor: (_title: string, input: EditorialAutofillInput) =>
    `${groupText(input)} fiestas, reuniones familiares o de amigos y jugadores que disfrutan acusando, mintiendo, deduciendo y metiéndose en el papel.`,
  notFor: () =>
    "Grupos pequeños, jugadores que no disfrutan mintiendo o discutiendo en voz alta, personas que prefieren estrategia profunda o quienes no quieren eliminación de jugadores.",
  pros: () => [
    "Muy fácil de explicar.",
    "Funciona muy bien con grupos grandes.",
    "Genera risas, tensión y momentos memorables.",
    "Ocupa poco y es fácil de transportar.",
    "Ideal para fiestas y reuniones."
  ],
  cons: () => [
    "Necesita bastantes jugadores para brillar.",
    "Requiere moderador.",
    "Puede eliminar jugadores antes del final.",
    "Depende mucho del grupo.",
    "No es ideal para quienes buscan estrategia profunda."
  ],
  faq: (_title: string, input: EditorialAutofillInput) => [
    {
      question: "¿Cuántos jugadores necesita?",
      answer: playerAnswer(input, "Está pensado para grupos grandes.")
    },
    {
      question: "¿Es difícil de aprender?",
      answer: "No. Es un juego fácil basado en roles ocultos, conversación, deducción y faroleo."
    },
    {
      question: "¿Hace falta narrador o moderador?",
      answer: "Sí. Este tipo de juego suele utilizar un moderador para dirigir las fases de la partida."
    },
    {
      question: "¿Funciona bien a 2-4 jugadores?",
      answer: "No es lo ideal. Brilla con grupos grandes."
    }
  ]
};

const cooperativeProfile = {
  difficulty: "Media",
  categories: ["Cooperativo", "Aventura"],
  mechanics: ["Cooperativo"],
  themes: ["Cooperativo", "Aventura"],
  bestFor: (title: string) =>
    `Jugadores que quieren afrontar ${title} en equipo, coordinar decisiones y vivir una partida con tensión compartida.`,
  notFor: () =>
    "Mesas que prefieren competir entre sí, partidas muy ligeras o juegos donde cada jugador lleve su estrategia de forma independiente.",
  pros: () => [
    "Favorece la conversación y la coordinación.",
    "Da margen para vivir la partida como una experiencia de grupo.",
    "Encaja bien con mesas que disfrutan cooperando."
  ],
  cons: () => [
    "Puede depender mucho de que el grupo se coordine bien.",
    "No es la mejor opción para quien busca competición directa.",
    "Puede haber un líder alfa que domine las decisiones del grupo."
  ],
  faq: (title: string, input: EditorialAutofillInput) => [
    {
      question: `¿${title} es competitivo o cooperativo?`,
      answer: "Es un juego cooperativo donde todos los jugadores trabajan juntos hacia un objetivo común."
    },
    {
      question: "¿Cuántos jugadores admite?",
      answer: playerAnswer(input, "Revisa el número de jugadores indicado en la caja.")
    },
    {
      question: "¿Es difícil?",
      answer: "Tiene una dificultad media, accesible con una partida de prueba."
    }
  ]
};

const partyProfile = {
  difficulty: "Fácil",
  categories: ["Party", "Familiar"],
  mechanics: [],
  themes: ["Fiesta", "Familiar"],
  bestFor: () => "Grupos que buscan una partida accesible, social y fácil de sacar a mesa.",
  notFor: () => "Jugadores que buscan estrategia profunda, planificación larga o partidas silenciosas.",
  pros: () => ["Fácil de proponer en grupo.", "Buena opción para reuniones.", "No exige una preparación pesada."],
  cons: () => ["Depende mucho del ambiente de la mesa.", "Puede quedarse corto para jugadores muy estratégicos."],
  faq: (_title: string, input: EditorialAutofillInput) => [
    { question: "¿Es adecuado para grupos grandes?", answer: playerAnswer(input, "Es un juego orientado al aspecto social y las dinámicas de grupo.") },
    { question: "¿Es difícil de aprender?", answer: "No debería ser especialmente difícil; las reglas suelen ser sencillas para facilitar el juego en grupo." }
  ]
};

const familyProfile = {
  difficulty: "Fácil",
  categories: ["Familiar", "Infantil"],
  mechanics: [],
  themes: ["Familiar", "Infantil"],
  bestFor: () => "Familias, jugadores ocasionales y mesas que quieren reglas sencillas.",
  notFor: () => "Jugadores que buscan mucha profundidad estratégica o partidas largas y exigentes.",
  pros: () => ["Accesible para nuevas mesas.", "Buen candidato para jugar en familia.", "Reglas sencillas que permiten empezar rápido."],
  cons: () => ["Puede quedarse corto para jugadores expertos.", "La diversión depende mucho de la edad y el grupo."],
  faq: (_title: string, input: EditorialAutofillInput) => [
    { question: "¿Es familiar?", answer: "Sí, es un juego pensado para jugar en familia con reglas accesibles." },
    { question: "¿Cuánto dura?", answer: playtimeAnswer(input) }
  ]
};

const genericProfile = {
  difficulty: "Media ligera",
  categories: ["Familiar"],
  mechanics: [],
  themes: [],
  bestFor: (title: string) =>
    `Jugadores interesados en probar ${title} y descubrir lo que ofrece sobre la mesa.`,
  notFor: () =>
    "Jugadores que buscan una experiencia de juego muy específica o partidas con mecánicas muy concretas.",
  pros: (title: string) => [
    `Buena puerta de entrada para conocer ${title}.`,
    "Formato accesible para mesas variadas.",
    "Apto para diferentes tipos de grupo."
  ],
  cons: () => [
    "La experiencia puede variar según el grupo de juego.",
    "Conviene revisar las reglas antes de la primera partida.",
    "Puede no destacar en un aspecto concreto frente a juegos más especializados."
  ],
  faq: (_title: string, input: EditorialAutofillInput) => [
    { question: "¿Cuántos jugadores admite?", answer: playerAnswer(input, "Consulta la caja o las reglas para conocer el número de jugadores.") },
    { question: "¿Cuánto dura?", answer: playtimeAnswer(input) }
  ]
};


function playerAnswer(input: EditorialAutofillInput, fallback: string) {
  const min = input.players?.min || null;
  const max = input.players?.max || null;

  if (min && max) {
    return min === max ? `Admite ${min} jugadores.` : `Admite de ${min} a ${max} jugadores.`;
  }

  return fallback;
}

function playtimeAnswer(input: EditorialAutofillInput) {
  return input.playtime ? `La duración aproximada es de ${input.playtime}.` : "Consulta la caja o las reglas para conocer la duración de la partida.";
}

function groupText(input: EditorialAutofillInput) {
  const max = input.players?.max || null;
  return max && max >= 8 ? "Grupos grandes," : "Grupos amplios,";
}

function cleanTitle(value: string) {
  return value.trim() || "este juego";
}

function mergeUnique(existing: string[], inferred: string[]) {
  const values = new Map<string, string>();
  for (const item of [...existing, ...inferred]) {
    const trimmed = item.trim();
    if (trimmed) {
      values.set(trimmed.toLowerCase(), trimmed);
    }
  }

  return [...values.values()];
}
