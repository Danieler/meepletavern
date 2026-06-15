export function parseMasterImportTitles(input: string) {
  const raw = input.trim();

  if (!raw) {
    return [];
  }

  const fromJson = parseJsonArray(raw);
  const values = fromJson ?? raw.split(/\r?\n/);

  return [...new Set(values.map(cleanTitleToken).filter(Boolean))];
}

function parseJsonArray(raw: string): string[] | null {
  if (!raw.startsWith("[")) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed.map((value) => (typeof value === "string" ? value : String(value)));
  } catch {
    return null;
  }
}

function cleanTitleToken(value: string) {
  return value
    .trim()
    .replace(/^[\-\*\u2022]\s*/, "")
    .replace(/^\d+[\.\)]\s*/, "")
    .replace(/,$/, "")
    .replace(/^["']/, "")
    .replace(/["']$/, "")
    .trim();
}
