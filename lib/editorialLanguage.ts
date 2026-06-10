const ENGLISH_STOPWORDS = [
  " the ",
  " and ",
  " with ",
  " for ",
  " from ",
  " into ",
  " through ",
  " over ",
  " your ",
  " you ",
  " they ",
  " their ",
  " every ",
  " move ",
  " decision ",
  " is ",
  " it ",
  " who ",
  " want ",
  " players ",
  " beginner ",
  " survive ",
  " enjoy ",
  " gameplay ",
  " designed ",
  " rewarding ",
  " despite ",
  " perilous ",
  " outcomes ",
  " as ",
  " ship ",
  " survival ",
  " horror ",
  " react ",
  " grow stronger "
];

const ENGLISH_SUSPICIOUS_WORDS = new Set([
  "immerse",
  "yourself",
  "heart",
  "pounding",
  "navigate",
  "through",
  "infested",
  "corridors",
  "ship",
  "overrun",
  "hostile",
  "alien",
  "organisms",
  "experience",
  "evolving",
  "threats",
  "intruders",
  "react",
  "actions",
  "grow",
  "stronger",
  "time",
  "challenging",
  "every",
  "move",
  "decision",
  "players",
  "want",
  "chill",
  "beginner",
  "friendly",
  "enjoy",
  "gameplay",
  "designed",
  "deliver",
  "climactic",
  "moments",
  "carefully",
  "laid",
  "plans",
  "undone",
  "thrilling",
  "rewarding",
  "despite",
  "perilous",
  "outcomes"
]);

export function looksEnglishHeavy(value: string | null | undefined) {
  const lower = normalizeText(value).toLowerCase();

  if (!lower) {
    return false;
  }

  const stopwordHits = ENGLISH_STOPWORDS.filter((token) => lower.includes(token.trim()) || lower.includes(token)).length;
  if (stopwordHits >= 3) {
    return true;
  }

  const words = lower.match(/[a-záéíóúñü]+/g) || [];
  const suspiciousWords = words.filter((word) => ENGLISH_SUSPICIOUS_WORDS.has(word)).length;

  return suspiciousWords >= 3;
}

export function keepSpanishEditorialText(value: string | null | undefined) {
  const cleaned = normalizeText(value);

  if (!cleaned || looksEnglishHeavy(cleaned)) {
    return "";
  }

  return cleaned;
}

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}
