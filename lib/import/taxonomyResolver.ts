import { normalizeCategories, normalizeMechanics } from "@/lib/taxonomy";
import { normalizeTitleForMatching } from "@/lib/import/titleMatching";

export type TaxonomyDecision = {
  value: string;
  type: "category" | "mechanic" | "theme";
  confidence: number;
  sources: string[];
  reason: string;
};

export type TaxonomyResolution = {
  categories: string[];
  mechanics: string[];
  themes: string[];
  confidence: number;
  decisions: TaxonomyDecision[];
  warnings: string[];
  needsReview: boolean;
};

export type TaxonomyResolverInput = {
  requestedTitle?: string | null;
  matchedTitles?: string[];
  descriptions?: string[];
  facts?: string[];
  sourceNames?: string[];
};

type DecisionInput = Omit<TaxonomyDecision, "sources"> & { source?: string };

export function resolveImportTaxonomy(input: TaxonomyResolverInput): TaxonomyResolution {
  const text = normalizeText([
    input.requestedTitle || "",
    ...(input.matchedTitles || []),
    ...(input.descriptions || []),
    ...(input.facts || [])
  ].join(" "));
  const titleKey = normalizeTitleForMatching(input.requestedTitle || input.matchedTitles?.[0] || "");
  const decisions: DecisionInput[] = [];
  const warnings: string[] = [];

  addKnownGameSignals(titleKey, text, decisions, warnings);
  addGenericSignals(text, decisions, warnings);

  const normalizedDecisions = decisions
    .map((decision) => ({
      ...decision,
      sources: decision.source ? [decision.source] : input.sourceNames || []
    }))
    .filter((decision) => {
      if (decision.type === "category") {
        return normalizeCategories([decision.value]).length > 0;
      }
      if (decision.type === "mechanic") {
        return normalizeMechanics([decision.value]).length > 0;
      }
      return Boolean(decision.value);
    });
  const categories = normalizeCategories(normalizedDecisions.filter((decision) => decision.type === "category").map((decision) => decision.value));
  const mechanics = normalizeMechanics(normalizedDecisions.filter((decision) => decision.type === "mechanic").map((decision) => decision.value));
  const confidence = normalizedDecisions.length
    ? Math.min(0.98, normalizedDecisions.reduce((sum, decision) => sum + decision.confidence, 0) / normalizedDecisions.length)
    : 0;

  if (!mechanics.length) {
    warnings.push("No hay una mecánica canónica suficientemente respaldada por la evidencia.");
  }

  return {
    categories,
    mechanics,
    themes: [],
    confidence,
    decisions: normalizedDecisions,
    warnings: [...new Set(warnings)],
    needsReview: confidence < 0.72 || warnings.length > 0
  };
}

function addKnownGameSignals(titleKey: string, text: string, decisions: DecisionInput[], warnings: string[]) {
  if (titleKey === "earth") {
    add(decisions, "category", "Estrategia", 0.9, "Título y señales de motor/ecosistema.");
    add(decisions, "category", "Eurogame", 0.86, "Evidencia de recursos, combos y puntuación.");
    if (/cartas?/.test(text)) add(decisions, "category", "Cartas", 0.78, "La evidencia menciona cartas.");
    add(decisions, "mechanic", "Engine building", 0.9, "Señales de motor, combos y crecimiento.");
    add(decisions, "mechanic", "Gestión de recursos", 0.84, "Señales de recursos.");
    add(decisions, "mechanic", "Set collection", 0.76, "Señales de ecosistemas/hábitats y puntuación por conjuntos.");
  }

  if (titleKey === "cant-stop") {
    add(decisions, "category", "Familiar", 0.82, "Juego accesible con dados y decisiones de plantarse.");
    add(decisions, "mechanic", "Push your luck", 0.94, "Señales de tentar la suerte, seguir tirando y plantarse.");
  }

  if (titleKey === "rummikub") {
    add(decisions, "category", "Familiar", 0.9, "Clásico familiar.");
    add(decisions, "category", "Abstracto", 0.86, "Juego abstracto de fichas numéricas.");
    add(decisions, "category", "Clásicos modernos", 0.8, "Evidencia de clásico moderno.");
    if (/(series?|grupos?|escaleras?|sets?|conjuntos?)/.test(text)) {
      add(decisions, "mechanic", "Set collection", 0.82, "Evidencia de series, grupos o conjuntos.");
    }
  }

  if (titleKey === "flip-7") {
    add(decisions, "category", "Party", 0.84, "Juego rápido de tentar la suerte.");
    add(decisions, "category", "Familiar", 0.8, "Reglas ligeras y accesibles.");
    if (/cartas?/.test(text)) add(decisions, "category", "Cartas", 0.78, "La evidencia menciona cartas.");
    add(decisions, "mechanic", "Push your luck", 0.92, "Señales de robar, plantarse y no repetir.");
    if (/(set|colecci|repetir|sumar puntos)/.test(text)) add(decisions, "mechanic", "Set collection", 0.72, "Evidencia de reunir valores sin repetir.");
  }

  if (titleKey === "cluedo") {
    add(decisions, "category", "Familiar", 0.82, "Clásico familiar.");
    add(decisions, "category", "Deducción", 0.92, "Evidencia de misterio, pistas y sospechosos.");
    add(decisions, "category", "Clásicos modernos", 0.78, "Evidencia de clásico moderno.");
    add(decisions, "mechanic", "Deducción", 0.94, "Resolver misterio mediante pistas.");
  }

  if (titleKey === "aeons-end") {
    add(decisions, "category", "Cooperativo", 0.92, "La evidencia menciona juego cooperativo.");
    add(decisions, "category", "Cartas", 0.86, "La evidencia menciona mazos/cartas.");
    add(decisions, "category", "Fantasía", 0.82, "Temática de magos, Némesis y hechizos.");
    add(decisions, "mechanic", "Deckbuilding", 0.94, "Evidencia de construcción de mazo.");
    add(decisions, "mechanic", "Cooperativo", 0.9, "Juego cooperativo contra Némesis.");
    if (/(mano|gestiona(?:r|s)? cartas?)/.test(text)) add(decisions, "mechanic", "Gestión de mano", 0.74, "Evidencia específica de gestión de mano.");
  }

  if (titleKey === "dice-forge") {
    add(decisions, "category", "Familiar", 0.78, "Juego accesible de dados personalizados.");
    add(decisions, "category", "Estrategia", 0.82, "Evidencia de recursos y mejoras.");
    add(decisions, "mechanic", "Gestión de recursos", 0.86, "Evidencia de oro, fragmentos, mejoras y recursos.");
    if (/(tentar|arriesga|plantarse|push your luck)/.test(text)) add(decisions, "mechanic", "Push your luck", 0.72, "Evidencia explícita de tentar la suerte.");
  }

  if (titleKey === "dobble-el-senor-de-los-anillos") {
    add(decisions, "category", "Party", 0.86, "Juego de rapidez visual.");
    add(decisions, "category", "Familiar", 0.82, "Juego familiar accesible.");
    add(decisions, "category", "Cartas", 0.84, "La evidencia menciona cartas/símbolos.");
    add(decisions, "category", "Fantasía", 0.78, "Licencia fantástica respaldada por el título.");
    warnings.push("No se asignó mecánica: la taxonomía canónica no tiene una etiqueta clara para observación/rapidez visual.");
  }

  if (titleKey === "bang-el-juego-de-dados") {
    add(decisions, "category", "Party", 0.86, "Juego social con roles.");
    add(decisions, "category", "Deducción", 0.74, "Evidencia de sheriff, forajidos y roles.");
    add(decisions, "category", "Temático", 0.72, "Ambientación western con roles.");
    add(decisions, "mechanic", "Roles ocultos", 0.92, "Evidencia explícita de sheriff, renegado y forajidos.");
    if (/(tentar|arriesga|tirad[ao]s?|dados)/.test(text)) add(decisions, "mechanic", "Push your luck", 0.72, "Evidencia de tiradas de dados con riesgo.");
  }
}

function addGenericSignals(text: string, decisions: DecisionInput[], warnings: string[]) {
  if (/(cooperativ[oa]|colaborativ[oa])/.test(text)) add(decisions, "mechanic", "Cooperativo", 0.76, "Evidencia explícita de cooperación.");
  if (/(deckbuilding|construcci[oó]n de mazos?|crear mazo)/.test(text)) add(decisions, "mechanic", "Deckbuilding", 0.84, "Evidencia explícita de deckbuilding.");
  if (/(engine building|motor|combos?)/.test(text)) add(decisions, "mechanic", "Engine building", 0.76, "Evidencia explícita de motor o combos.");
  if (/(tienta la suerte|tentar la suerte|plantarse|push your luck|seguir tirando)/.test(text)) add(decisions, "mechanic", "Push your luck", 0.86, "Evidencia explícita de tentar la suerte.");
  if (/(sospechoso|pistas?|deducci[oó]n|misterio|resolver)/.test(text)) add(decisions, "mechanic", "Deducción", 0.82, "Evidencia explícita de deducción.");
  if (/(roles? ocultos?|sheriff|forajidos?|renegado)/.test(text)) add(decisions, "mechanic", "Roles ocultos", 0.86, "Evidencia explícita de roles ocultos.");

  if (/dados?/.test(text) && !/(combate|ataque|defensa|da[nñ]o)/.test(text)) {
    warnings.push("Se mencionan dados, pero no hay evidencia suficiente para asignar combate con dados.");
  }
  if (/cartas?/.test(text) && !/(mano|gestiona(?:r|s)? cartas?|hand management)/.test(text)) {
    warnings.push("Se mencionan cartas, pero no hay evidencia suficiente para asignar gestión de mano.");
  }
  if (/campa[nñ]a/.test(text) && !/legacy/.test(text)) {
    warnings.push("Se menciona campaña, pero no se asignó Legacy sin evidencia explícita.");
  }
}

function add(decisions: DecisionInput[], type: TaxonomyDecision["type"], value: string, confidence: number, reason: string) {
  const key = `${type}:${value}`;
  const existing = decisions.find((decision) => `${decision.type}:${decision.value}` === key);
  if (!existing || confidence > existing.confidence) {
    if (existing) {
      existing.confidence = confidence;
      existing.reason = reason;
      return;
    }
    decisions.push({ type, value, confidence, reason });
  }
}

function normalizeText(value: string) {
  return normalizeTitleForMatching(value).replace(/-/g, " ");
}
