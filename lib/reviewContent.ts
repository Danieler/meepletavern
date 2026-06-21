export const REVIEW_TITLE_MAX_LENGTH = 160;
export const REVIEW_SUMMARY_MAX_LENGTH = 600;
export const REVIEW_BODY_MAX_LENGTH = 30_000;

export type ReviewContentBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "image"; alt: string; url: string };

export function parseReviewContent(value: string): ReviewContentBlock[] {
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReviewContentBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index]?.trim() || "";
    if (!line) {
      index += 1;
      continue;
    }

    const image = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(line);
    const safeImageUrl = image ? getSafeReviewImageUrl(image[2]) : null;
    if (image && safeImageUrl) {
      blocks.push({ type: "image", alt: image[1].trim() || "Imagen de la reseña", url: safeImageUrl });
      index += 1;
      continue;
    }

    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length as 2 | 3, text: heading[2].trim() });
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index]?.trim() || "")) {
        items.push((lines[index]?.trim() || "").replace(/^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "unordered-list", items });
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index]?.trim() || "")) {
        items.push((lines[index]?.trim() || "").replace(/^\d+[.)]\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "ordered-list", items });
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index]?.trim() || "")) {
        quote.push((lines[index]?.trim() || "").replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", text: quote.join(" ") });
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (index < lines.length) {
      const nextLine = lines[index]?.trim() || "";
      if (!nextLine || isReviewBlockStart(nextLine)) break;
      paragraph.push(nextLine);
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

export function getSafeReviewLink(value: string) {
  const trimmed = value.trim();
  if (/^(\/|#)/.test(trimmed) && !trimmed.startsWith("//")) return trimmed;
  return getSafeHttpUrl(trimmed);
}

export function getSafeReviewImageUrl(value: string) {
  return getSafeHttpUrl(value.trim());
}

export function validateReviewContent(input: { title: string; summary: string; body: string }) {
  if (input.title.length > REVIEW_TITLE_MAX_LENGTH) {
    throw new Error(`El título no puede superar ${REVIEW_TITLE_MAX_LENGTH} caracteres.`);
  }
  if (input.summary.length > REVIEW_SUMMARY_MAX_LENGTH) {
    throw new Error(`El resumen no puede superar ${REVIEW_SUMMARY_MAX_LENGTH} caracteres.`);
  }
  if (input.body.length > REVIEW_BODY_MAX_LENGTH) {
    throw new Error(`La reseña no puede superar ${REVIEW_BODY_MAX_LENGTH.toLocaleString("es-ES")} caracteres.`);
  }
}

function getSafeHttpUrl(value: string) {
  if (!value || value.length > 2_048) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function isReviewBlockStart(line: string) {
  return /^(?:#{2,3}\s+|!\[[^\]]*\]\([^)\s]+\)$|[-*]\s+|\d+[.)]\s+|>\s?)/.test(line);
}
