import { normalizeGameFaq } from "@/lib/editorialMappers";

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
  const categories = mergeUnique(input.categories || [], profile.categories);
  const mechanics = mergeUnique(input.mechanics || [], profile.mechanics);
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
  categories: ["Fiesta", "Roles ocultos", "Deducción", "Faroleo"],
  mechanics: ["Roles ocultos", "Deducción social", "Votación", "Eliminación de jugadores", "Moderador"],
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
    "Conviene revisar reglas y ritmo antes de publicarlo como recomendación cerrada."
  ],
  faq: (title: string, input: EditorialAutofillInput) => [
    {
      question: `¿${title} es competitivo o cooperativo?`,
      answer: "Los datos importados apuntan a una experiencia cooperativa; conviene revisarlo antes de publicar la ficha definitiva."
    },
    {
      question: "¿Cuántos jugadores admite?",
      answer: playerAnswer(input, "Revisa el rango de jugadores antes de publicarlo.")
    },
    {
      question: "¿Es difícil?",
      answer: "La dificultad queda marcada como media de forma preliminar y debe revisarse editorialmente."
    }
  ]
};

const partyProfile = {
  difficulty: "Fácil",
  categories: ["Fiesta", "Familiar"],
  mechanics: ["Interacción"],
  themes: ["Fiesta", "Familiar"],
  bestFor: () => "Grupos que buscan una partida accesible, social y fácil de sacar a mesa.",
  notFor: () => "Jugadores que buscan estrategia profunda, planificación larga o partidas silenciosas.",
  pros: () => ["Fácil de proponer en grupo.", "Buena opción para reuniones.", "No exige una preparación pesada."],
  cons: () => ["Depende mucho del ambiente de la mesa.", "Puede quedarse corto para jugadores muy estratégicos."],
  faq: (_title: string, input: EditorialAutofillInput) => [
    { question: "¿Es adecuado para grupos grandes?", answer: playerAnswer(input, "Parece orientado a juego social; revisa el rango exacto de jugadores.") },
    { question: "¿Es difícil de aprender?", answer: "No debería ser especialmente difícil; queda como ficha preliminar pendiente de revisión." }
  ]
};

const familyProfile = {
  difficulty: "Fácil",
  categories: ["Familiar", "Infantil"],
  mechanics: ["Accesible"],
  themes: ["Familiar", "Infantil"],
  bestFor: () => "Familias, jugadores ocasionales y mesas que quieren reglas sencillas.",
  notFor: () => "Jugadores que buscan mucha profundidad estratégica o partidas largas y exigentes.",
  pros: () => ["Accesible para nuevas mesas.", "Buen candidato para jugar en familia.", "Formato fácil de revisar y completar editorialmente."],
  cons: () => ["Puede quedarse corto para jugadores expertos.", "La recomendación final depende de revisar edad, duración y reglas."],
  faq: (_title: string, input: EditorialAutofillInput) => [
    { question: "¿Es familiar?", answer: "Los datos disponibles apuntan a una ficha accesible, pero conviene revisar la edad recomendada antes de publicarla." },
    { question: "¿Cuánto dura?", answer: playtimeAnswer(input) }
  ]
};

const genericProfile = {
  difficulty: "Media ligera",
  categories: ["Familiar"],
  mechanics: ["Interacción"],
  themes: [],
  bestFor: (title: string) =>
    `Jugadores que quieren descubrir ${title} con una ficha preliminar clara antes de completar la reseña editorial.`,
  notFor: () =>
    "Jugadores que necesitan una recomendación cerrada, una reseña completa o datos editoriales ya revisados al detalle.",
  pros: () => [
    "Ficha base creada para revisión editorial.",
    "Permite publicar una entrada básica sin bloquear el flujo.",
    "Se puede mejorar más adelante con valoración de mesa."
  ],
  cons: () => [
    "Necesita revisión editorial para afinar la recomendación.",
    "Algunos datos pueden depender de la fuente importada.",
    "No sustituye una reseña completa."
  ],
  faq: (_title: string, input: EditorialAutofillInput) => [
    { question: "¿Está la ficha completa?", answer: "Es una ficha publicable de base, pero puede mejorar con revisión editorial." },
    { question: "¿Cuántos jugadores admite?", answer: playerAnswer(input, "Revisa el rango de jugadores antes de publicarlo.") },
    { question: "¿Cuánto dura?", answer: playtimeAnswer(input) }
  ]
};

function playerAnswer(input: EditorialAutofillInput, fallback: string) {
  const min = input.players?.min || null;
  const max = input.players?.max || null;

  if (min && max) {
    return min === max ? `La ficha importada indica ${min} jugadores.` : `La ficha importada indica ${min}-${max} jugadores.`;
  }

  return fallback;
}

function playtimeAnswer(input: EditorialAutofillInput) {
  return input.playtime ? `La duración importada es ${input.playtime}.` : "La duración debe revisarse antes de cerrar la ficha.";
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
