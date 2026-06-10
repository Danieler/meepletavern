const BGG_ROOT = "https://boardgamegeek.com/xmlapi2";
const BGG_TOKEN = process.env.BGG_ACCESS_TOKEN?.trim() || "";
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const DETAILS_CACHE_TTL_MS = 30 * 60 * 1000;

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export type BggSearchResult = {
  bggId: number;
  name: string;
  yearPublished: number | null;
};

export type BggGameDetails = {
  bggId: number;
  bggUrl: string;
  name: string;
  description: string | null;
  yearPublished: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playingTime: number | null;
  minAge: number | null;
  averageRating: number | null;
  bayesAverageRating: number | null;
  usersRated: number | null;
  rank: number | null;
  weight: number | null;
  weightVotes: number | null;
  designers: string[];
  artists: string[];
  publishers: string[];
  categories: string[];
  mechanics: string[];
  families: string[];
};

export class BggApiError extends Error {
  constructor(
    readonly code:
      | "missing_token"
      | "unauthorized"
      | "rate_limited"
      | "temporarily_unavailable"
      | "invalid_xml"
      | "network_error"
      | "not_found",
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "BggApiError";
  }
}

const searchCache = new Map<string, CacheEntry<BggSearchResult[]>>();
const detailsCache = new Map<number, CacheEntry<BggGameDetails>>();

export async function searchBggGames(query: string): Promise<BggSearchResult[]> {
  const normalized = query.trim();

  if (!normalized) {
    return [];
  }

  const cached = readCache(searchCache, normalized);
  if (cached) {
    return cached;
  }

  const xml = await requestBggXml(`/search?query=${encodeURIComponent(normalized)}&type=boardgame`);
  const results = parseSearchResults(xml);
  writeCache(searchCache, normalized, results, SEARCH_CACHE_TTL_MS);

  return results;
}

export async function getBggGameDetails(bggId: number): Promise<BggGameDetails> {
  if (!Number.isFinite(bggId) || bggId <= 0) {
    throw new BggApiError("not_found", "El identificador de BGG no es válido.", 400);
  }

  const cached = readCache(detailsCache, bggId);
  if (cached) {
    return cached;
  }

  const xml = await requestBggXml(`/thing?id=${bggId}&type=boardgame&stats=1`);
  const details = parseGameDetails(xml, bggId);
  writeCache(detailsCache, bggId, details, DETAILS_CACHE_TTL_MS);

  return details;
}

async function requestBggXml(path: string) {
  if (!BGG_TOKEN) {
    throw new BggApiError(
      "missing_token",
      "BGG_ACCESS_TOKEN no está configurado. Añade el token para consultar BoardGameGeek.",
      503
    );
  }

  const url = `${BGG_ROOT}${path}`;
  const headers = {
    Accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
    Authorization: `Bearer ${BGG_TOKEN}`
  };

  for (let attempt = 0; attempt < 4; attempt += 1) {
    let response: Response;

    try {
      response = await fetch(url, { headers, cache: "no-store" });
    } catch (error) {
      throw new BggApiError(
        "network_error",
        error instanceof Error ? `No se pudo conectar con BGG: ${error.message}` : "No se pudo conectar con BGG.",
        503
      );
    }

    if (response.status === 202) {
      if (attempt === 3) {
        throw new BggApiError("temporarily_unavailable", "BGG sigue procesando la solicitud. Inténtalo en unos segundos.", 503);
      }

      await sleep(800 * (attempt + 1));
      continue;
    }

    if (response.status === 401 || response.status === 403) {
      throw new BggApiError("unauthorized", "BGG rechazó la autenticación. Revisa el token de acceso.", response.status);
    }

    if (response.status === 429) {
      throw new BggApiError("rate_limited", "BGG ha limitado la petición. Espera un poco y vuelve a intentarlo.", 429);
    }

    if (response.status === 404) {
      throw new BggApiError("not_found", "BGG no devolvió resultados para ese juego.", 404);
    }

    if (!response.ok) {
      const retryable = response.status === 500 || response.status === 503;
      if (retryable && attempt < 3) {
        await sleep(800 * (attempt + 1));
        continue;
      }

      throw new BggApiError(
        "temporarily_unavailable",
        `BGG devolvió un error ${response.status}. Inténtalo de nuevo más tarde.`,
        response.status
      );
    }

    const text = await response.text();
    if (!looksLikeXml(text)) {
      throw new BggApiError("invalid_xml", "BGG devolvió una respuesta no válida.", 502);
    }

    return text;
  }

  throw new BggApiError("temporarily_unavailable", "BGG no respondió a tiempo.", 503);
}

function parseSearchResults(xml: string) {
  const items = collectElements(xml, "item");

  return items
    .filter((item) => (item.attrs.type || "").toLowerCase() === "boardgame")
    .map((item) => {
      const primaryName = collectElements(item.content, "name").find((name) => (name.attrs.type || "").toLowerCase() === "primary");
      const fallbackName = collectElements(item.content, "name")[0];
      const year = readNumberFromAttr(item.content, "yearpublished");
      const bggId = readPositiveInteger(item.attrs.id);
      const name = cleanText(primaryName?.attrs.value || fallbackName?.attrs.value || "");

      if (!bggId || !name) {
        return null;
      }

      return {
        bggId,
        name,
        yearPublished: year
      } satisfies BggSearchResult;
    })
    .filter((item): item is BggSearchResult => Boolean(item));
}

function parseGameDetails(xml: string, fallbackId: number): BggGameDetails {
  const item = collectElements(xml, "item").find((entry) => readPositiveInteger(entry.attrs.id) === fallbackId) || collectElements(xml, "item")[0];

  if (!item) {
    throw new BggApiError("invalid_xml", "BGG devolvió un XML sin ficha de juego.", 502);
  }

  const nameElement = collectElements(item.content, "name").find((name) => (name.attrs.type || "").toLowerCase() === "primary")
    || collectElements(item.content, "name")[0];

  const name = cleanText(nameElement?.attrs.value || "");

  if (!name) {
    throw new BggApiError("invalid_xml", "BGG devolvió una ficha sin nombre principal.", 502);
  }

  const description = cleanText(getElementText(item.content, "description"));
  const yearPublished = readNumberFromAttr(item.content, "yearpublished");
  const minPlayers = readNumberFromAttr(item.content, "minplayers");
  const maxPlayers = readNumberFromAttr(item.content, "maxplayers");
  const playingTime = readNumberFromAttr(item.content, "playingtime");
  const minAge = readNumberFromAttr(item.content, "minage");
  const averageRating = readFloatFromAttr(item.content, "average");
  const bayesAverageRating = readFloatFromAttr(item.content, "bayesaverage");
  const usersRated = readPositiveInteger(readAttrValue(item.content, "usersrated"));
  const weight = readFloatFromAttr(item.content, "averageweight");
  const weightVotes = readPositiveInteger(readAttrValue(item.content, "numweights"));
  const rank = readBggRank(item.content);

  return {
    bggId: fallbackId,
    bggUrl: `https://boardgamegeek.com/boardgame/${fallbackId}`,
    name,
    description,
    yearPublished,
    minPlayers,
    maxPlayers,
    playingTime,
    minAge,
    averageRating,
    bayesAverageRating,
    usersRated,
    rank,
    weight,
    weightVotes,
    designers: readLinkValues(item.content, "boardgamedesigner"),
    artists: readLinkValues(item.content, "boardgameartist"),
    publishers: readLinkValues(item.content, "boardgamepublisher"),
    categories: readLinkValues(item.content, "boardgamecategory"),
    mechanics: readLinkValues(item.content, "boardgamemechanic"),
    families: readLinkValues(item.content, "boardgamefamily")
  };
}

function readBggRank(xml: string) {
  const ranks = collectElements(xml, "rank");
  const match = ranks.find((rank) => {
    const name = (rank.attrs.name || "").toLowerCase();
    const friendlyName = (rank.attrs.friendlyname || "").toLowerCase();
    return name === "boardgame" || friendlyName.includes("board game rank");
  });

  const value = match?.attrs.value || "";
  const parsed = readPositiveInteger(value);
  return parsed || null;
}

function readLinkValues(xml: string, type: string) {
  const links = collectElements(xml, "link");
  const values = links
    .filter((link) => (link.attrs.type || "").toLowerCase() === type)
    .map((link) => cleanText(link.attrs.value || ""))
    .filter(Boolean);

  return [...new Set(values)];
}

function getElementText(xml: string, tagName: string) {
  const match = xml.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return decodeXml(match?.[1] || "");
}

function readAttrValue(xml: string, tagName: string) {
  const match = xml.match(new RegExp(`<${tagName}\\b([^>]*)\\/?>`, "i"));
  return match ? getAttributeValue(match[1], "value") : "";
}

function readNumberFromAttr(xml: string, tagName: string) {
  return readPositiveInteger(readAttrValue(xml, tagName));
}

function readFloatFromAttr(xml: string, tagName: string) {
  const raw = readAttrValue(xml, tagName);
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : null;
}

function collectElements(xml: string, tagName: string) {
  const regex = new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>|<${tagName}\\b([^>]*)\\/?>`, "gi");
  const items: Array<{ attrs: Record<string, string>; content: string }> = [];

  for (const match of xml.matchAll(regex)) {
    const attrsRaw = match[1] || match[3] || "";
    const content = decodeXml(match[2] || "");
    items.push({
      attrs: parseAttributes(attrsRaw),
      content
    });
  }

  return items;
}

function parseAttributes(input: string) {
  const attrs: Record<string, string> = {};
  const regex = /([A-Za-z_:][A-Za-z0-9_:-]*)="([^"]*)"/g;

  for (const match of input.matchAll(regex)) {
    attrs[match[1]] = decodeXml(match[2]);
  }

  return attrs;
}

function getAttributeValue(input: string, key: string) {
  const attrs = parseAttributes(input);
  return attrs[key] || "";
}

function readPositiveInteger(value: string | number | null | undefined) {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
}

function cleanText(value: string) {
  return decodeXml(value).replace(/\s+/g, " ").trim();
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function looksLikeXml(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("<?xml") || trimmed.startsWith("<items") || trimmed.startsWith("<item");
}

function readCache<T>(cache: Map<string | number, CacheEntry<T>>, key: string | number) {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

function writeCache<T>(cache: Map<string | number, CacheEntry<T>>, key: string | number, value: T, ttl: number) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttl
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
