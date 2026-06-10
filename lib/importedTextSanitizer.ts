import { slugify } from "@/lib/slug";

export type ImportedListFieldType = "themes" | "categories" | "mechanics" | "tags";

const AMAZON_GARBAGE_PATTERN =
  /(seguridad de pagos|encripta tu informaci[oó]n|durante la transacci[oó]n|pol[ií]tica de devoluciones|devoluciones gratis|env[ií]o gratis|\bamazon\b|compra verificada|n[uú]mero de modelo|clasificaci[oó]n en los m[aá]s vendidos|producto en amazon|a[nñ]adir al carrito|comprar ahora|patrocinado|otros vendedores|frecuentemente comprados juntos|\bprecio\b|iva incluido|cup[oó]n|oferta|entrega|disponibilidad|garant[ií]a|transacci[oó]n|checkout|vendedor|tarjeta|cliente|pago)/i;

const TRUNCATED_GARBAGE_PATTERN = /\b(tra|transa|informaci[oó]|devolu|garant|disponi)$/i;

export function sanitizeAmazonImportedText(text: string): string | null {
  const cleaned = normalizeText(text);

  if (!cleaned || AMAZON_GARBAGE_PATTERN.test(cleaned)) {
    return null;
  }

  if (cleaned.length > 280 || TRUNCATED_GARBAGE_PATTERN.test(cleaned)) {
    return null;
  }

  return cleaned;
}

export function sanitizeImportedTitle(title: string) {
  let cleaned = normalizeText(title);

  if (!cleaned) {
    return "";
  }

  while (true) {
    const bracketMatch = /(?:\s*[\[(]\s*([^\[\]()]{1,24})\s*[\])]\s*)$/.exec(cleaned);
    if (!bracketMatch) {
      break;
    }

    if (!looksLikeImportedCode(bracketMatch[1])) {
      break;
    }

    cleaned = cleaned.slice(0, bracketMatch.index).trimEnd();
  }

  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
}

export function sanitizeImportedList(values: string[], fieldType: ImportedListFieldType): string[] {
  const maxWords = fieldType === "tags" ? 5 : 4;
  const seen = new Map<string, string>();

  for (const value of values) {
    const cleaned = sanitizeAmazonImportedText(value);
    if (!cleaned || cleaned.length > 42 || countWords(cleaned) > maxWords || looksLikeSentence(cleaned)) {
      continue;
    }

    const normalized = normalizeTag(cleaned);
    if (!normalized || TRUNCATED_GARBAGE_PATTERN.test(normalized)) {
      continue;
    }

    seen.set(slugify(normalized), normalized);
  }

  return [...seen.values()];
}

export function sanitizeImportedFacts(facts: Record<string, string>) {
  const cleanFacts: Record<string, string> = {};
  let discardedCount = 0;

  for (const [key, value] of Object.entries(facts)) {
    const cleaned = sanitizeAmazonImportedText(value);
    if (cleaned) {
      cleanFacts[key] = cleaned;
    } else {
      discardedCount += 1;
    }
  }

  return { facts: cleanFacts, discardedCount };
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function looksLikeImportedCode(value: string) {
  const normalized = value.replace(/\s+/g, "").trim();
  return Boolean(
    normalized &&
      normalized.length <= 24 &&
      /\d/.test(normalized) &&
      !/\s/.test(value) &&
      /^[A-Za-z0-9.-]+$/.test(normalized)
  );
}

function countWords(value: string) {
  return value.split(/\s+/).filter(Boolean).length;
}

function looksLikeSentence(value: string) {
  return /[.!?¿¡]/.test(value) || /\b(de|durante|para|con|por|tu|se|el|la|los|las)\b.+\b(de|durante|para|con|por|tu|se|el|la|los|las)\b/i.test(value);
}

function normalizeTag(value: string) {
  const lower = value.toLocaleLowerCase("es");
  return lower ? `${lower[0].toLocaleUpperCase("es")}${lower.slice(1)}`.trim() : "";
}
