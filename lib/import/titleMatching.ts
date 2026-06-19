import { slugify } from "@/lib/slug";

export type TitleMatchAssessment = {
  matched: boolean;
  score: number;
  warn: string | null;
  reason: string;
};

const SAFE_BASE_VARIANT_TOKENS = new Set([
  "base",
  "castellana",
  "castellano",
  "classic",
  "clasica",
  "clasico",
  "cartas",
  "de",
  "edicion",
  "edition",
  "el",
  "en",
  "espanol",
  "espanola",
  "estandar",
  "game",
  "juego",
  "la",
  "las",
  "los",
  "mesa",
  "nueva",
  "original",
  "revised",
  "revisada",
  "refresh",
  "standard"
]);

const TITLE_NOISE_TOKENS = new Set([
  "a",
  "adultos",
  "ages",
  "al",
  "alderac",
  "ano",
  "anos",
  "asmodee",
  "board",
  "devir",
  "edad",
  "entertainment",
  "english",
  "feuerland",
  "flight",
  "for",
  "from",
  "games",
  "hasbro",
  "jugador",
  "jugadores",
  "maldito",
  "min",
  "mins",
  "minute",
  "minutes",
  "minuto",
  "minutos",
  "para",
  "partir",
  "player",
  "players",
  "spiele",
  "tiempo",
  "tranjis",
  "trg",
  "vir",
  "spanish",
  "years"
]);

const STRONG_REJECTION_TOKENS = new Set([
  "abundancia",
  "accesorio",
  "accesorios",
  "booster",
  "bundle",
  "campaign",
  "campana",
  "expansion",
  "expansiones",
  "expansion",
  "extra",
  "funda",
  "fundas",
  "insert",
  "inserto",
  "marinos",
  "mundos",
  "organizador",
  "organizer",
  "pack",
  "playmat",
  "promo",
  "rebellion",
  "evolution",
  "refill",
  "replacement",
  "repuesto",
  "repuestos",
  "sleeve",
  "sleeves",
  "spare",
  "storage",
  "upgrade"
]);

const SUSPICIOUS_VARIANT_TOKENS = new Set([
  "compact",
  "compacto",
  "deluxe",
  "harry",
  "junior",
  "kids",
  "mini",
  "potter",
  "travel",
  "viaje",
  "viajes",
  "xxl"
]);

const NUMBER_CONTEXT_TOKENS = new Set([
  "age",
  "ages",
  "ano",
  "anos",
  "edad",
  "jugador",
  "jugadores",
  "min",
  "mins",
  "minute",
  "minutes",
  "minuto",
  "minutos",
  "player",
  "players",
  "year",
  "years"
]);

export function normalizeTitleForMatching(title: string) {
  const normalized = title
    .replace(/[’‘`´]/g, "'")
    .replace(/['"]/g, "")
    .replace(/([a-záàäâãåéèëêíìïîóòöôõúùüûñç])(\d)/gi, "$1 $2")
    .replace(/(\d)([a-záàäâãåéèëêíìïîóòöôõúùüûñç])/gi, "$1 $2");

  return applyControlledEquivalences(slugify(normalized));
}

export function canonicalGameTitleKey(title: string) {
  const tokens = normalizeTitleForMatching(title).split("-").filter(Boolean);
  const filtered = tokens.filter((token, index) => {
    if (looksLikeCatalogToken(token)) {
      return false;
    }

    if (TITLE_NOISE_TOKENS.has(token)) {
      return false;
    }

    if (/^\d+$/.test(token) && hasNumberMetadataContext(tokens, index)) {
      return false;
    }

    return true;
  });

  return filtered.join("-");
}

export function assessBaseGameTitleMatch(referenceTitle: string, candidateTitle: string): TitleMatchAssessment {
  const referenceKey = canonicalGameTitleKey(referenceTitle);
  const candidateKey = canonicalGameTitleKey(candidateTitle);
  const score = titleSimilarity(candidateKey, referenceKey);

  if (!referenceKey || !candidateKey) {
    return decision(false, score, "missing_title", "No hay título suficiente para comparar.");
  }

  if (referenceKey === candidateKey) {
    return decision(true, Math.max(score, 0.99), "exact", "");
  }

  if (looksLikeNumberedSequel(referenceKey, candidateKey)) {
    return decision(false, score, "numbered_sequel", "Parece una secuela numerada y no se mezcló con el juego base.");
  }

  if (isExpansionOrAccessory(candidateTitle)) {
    return decision(false, score, "expansion_or_accessory", "Parece una expansión, promo, repuesto o accesorio y no se mezcló con el juego base.");
  }

  if (isSuspiciousEditionVariant(candidateTitle) && !sharesRequestedLicensedEdition(referenceKey, candidateKey)) {
    return decision(false, score, "suspicious_variant", "Parece una edición alternativa o licencia distinta y no se mezcló con el juego base.");
  }

  if (isControlledMiddleVariant(referenceKey, candidateKey)) {
    return decision(true, Math.max(score, 0.92), "controlled_equivalence", "");
  }

  const referenceTokens = referenceKey.split("-").filter(Boolean);
  const candidateTokens = candidateKey.split("-").filter(Boolean);

  if (referenceTokens.length === 1) {
    return assessOneWordTitle(referenceTokens[0], candidateTokens, score);
  }

  const referenceInCandidate = findTokenSequence(candidateTokens, referenceTokens);
  if (referenceInCandidate >= 0) {
    const extras = [
      ...candidateTokens.slice(0, referenceInCandidate),
      ...candidateTokens.slice(referenceInCandidate + referenceTokens.length)
    ];

    if (!extras.length || extrasAreSafeBaseVariant(extras)) {
      return decision(true, Math.max(score, 0.9), "safe_base_variant", "");
    }

    return decision(false, score, "unsafe_extra_tokens", "El título añade términos extra que no parecen una variante segura del juego base.");
  }

  const candidateInReference = findTokenSequence(referenceTokens, candidateTokens);
  if (candidateInReference >= 0) {
    const extras = [
      ...referenceTokens.slice(0, candidateInReference),
      ...referenceTokens.slice(candidateInReference + candidateTokens.length)
    ];

    if (extrasAreSafeBaseVariant(extras)) {
      return decision(true, Math.max(score, 0.88), "short_candidate_safe", "");
    }
  }

  return decision(false, score, score >= 0.55 ? "low_confidence" : "different_title", score >= 0.55 ? "La coincidencia no fue lo bastante fiable para guardarla como oferta automática." : null);
}

export function isSafeBaseEditionVariant(title: string) {
  const tokens = canonicalGameTitleKey(title).split("-").filter(Boolean);
  return tokens.length > 0 && tokens.every(isSafeBaseEditionOrNoiseToken);
}

export function isExpansionOrAccessory(title: string) {
  return canonicalGameTitleKey(title)
    .split("-")
    .some((token) => STRONG_REJECTION_TOKENS.has(token));
}

export function isSuspiciousEditionVariant(title: string) {
  return canonicalGameTitleKey(title)
    .split("-")
    .some((token) => SUSPICIOUS_VARIANT_TOKENS.has(token));
}

export function scoreTitleMatch(resultTitle: string, queryTitle: string) {
  const resultKey = canonicalGameTitleKey(resultTitle);
  const queryKey = canonicalGameTitleKey(queryTitle);

  if (!resultKey || !queryKey) {
    return 0;
  }

  if (resultKey === queryKey) {
    return 1;
  }

  const assessment = assessBaseGameTitleMatch(queryKey, resultKey);
  if (assessment.matched) {
    return Math.max(assessment.score, 0.9);
  }

  if (resultKey.startsWith(queryKey) || queryKey.startsWith(resultKey)) {
    return 0.82;
  }

  if (resultKey.includes(queryKey) || queryKey.includes(resultKey)) {
    return 0.72;
  }

  return titleSimilarity(resultKey, queryKey);
}

export function titleSimilarity(left: string, right: string) {
  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  if (left.includes(right) || right.includes(left)) {
    return 0.8;
  }

  const leftTokens = new Set(left.split("-").filter(Boolean));
  const rightTokens = new Set(right.split("-").filter(Boolean));
  const shared = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const total = new Set([...leftTokens, ...rightTokens]).size;

  return total ? shared / total : 0;
}

function applyControlledEquivalences(value: string) {
  return value
    .replace(/\blotr\b/g, "senor-de-los-anillos")
    .replace(/\blord-of-the-rings\b/g, "senor-de-los-anillos")
    .replace(/\bthe-dice-game\b/g, "el-juego-de-dados")
    .replace(/\baeons\b/g, "aeons")
    .replace(/\bcant\b/g, "cant");
}

function assessOneWordTitle(referenceToken: string, candidateTokens: string[], score: number): TitleMatchAssessment {
  if (candidateTokens[0] !== referenceToken) {
    return decision(false, score, "one_word_not_prefix", "Los títulos de una palabra solo aceptan coincidencia exacta o sufijos seguros.");
  }

  const suffix = candidateTokens.slice(1);
  if (!suffix.length || extrasAreSafeBaseVariant(suffix)) {
    return decision(true, Math.max(score, 0.9), "one_word_safe_suffix", "");
  }

  return decision(false, score, "one_word_unsafe_suffix", "El título añade términos extra que no parecen una variante segura del juego base.");
}

function isControlledMiddleVariant(referenceKey: string, candidateKey: string) {
  const referenceTokens = referenceKey.split("-").filter(Boolean);
  const candidateTokens = candidateKey.split("-").filter(Boolean);

  if (
    referenceTokens.join("-") === "dobble-el-senor-de-los-anillos" &&
    candidateTokens[0] === "dobble" &&
    findTokenSequence(candidateTokens, ["senor", "de", "los", "anillos"]) >= 0 &&
    !candidateTokens.some((token) => SUSPICIOUS_VARIANT_TOKENS.has(token))
  ) {
    return true;
  }

  return false;
}

function sharesRequestedLicensedEdition(referenceKey: string, candidateKey: string) {
  const referenceTokens = new Set(referenceKey.split("-").filter(Boolean));
  return candidateKey
    .split("-")
    .filter((token) => SUSPICIOUS_VARIANT_TOKENS.has(token))
    .every((token) => referenceTokens.has(token));
}

function isSafeBaseEditionOrNoiseToken(token: string) {
  return SAFE_BASE_VARIANT_TOKENS.has(token) || TITLE_NOISE_TOKENS.has(token) || looksLikeCatalogToken(token);
}

function extrasAreSafeBaseVariant(tokens: string[]) {
  return tokens.every((token, index) => {
    if (isSafeBaseEditionOrNoiseToken(token)) {
      return true;
    }

    return /^\d+$/.test(token) && ["edicion", "edition"].some((marker) => tokens[index - 1] === marker || tokens[index + 1] === marker);
  });
}

function findTokenSequence(tokens: string[], sequence: string[]) {
  if (!tokens.length || !sequence.length || sequence.length > tokens.length) {
    return -1;
  }

  for (let index = 0; index <= tokens.length - sequence.length; index += 1) {
    if (tokens.slice(index, index + sequence.length).join("-") === sequence.join("-")) {
      return index;
    }
  }

  return -1;
}

function looksLikeNumberedSequel(referenceKey: string, candidateKey: string) {
  if (!referenceKey || referenceKey === candidateKey) {
    return false;
  }

  if (new RegExp(`(?:^|-)${escapeRegExp(referenceKey)}-(?:2|3|4|ii|iii|iv)-(?:edicion|edition)(?:-|$)`, "i").test(candidateKey)) {
    return false;
  }

  return new RegExp(`(?:^|-)${escapeRegExp(referenceKey)}-(?:2|3|4|ii|iii|iv)(?:-|$)`, "i").test(candidateKey);
}

function hasNumberMetadataContext(tokens: string[], index: number) {
  const before = tokens.slice(Math.max(0, index - 2), index);
  const after = tokens.slice(index + 1, index + 3);
  return [...before, ...after].some((token) => NUMBER_CONTEXT_TOKENS.has(token));
}

function looksLikeCatalogToken(token: string) {
  return (
    /^(?:sku|ref|isbn|ean|asin|b0)[a-z0-9-]*$/i.test(token) ||
    (/^(?:trg|ffg|asm|dev|mal)[a-z0-9-]+$/i.test(token) && /\d/.test(token)) ||
    (/\d/.test(token) && /[a-z]/i.test(token) && token.length >= 5) ||
    /^0\d+$/.test(token) ||
    (/^\d+$/.test(token) && Number.parseInt(token, 10) > 30) ||
    /^\d{5,}$/.test(token)
  );
}

function decision(matched: boolean, score: number, reason: string, warn: string | null): TitleMatchAssessment {
  return {
    matched,
    score: Math.max(0, Math.min(1, score)),
    warn: warn || null,
    reason
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
