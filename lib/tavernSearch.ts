export const TAVERN_SEARCH_MIN_LENGTH = 2;
export const TAVERN_SEARCH_MAX_LENGTH = 60;

export function normalizeTavernSearch(value?: string | null) {
  const normalized = value?.trim().replace(/\s+/g, " ") || "";
  if (normalized.length < TAVERN_SEARCH_MIN_LENGTH) return "";
  return normalized.slice(0, TAVERN_SEARCH_MAX_LENGTH);
}

export function isValidTavernSearch(value?: string | null) {
  if (!value?.trim()) return true;
  const length = value.trim().replace(/\s+/g, " ").length;
  return length >= TAVERN_SEARCH_MIN_LENGTH && length <= TAVERN_SEARCH_MAX_LENGTH;
}
