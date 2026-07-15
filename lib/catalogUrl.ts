import type { GameFilterInput } from "@/lib/catalog";

type CatalogParamValue = string | number | Array<string | number> | null | undefined;
type CatalogUrlUpdates = Partial<Record<keyof GameFilterInput, CatalogParamValue>>;

const IGNORED_CATALOG_URL_KEYS = new Set(["page", "welcome"]);

export function buildCatalogUrl(active: GameFilterInput = {}, updates: CatalogUrlUpdates = {}, basePath = "/juegos") {
  const params = buildCatalogSearchParams(active, Object.keys(updates));

  for (const [key, value] of Object.entries(updates)) {
    params.delete(key);
    appendCatalogValue(params, key, value);
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function buildCatalogSearchParams(active: GameFilterInput = {}, omitKeys: string[] = []) {
  const params = new URLSearchParams();
  const omitted = new Set([...IGNORED_CATALOG_URL_KEYS, ...omitKeys]);

  for (const [key, value] of Object.entries(active).sort(([left], [right]) => left.localeCompare(right))) {
    if (omitted.has(key)) continue;
    appendCatalogValue(params, key, value);
  }

  return params;
}

export function catalogFilterValues(value: GameFilterInput[keyof GameFilterInput]) {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === "string" && value) {
    return [value];
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return [String(value)];
  }

  return [];
}

function appendCatalogValue(params: URLSearchParams, key: string, value: CatalogParamValue) {
  if (value === null || value === undefined || value === "") return;

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (entry !== null && entry !== undefined && String(entry)) {
        params.append(key, String(entry));
      }
    }
    return;
  }

  params.set(key, String(value));
}
