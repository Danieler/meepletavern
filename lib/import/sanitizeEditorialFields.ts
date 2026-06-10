import { sanitizeImportedList } from "@/lib/importedTextSanitizer";
import { keepSpanishEditorialText } from "@/lib/editorialLanguage";
import type { EditorialCompletion } from "@/lib/ai/editorialCompletionSchema";

const EDITORIAL_GARBAGE_PATTERN =
  /(seguridad de pagos|encripta tu informaci[oó]n|durante la transacci[oó]n|pol[ií]tica de devoluciones|devoluci[oó]n(?:es)?|env[ií]o gratis|entrega|garant[ií]a|\bamazon\b|\basin\b|a[nñ]adir al carrito|comprar ahora|frecuentemente comprados juntos|patrocinado|iva incluido|cup[oó]n|oferta|otros vendedores|clasificaci[oó]n en los m[aá]s vendidos)/i;

export function sanitizeEditorialFields(input: EditorialCompletion): EditorialCompletion {
  return {
    ...input,
    shortDescription: sanitizeText(input.shortDescription),
    longDescription: sanitizeText(input.longDescription),
    categories: sanitizeTagList(input.categories, "categories"),
    mechanics: sanitizeTagList(input.mechanics, "mechanics"),
    themes: sanitizeTagList(input.themes, "themes"),
    bestFor: sanitizeText(input.bestFor),
    notFor: sanitizeText(input.notFor),
    pros: sanitizeTextList(input.pros, 220),
    cons: sanitizeTextList(input.cons, 220),
    faq: input.faq
      .map((item) => ({
        question: sanitizeText(item.question),
        answer: sanitizeText(item.answer)
      }))
      .filter((item) => item.question && item.answer),
    seoTitle: sanitizeText(input.seoTitle),
    seoDescription: sanitizeText(input.seoDescription),
    warnings: sanitizeTextList(input.warnings, 220)
  };
}

export function containsEditorialGarbage(value: string | null | undefined) {
  return Boolean(value && EDITORIAL_GARBAGE_PATTERN.test(normalizeSpaces(value)));
}

function sanitizeTagList(values: string[], type: "categories" | "mechanics" | "themes") {
  return sanitizeImportedList(
    values
      .map((value) => sanitizeText(value))
      .filter(Boolean),
    type
  );
}

function sanitizeTextList(values: string[], maxLength: number) {
  const unique = new Set<string>();

  for (const value of values) {
    const cleaned = sanitizeText(value, maxLength);
    if (cleaned) {
      unique.add(cleaned);
    }
  }

  return [...unique];
}

function sanitizeText(value: string, maxLength = 1200) {
  const cleaned = keepSpanishEditorialText(normalizeSpaces(value));

  if (!cleaned || cleaned.length > maxLength || containsEditorialGarbage(cleaned)) {
    return "";
  }

  return cleaned;
}

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
