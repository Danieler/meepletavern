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
  // --- CATEGORÍAS CANÓNICAS ---
  if (/\b(familiar|familiares|family|para toda la familia)\b/i.test(text)) {
    add(decisions, "category", "Familiar", 0.76, "Texto menciona familiar/familia.");
  }
  if (/\b(infantil|infantiles|ninos?|kids?|childrens?|para ninos)\b/i.test(text)) {
    add(decisions, "category", "Infantil", 0.82, "Texto menciona infantil o niños.");
  }
  if (/\b(party( games?)?|fiestas?|social(es)?|juegos? de fiesta)\b/i.test(text)) {
    add(decisions, "category", "Party", 0.82, "Texto menciona fiesta/social/party.");
  }
  if (/\b(iniciacion|principiantes|gateway)\b/i.test(text)) {
    add(decisions, "category", "Gateway", 0.80, "Texto menciona juego de iniciación/gateway.");
  }
  if (/\b(estrategia|estrategico|tactico|strategy|strategic)\b/i.test(text)) {
    add(decisions, "category", "Estrategia", 0.80, "Texto menciona estrategia.");
  }
  if (/\b(eurogames?|juegos? de gestion)\b/i.test(text)) {
    add(decisions, "category", "Eurogame", 0.84, "Texto menciona eurogame o gestión.");
  }
  if (/\b(tematico|ambientacion|inmersivo|thematic)\b/i.test(text)) {
    add(decisions, "category", "Temático", 0.74, "Texto menciona temático/inmersivo.");
  }
  if (/\b(cooperativos?|colaborativos?|cooperative|co-?op)\b/i.test(text)) {
    add(decisions, "category", "Cooperativo", 0.78, "Texto menciona cooperativo.");
  }
  if (/\b(solitarios?|solo mode|modo solo|un jugador|1 jugador|1 player)\b/i.test(text)) {
    add(decisions, "category", "Solitario", 0.80, "Texto menciona modo solitario/un jugador.");
  }
  if (/\b(dos jugadores|2 jugadores|para 2|para dos|2 players?|two players?|duelo|duel)\b/i.test(text)) {
    add(decisions, "category", "Dos jugadores", 0.84, "Texto menciona dos jugadores o duelo.");
  }
  if (/\b(wargames?|juegos? de guerra|belico|military|militares)\b/i.test(text)) {
    add(decisions, "category", "Wargame", 0.82, "Texto menciona wargame/guerra.");
  }
  if (/\b(miniaturas?|miniatures?)\b/i.test(text)) {
    add(decisions, "category", "Miniaturas", 0.80, "Texto menciona miniaturas.");
  }
  if (/\b(dungeon crawlers?|mazmorreo|exploracion de mazmorras)\b/i.test(text)) {
    add(decisions, "category", "Dungeon Crawler", 0.84, "Texto menciona dungeon crawler.");
  }
  if (/\b(campana|campaigns?|legacy)\b/i.test(text)) {
    add(decisions, "category", "Campaña / Legacy", 0.82, "Texto menciona campaña o legacy.");
  }
  if (/\b(narrativos?|narrative|historia interactiva)\b/i.test(text)) {
    add(decisions, "category", "Narrativo", 0.80, "Texto menciona narrativo.");
  }
  if (/\b(aventuras?|adventures?)\b/i.test(text)) {
    add(decisions, "category", "Aventura", 0.78, "Texto menciona aventura.");
  }
  if (/\b(juegos? de cartas|card games?|juegos? de naipes)\b/i.test(text)) {
    add(decisions, "category", "Cartas", 0.78, "Texto menciona juego de cartas.");
  }
  if (/\b(deckbuilding|construccion de mazos?)\b/i.test(text)) {
    add(decisions, "category", "Deckbuilding", 0.84, "Texto menciona construcción de mazos.");
  }
  if (/\b(roll and write|roll y write|roll & write|flip and write|flip y write)\b/i.test(text)) {
    add(decisions, "category", "Roll & Write", 0.88, "Texto menciona roll/flip & write.");
  }
  if (/\b(deduccion|deduction|misterio|resolver misterios?|investigacion|sospechosos?|pistas?)\b/i.test(text)) {
    add(decisions, "category", "Deducción", 0.82, "Texto menciona deducción/misterio.");
  }
  if (/\b(abstractos?|abstract)\b/i.test(text)) {
    add(decisions, "category", "Abstracto", 0.82, "Texto menciona abstracto.");
  }
  if (/\b(clasicos? modernos?|modern classics?)\b/i.test(text)) {
    add(decisions, "category", "Clásicos modernos", 0.80, "Texto menciona clásico moderno.");
  }
  if (/\b(fantasia|fantasy|magia|hechizos|elfos|dragones)\b/i.test(text)) {
    add(decisions, "category", "Fantasía", 0.78, "Texto menciona fantasía.");
  }
  if (/\b(ciencia ficcion|sci-?fi|espacio|espacial|alienigenas|naves)\b/i.test(text)) {
    add(decisions, "category", "Ciencia ficción", 0.78, "Texto menciona ciencia ficción.");
  }
  if (/\b(terror|horror|lovecraft|cthulhu|zombies?|vampiros)\b/i.test(text)) {
    add(decisions, "category", "Terror", 0.82, "Texto menciona terror/horror.");
  }
  if (/\b(historicos?|historical|historia)\b/i.test(text)) {
    add(decisions, "category", "Histórico", 0.76, "Texto menciona histórico.");
  }

  // --- MECÁNICAS CANÓNICAS ---
  if (/\b(colocacion de trabajadores|worker placement)\b/i.test(text)) {
    add(decisions, "mechanic", "Colocación de trabajadores", 0.86, "Evidencia de colocación de trabajadores.");
  }
  if (/\b(colocacion de losetas|tile placement)\b/i.test(text)) {
    add(decisions, "mechanic", "Colocación de losetas", 0.86, "Evidencia de colocación de losetas.");
  }
  if (/\b(gestion de recursos|resource management)\b/i.test(text)) {
    add(decisions, "mechanic", "Gestión de recursos", 0.84, "Evidencia de gestión de recursos.");
  }
  if (/\b(gestion de mano|hand management)\b/i.test(text)) {
    add(decisions, "mechanic", "Gestión de mano", 0.84, "Evidencia de gestión de mano.");
  }
  if (/\b(deckbuilding|construccion de mazos?|crear mazos?)\b/i.test(text)) {
    add(decisions, "mechanic", "Deckbuilding", 0.84, "Evidencia de deckbuilding.");
  }
  if (/\b(engine building|motor de combos?|construccion de motor)\b/i.test(text)) {
    add(decisions, "mechanic", "Engine building", 0.76, "Evidencia de engine building.");
  }
  if (/\b(set collection|coleccion de sets?|coleccion de conjuntos?)\b/i.test(text)) {
    add(decisions, "mechanic", "Set collection", 0.82, "Evidencia de set collection.");
  }
  if (/\b(draft de cartas|drafting)\b/i.test(text)) {
    add(decisions, "mechanic", "Draft de cartas", 0.84, "Evidencia de draft de cartas.");
  }
  if (/\b(mayorias|control de mayorias)\b/i.test(text)) {
    add(decisions, "mechanic", "Mayorías", 0.82, "Evidencia de mayorías.");
  }
  if (/\b(area control|control de areas?)\b/i.test(text)) {
    add(decisions, "mechanic", "Area control", 0.82, "Evidencia de control de áreas.");
  }
  if (/\b(rutas y redes|construccion de rutas)\b/i.test(text)) {
    add(decisions, "mechanic", "Rutas y redes", 0.82, "Evidencia de rutas y redes.");
  }
  if (/\b(negociacion|comercio|subastas?)\b/i.test(text)) {
    add(decisions, "mechanic", "Negociación", 0.80, "Evidencia de negociación.");
  }
  if (/\b(push your luck|tienta la suerte|tentar la suerte|forzar la suerte)\b/i.test(text)) {
    add(decisions, "mechanic", "Push your luck", 0.86, "Evidencia de tentar la suerte.");
  }
  if (/\b(deduccion|deduction|resolver misterios?)\b/i.test(text)) {
    add(decisions, "mechanic", "Deducción", 0.82, "Evidencia de deducción.");
  }
  if (/\b(roles ocultos|identidades secretas|sheriff|forajidos?|renegado)\b/i.test(text)) {
    add(decisions, "mechanic", "Roles ocultos", 0.86, "Evidencia de roles ocultos.");
  }
  if (/\b(cooperativos?|colaborativos?|co-?op)\b/i.test(text)) {
    add(decisions, "mechanic", "Cooperativo", 0.76, "Evidencia de cooperación.");
  }
  if (/\b(campana|campaign)\b/i.test(text)) {
    add(decisions, "mechanic", "Campaña", 0.80, "Evidencia de campaña.");
  }
  if (/\b(legacy)\b/i.test(text)) {
    add(decisions, "mechanic", "Legacy", 0.84, "Evidencia de legacy.");
  }
  if (/\b(combate con dados|dados de combate|dice combat)\b/i.test(text)) {
    add(decisions, "mechanic", "Combate con dados", 0.82, "Evidencia de combate con dados.");
  }
  if (/\b(wargames?)\b/i.test(text)) {
    add(decisions, "mechanic", "Wargame", 0.82, "Evidencia de wargame.");
  }
  if (/\b(movimiento en cuadricula|movimiento de cuadricula|grid movement)\b/i.test(text)) {
    add(decisions, "mechanic", "Movimiento en cuadrícula", 0.82, "Evidencia de movimiento en cuadrícula.");
  }
  if (/\b(tablero modular|tableros modulares|modular board)\b/i.test(text)) {
    add(decisions, "mechanic", "Tablero modular", 0.82, "Evidencia de tablero modular.");
  }
  if (/\b(escenarios|misiones|scenarios|missions)\b/i.test(text)) {
    add(decisions, "mechanic", "Escenarios/Misiones", 0.82, "Evidencia de escenarios o misiones.");
  }
  if (/\b(progresion de personaje|desarrollo de personaje|character progression|character development)\b/i.test(text)) {
    add(decisions, "mechanic", "Progresión de personaje", 0.82, "Evidencia de progresión de personaje.");
  }

  if (/\bdados?\b/.test(text) && !/\b(combate|ataque|defensa|dano)\b/.test(text)) {
    warnings.push("Se mencionan dados, pero no hay evidencia suficiente para asignar combate con dados.");
  }
  if (/\bcartas?\b/.test(text) && !/\b(mano|gestion de mano|hand management)\b/.test(text)) {
    warnings.push("Se mencionan cartas, pero no hay evidencia suficiente para asignar gestión de mano.");
  }
  if (/\bcampana\b/.test(text) && !/\blegacy\b/.test(text)) {
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
