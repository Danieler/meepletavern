export type EditorialSeedCopyInput = {
  title: string;
  originalTitle?: string | null;
  publisher?: string | null;
  playersLabel?: string | null;
  playtime?: string | null;
  minAge?: number | null;
  categories?: string[];
  mechanics?: string[];
  themes?: string[];
  features?: string[];
  descriptionHint?: string | null;
};

export type EditorialSeedCopyResult = {
  shortDescription: string;
  description: string;
  quickVerdict: string;
};

const GENERIC_THEME_TERMS = new Set([
  "cooperativo",
  "familiar",
  "fiesta",
  "interacción",
  "estrategia",
  "cartas",
  "dados",
  "aventura"
]);

export function buildEditorialSeedCopy(input: EditorialSeedCopyInput): EditorialSeedCopyResult {
  const title = normalizeText(input.title) || "Este juego";
  const descriptor = buildDescriptor(input);
  const themeClause = buildThemeClause(input);
  const factsClause = buildFactsClause(input);
  const toneSentence = buildToneSentence(input);
  const taxonomySentence = buildTaxonomySentence(input);
  const hintSentence = buildHintSentence(input);

  const shortDescription = compactToSentence(
    `${title} es ${descriptor}${themeClause}${factsClause}.`,
    300
  );

  const description = compactParagraphs(
    [
      `${title} propone ${toneSentence}${themeClause}${factsClause}.`,
      taxonomySentence,
      hintSentence
    ].filter(Boolean),
    1200
  );

  const quickVerdict = compactToSentence(
    `${title} apunta a una experiencia ${buildQuickVerdictTone(input)} que puede interesar a mesas ${buildAudienceHint(input)}.`,
    260
  );

  return {
    shortDescription,
    description,
    quickVerdict
  };
}

function buildDescriptor(input: EditorialSeedCopyInput) {
  const tags = normalizeTags(input);

  if (hasAny(tags, ["cooperativo", "coop"]) && hasAny(tags, ["cartas", "lcg", "deck"])) {
    return "un juego cooperativo de cartas";
  }

  if (hasAny(tags, ["roles ocultos", "deducción", "faroleo"])) {
    return "un juego de roles ocultos";
  }

  if (hasAny(tags, ["miniaturas"])) {
    return "un juego de miniaturas";
  }

  if (hasAny(tags, ["cartas"])) {
    return hasAny(tags, ["familiar"]) ? "un juego familiar de cartas" : "un juego de cartas";
  }

  if (hasAny(tags, ["cooperativo", "coop"])) {
    return "un juego cooperativo";
  }

  if (hasAny(tags, ["party", "fiesta"])) {
    return "un party game";
  }

  if (hasAny(tags, ["estrategia", "eurogame"])) {
    return "un juego de estrategia";
  }

  if (hasAny(tags, ["familiar"])) {
    return "un juego familiar";
  }

  if (hasAny(tags, ["aventura", "campaña", "narrativo"])) {
    return "un juego de aventura";
  }

  return "un juego de mesa";
}

function buildThemeClause(input: EditorialSeedCopyInput) {
  const titleText = normalizeText([input.title, input.originalTitle].filter(Boolean).join(" "));

  if (/señor de los anillos|lord of the rings/i.test(titleText)) {
    return " ambientado en el universo de El Señor de los Anillos";
  }

  if (/star wars/i.test(titleText)) {
    return " ambientado en el universo de Star Wars";
  }

  if (/marvel/i.test(titleText)) {
    return " ambientado en el universo Marvel";
  }

  if (/harry potter/i.test(titleText)) {
    return " ambientado en el universo de Harry Potter";
  }

  const theme = (input.themes || [])
    .map(normalizeText)
    .find((item) => item && !GENERIC_THEME_TERMS.has(item.toLowerCase()));

  if (!theme) {
    return "";
  }

  return ` con temática de ${theme.toLowerCase()}`;
}

function buildFactsClause(input: EditorialSeedCopyInput) {
  const parts = [
    input.playersLabel ? `para ${input.playersLabel} jugadores` : null,
    input.playtime ? `con partidas de ${input.playtime}` : null,
    input.minAge ? `y recomendado a partir de ${input.minAge} años` : null
  ].filter(Boolean);

  if (!parts.length) {
    return "";
  }

  if (parts.length === 1) {
    return ` ${parts[0]}`;
  }

  return ` ${parts.slice(0, -1).join(", ")} ${parts.length > 2 ? "" : ""}${parts[parts.length - 1]?.startsWith("y ") ? "" : "y "}${parts[parts.length - 1]?.replace(/^y\s+/, "")}`;
}

function buildToneSentence(input: EditorialSeedCopyInput) {
  const tags = normalizeTags(input);

  if (hasAny(tags, ["cooperativo", "coop"])) {
    return "una experiencia cooperativa pensada para coordinar decisiones de grupo";
  }

  if (hasAny(tags, ["estrategia", "eurogame"])) {
    return "una propuesta de estrategia con decisiones constantes y margen para planificar";
  }

  if (hasAny(tags, ["party", "fiesta", "roles ocultos"])) {
    return "una propuesta social y dinámica que vive mucho del grupo y de la interacción";
  }

  if (hasAny(tags, ["familiar"])) {
    return "una propuesta accesible y fácil de sacar a mesa";
  }

  if (hasAny(tags, ["aventura", "narrativo", "campaña"])) {
    return "una experiencia de aventura con peso temático y sensación de progresión";
  }

  return "una propuesta de mesa con foco en la experiencia de juego y el contexto temático";
}

function buildTaxonomySentence(input: EditorialSeedCopyInput) {
  const tags = uniqueClean([
    ...(input.categories || []),
    ...(input.mechanics || []),
    ...(input.themes || [])
  ]).slice(0, 5);

  if (!tags.length) {
    return "";
  }

  return `Por los datos disponibles, encaja cerca de etiquetas como ${formatList(tags.map((tag) => tag.toLowerCase()))}.`;
}

function buildHintSentence(input: EditorialSeedCopyInput) {
  const hint = normalizeText(input.descriptionHint);
  if (hint) {
    return compactToSentence(hint, 280);
  }

  const features = uniqueClean(input.features || []).slice(0, 2);
  if (!features.length) {
    return "";
  }

  return `También destacan elementos como ${formatList(features.map((feature) => simplifyFeature(feature)))}.`;
}

function buildQuickVerdictTone(input: EditorialSeedCopyInput) {
  const tags = normalizeTags(input);

  if (hasAny(tags, ["cooperativo", "coop"])) {
    return "cooperativa y temática";
  }

  if (hasAny(tags, ["estrategia", "eurogame"])) {
    return "estratégica y con decisiones";
  }

  if (hasAny(tags, ["party", "fiesta"])) {
    return "social y muy de grupo";
  }

  if (hasAny(tags, ["familiar"])) {
    return "accesible y fácil de recomendar";
  }

  return "con personalidad propia";
}

function buildAudienceHint(input: EditorialSeedCopyInput) {
  const tags = normalizeTags(input);

  if (hasAny(tags, ["cooperativo", "coop"])) {
    return "que disfrutan colaborando";
  }

  if (hasAny(tags, ["estrategia", "eurogame"])) {
    return "que quieren pensar cada turno";
  }

  if (hasAny(tags, ["party", "fiesta", "roles ocultos"])) {
    return "que priorizan conversación e interacción";
  }

  if (hasAny(tags, ["familiar"])) {
    return "que buscan una entrada amable";
  }

  return "que quieren entender rápido qué ofrece";
}

function normalizeTags(input: EditorialSeedCopyInput) {
  return normalizeText(
    [
      input.title,
      input.originalTitle,
      input.publisher,
      ...(input.categories || []),
      ...(input.mechanics || []),
      ...(input.themes || []),
      ...(input.features || [])
    ]
      .filter(Boolean)
      .join(" ")
  ).toLowerCase();
}

function hasAny(text: string, candidates: string[]) {
  return candidates.some((candidate) => text.includes(candidate));
}

function uniqueClean(values: string[]) {
  const seen = new Map<string, string>();

  for (const value of values) {
    const cleaned = normalizeText(value);
    if (cleaned) {
      seen.set(cleaned.toLowerCase(), cleaned);
    }
  }

  return [...seen.values()];
}

function compactParagraphs(parts: string[], maxLength: number) {
  return truncate(parts.map((part) => normalizeText(part)).filter(Boolean).join("\n\n"), maxLength);
}

function compactToSentence(value: string, maxLength: number) {
  return truncate(normalizeText(value), maxLength);
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function formatList(items: string[]) {
  if (!items.length) {
    return "";
  }

  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return `${items[0]} y ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

function simplifyFeature(value: string) {
  return normalizeText(
    value
      .replace(/\b(juego de mesa|board game|amazon\.es|juguetes y juegos)\b/gi, "")
      .replace(/\s{2,}/g, " ")
  ).toLowerCase();
}
