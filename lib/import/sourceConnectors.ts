import type { Source } from "@prisma/client";
import type { NormalizedImportedCandidate } from "@/lib/import/importedGame";
import { sanitizeImportedText, sanitizeImportedTitle } from "@/lib/importedTextSanitizer";
import { slugify } from "@/lib/slug";
import { fetchSourcePageProduct, type SourcePageProduct } from "@/lib/import/sourceProductPage";

export type StoreSourceName =
  | "juegos_de_la_mesa_redonda"
  | "dungeon_marvels"
  | "mathom"
  | "dracotienda"
  | "zacatrus"
  | "masqueoca"
  | "amazon";

export type StoreSourceResult = {
  sourceName: StoreSourceName;
  sourceDisplayName: string;
  sourceUrl: string;
  title: string;
  normalizedTitle: string;
  price: number | null;
  currency: "EUR" | null;
  availability: string | null;
  purchaseUrl: string | null;
  publisher: string | null;
  imageUrl: string | null;
  imageAllowed: boolean;
  description: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  minPlayTime: number | null;
  maxPlayTime: number | null;
  recommendedAge: number | null;
  language: string | null;
  rawData: unknown;
  fetchedAt: Date;
};

export type StoreSourceSearchResult = StoreSourceResult & {
  confidence: number;
};

type SourceConnector = {
  sourceName: StoreSourceName;
  sourceDisplayName: string;
  baseUrl: string;
  imageAllowed: boolean;
  buildSearchUrl(title: string): string;
  matches(source: Pick<Source, "name" | "baseUrl">): boolean;
  searchGameInSource(title: string): Promise<StoreSourceSearchResult[]>;
  importGameFromSourceUrl(sourceUrl: string): Promise<StoreSourceResult>;
};

const connectors: SourceConnector[] = [
  createPrestashopSearchConnector({
    sourceName: "juegos_de_la_mesa_redonda",
    sourceDisplayName: "Juegos de la Mesa Redonda",
    baseUrl: "https://juegosdelamesaredonda.com",
    imageAllowed: false
  }),
  createPrestashopSearchConnector({
    sourceName: "dungeon_marvels",
    sourceDisplayName: "Dungeon Marvels",
    baseUrl: "https://dungeonmarvels.com",
    imageAllowed: true
  }),
  createPrestashopSearchConnector({
    sourceName: "mathom",
    sourceDisplayName: "Mathom",
    baseUrl: "https://mathom.es",
    imageAllowed: true
  }),
  createPrestashopSearchConnector({
    sourceName: "dracotienda",
    sourceDisplayName: "Dracotienda",
    baseUrl: "https://dracotienda.com",
    imageAllowed: true
  }),
  createPrestashopSearchConnector({
    sourceName: "zacatrus",
    sourceDisplayName: "Zacatrus",
    baseUrl: "https://zacatrus.es",
    imageAllowed: false,
    buildSearchUrl(title) {
      return `https://zacatrus.es/catalogsearch/result/?q=${encodeURIComponent(title)}`;
    }
  }),
  createMasqueocaConnector({
    sourceName: "masqueoca",
    sourceDisplayName: "MasQueOca",
    baseUrl: "https://www.masqueoca.com/tienda",
    imageAllowed: true
  })
];

export function getStoreSourceConnector(source: Pick<Source, "name" | "baseUrl">) {
  return connectors.find((connector) => connector.matches(source)) || null;
}

export async function searchGameInSource(source: Pick<Source, "name" | "baseUrl">, title: string) {
  const connector = getStoreSourceConnector(source);
  if (!connector) {
    return [];
  }

  return connector.searchGameInSource(title);
}

export function mapStoreSourceResultToImportCandidate(result: StoreSourceResult): NormalizedImportedCandidate {
  const features = isRecord(result.rawData) && Array.isArray(result.rawData.features)
    ? result.rawData.features.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  const facts = isRecord(result.rawData) && isRecord(result.rawData.facts)
    ? result.rawData.facts
    : {};
  const imageUrls = getStoreResultImageUrls(result);

  return {
    sourceUrl: result.purchaseUrl || result.sourceUrl,
    title: result.title,
    originalTitle: null,
    metadata: {
      importedFrom: result.sourceName,
      sourceName: result.sourceName,
      sourceDisplayName: result.sourceDisplayName,
      storeName: result.sourceDisplayName,
      sourceUrlClean: result.purchaseUrl || result.sourceUrl,
      purchaseUrl: result.purchaseUrl || result.sourceUrl,
      cleanTitle: result.title,
      publisher: result.publisher,
      brand: result.publisher,
      manufacturer: result.publisher,
      price: result.price,
      currency: result.currency,
      availability: result.availability,
      features,
      facts,
      rawData: isRecord(result.rawData) ? result.rawData : null,
      fetchedAt: result.fetchedAt.toISOString(),
      imageAllowed: result.imageAllowed,
      language: result.language,
      minPlayers: result.minPlayers,
      maxPlayers: result.maxPlayers,
      minPlayTime: result.minPlayTime,
      maxPlayTime: result.maxPlayTime,
      minAge: result.recommendedAge,
      players:
        result.minPlayers && result.maxPlayers
          ? {
              min: result.minPlayers,
              max: result.maxPlayers,
              label: result.minPlayers === result.maxPlayers ? String(result.minPlayers) : `${result.minPlayers}-${result.maxPlayers}`
            }
          : null
    },
    extractedDescription: result.description,
    candidateImages: imageUrls.map((url, index) => ({
      url,
      type: index === 0 ? ("cover" as const) : ("component" as const),
      sourceUrl: result.purchaseUrl || result.sourceUrl
    })),
    confidence: 0.82,
    flags: []
  };
}

export function extractSearchResultsFromHtml(
  html: string,
  input: {
    sourceName: StoreSourceName;
    sourceDisplayName: string;
    baseUrl: string;
    searchTitle: string;
    imageAllowed: boolean;
  }
): StoreSourceSearchResult[] {
  const queryNormalized = normalizeGameTitle(input.searchTitle);
  const fetchedAt = new Date();
  const blocks = html.match(/<article class="product-miniature[\s\S]*?<\/article>/gi) || [];
  const results: StoreSourceSearchResult[] = [];
  const seen = new Set<string>();

  for (const block of blocks) {
    const linkMatch =
      /<h[23][^>]*class="[^"]*(?:product-title|productName|laber-product-title)[^"]*"[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(block) ||
      /<a[^>]+href="([^"]+)"[^>]*(?:class="[^"]*product-name[^"]*"|itemprop="url")[^>]*>([\s\S]*?)<\/a>/i.exec(block);
    const href = absoluteUrl(decodeHtml(linkMatch?.[1] || ""), input.baseUrl);
    const rawTitle = cleanText(stripTags(decodeHtml(linkMatch?.[2] || "")));

    if (!href || !rawTitle || seen.has(href)) {
      continue;
    }

    const imageUrl = absoluteUrl(
      decodeHtml(
        /<img[^>]+(?:src|data-full-size-image-url)\s*=\s*"([^"]+)"/i.exec(block)?.[1] || ""
      ),
      input.baseUrl
    );
    const price = numberLike(
      cleanText(
        stripTags(
          decodeHtml(
            /<span[^>]*class="[^"]*\bprice\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i.exec(block)?.[1] || ""
          )
        )
      )
    );
    const description = cleanText(
      stripTags(
        decodeHtml(
          /<(?:div|p)[^>]*class="[^"]*(?:product-description-short|product-desc)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|p)>/i.exec(block)?.[1] || ""
        )
      )
    );
    const publisher = cleanText(decodeHtml(/<meta[^>]+itemprop="name"[^>]+content="([^"]+)"/i.exec(block)?.[1] || ""));
    const availability = normalizeAvailability(
      cleanText(
        stripTags(
          decodeHtml(
            /<span[^>]*class="[^"]*stock-msg[^"]*"[^>]*>([\s\S]*?)<\/span>/i.exec(block)?.[1] ||
              /<meta[^>]+itemprop="availability"[^>]+href="([^"]+)"/i.exec(block)?.[1] ||
              ""
          )
        )
      )
    );
    const title = sanitizeImportedTitle(rawTitle).trim() || rawTitle;
    const normalizedTitle = normalizeGameTitle(title);
    const confidence = scoreTitleMatch(normalizedTitle, queryNormalized);

    if (confidence < 0.2) {
      continue;
    }

    seen.add(href);
    results.push({
      sourceName: input.sourceName,
      sourceDisplayName: input.sourceDisplayName,
      sourceUrl: href,
      title,
      normalizedTitle,
      price,
      currency: price === null ? null : "EUR",
      availability,
      purchaseUrl: href,
      publisher: publisher || null,
      imageUrl: imageUrl || null,
      imageAllowed: input.imageAllowed,
      description: description || null,
      minPlayers: null,
      maxPlayers: null,
      minPlayTime: null,
      maxPlayTime: null,
      recommendedAge: null,
      language: null,
      rawData: {
        html: block
      },
      fetchedAt,
      confidence
    });
  }

  for (const result of extractItemListSearchResults(html, input, fetchedAt)) {
    if (!seen.has(result.sourceUrl)) {
      seen.add(result.sourceUrl);
      results.push(result);
    }
  }

  return results.sort((left, right) => right.confidence - left.confidence || left.title.localeCompare(right.title, "es"));
}

export function extractSearchResultsFromMarkdown(
  markdown: string,
  input: {
    sourceName: StoreSourceName;
    sourceDisplayName: string;
    baseUrl: string;
    searchTitle: string;
    imageAllowed: boolean;
  }
): StoreSourceSearchResult[] {
  const queryNormalized = normalizeGameTitle(input.searchTitle);
  const fetchedAt = new Date();
  const results: StoreSourceSearchResult[] = [];
  const seen = new Set<string>();
  const pattern =
    /^\d+\.\s+\[!\[[^\]]*\]\((https:\/\/zacatrus\.es\/media\/catalog\/product\/[^)]+)\)\]\((https:\/\/zacatrus\.es\/[^)\s]+)\)\*\*\[([^\]]+)\]\([^)\s]+\)\*\*([\s\S]*?)(\d+(?:,\d+)?)€([^\n]*)$/gm;

  for (const match of markdown.matchAll(pattern)) {
    const imageUrl = absoluteUrl(match[1] || "", input.baseUrl);
    const href = absoluteUrl(match[2] || "", input.baseUrl);
    const rawTitle = cleanText(match[3] || "");
    const trailingText = cleanText(`${match[0] || ""} ${match[4] || ""} ${match[6] || ""}`);

    if (!href || !rawTitle || seen.has(href)) {
      continue;
    }

    const title = sanitizeImportedTitle(rawTitle).trim() || rawTitle;
    const normalizedTitle = normalizeGameTitle(title);
    const confidence = scoreTitleMatch(normalizedTitle, queryNormalized);

    if (confidence < 0.2) {
      continue;
    }

    seen.add(href);
    results.push({
      sourceName: input.sourceName,
      sourceDisplayName: input.sourceDisplayName,
      sourceUrl: href,
      title,
      normalizedTitle,
      price: numberLike(match[5] || ""),
      currency: "EUR",
      availability: /a(?:n|ñ)adir al carrito/i.test(trailingText) ? "En stock" : null,
      purchaseUrl: href,
      publisher: null,
      imageUrl: imageUrl || null,
      imageAllowed: input.imageAllowed,
      description: null,
      minPlayers: null,
      maxPlayers: null,
      minPlayTime: null,
      maxPlayTime: null,
      recommendedAge: null,
      language: null,
      rawData: {
        markdown: match[0]
      },
      fetchedAt,
      confidence
    });
  }

  return results.sort((left, right) => right.confidence - left.confidence || left.title.localeCompare(right.title, "es"));
}

function extractItemListSearchResults(
  html: string,
  input: {
    sourceName: StoreSourceName;
    sourceDisplayName: string;
    baseUrl: string;
    searchTitle: string;
    imageAllowed: boolean;
  },
  fetchedAt: Date
): StoreSourceSearchResult[] {
  const queryNormalized = normalizeGameTitle(input.searchTitle);
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  const results: StoreSourceSearchResult[] = [];

  for (const script of scripts) {
    const jsonText = script
      .replace(/^<script[^>]*>/i, "")
      .replace(/<\/script>$/i, "")
      .trim();
    const parsed = parseJsonLd(jsonText);
    const nodes = Array.isArray(parsed) ? parsed : [parsed];

    for (const node of nodes) {
      if (!isRecord(node) || node["@type"] !== "ItemList" || !Array.isArray(node.itemListElement)) {
        continue;
      }

      for (const item of node.itemListElement) {
        const entry = isRecord(item) ? item : null;
        const name = cleanText(readUnknownString(entry?.name));
        const href = absoluteUrl(readUnknownString(entry?.url), input.baseUrl);
        const title = sanitizeImportedTitle(name).trim() || name;
        const confidence = scoreTitleMatch(normalizeGameTitle(title), queryNormalized);

        if (!href || !title || confidence < 0.2) {
          continue;
        }

        results.push({
          sourceName: input.sourceName,
          sourceDisplayName: input.sourceDisplayName,
          sourceUrl: href,
          title,
          normalizedTitle: normalizeGameTitle(title),
          price: null,
          currency: null,
          availability: null,
          purchaseUrl: href,
          publisher: null,
          imageUrl: null,
          imageAllowed: input.imageAllowed,
          description: null,
          minPlayers: null,
          maxPlayers: null,
          minPlayTime: null,
          maxPlayTime: null,
          recommendedAge: null,
          language: null,
          rawData: {
            jsonLd: item
          },
          fetchedAt,
          confidence
        });
      }
    }
  }

  return results;
}

function createPrestashopSearchConnector(input: {
  sourceName: StoreSourceName;
  sourceDisplayName: string;
  baseUrl: string;
  imageAllowed: boolean;
  buildSearchUrl?: (title: string) => string;
}): SourceConnector {
  return {
    ...input,
    buildSearchUrl(title) {
      return input.buildSearchUrl
        ? input.buildSearchUrl(title)
        : `${input.baseUrl}/buscar?controller=search&s=${encodeURIComponent(title)}`;
    },
    matches(source) {
      return normalizeHost(source.baseUrl) === normalizeHost(input.baseUrl);
    },
    async searchGameInSource(title) {
      const searchUrl = input.buildSearchUrl
        ? input.buildSearchUrl(title)
        : `${input.baseUrl}/buscar?controller=search&s=${encodeURIComponent(title)}`;
      try {
        const html = await fetchStoreHtml(searchUrl, input.sourceDisplayName);
        const htmlResults = extractSearchResultsFromHtml(html, {
          ...input,
          searchTitle: title
        });
        if (htmlResults.length) {
          return htmlResults;
        }

        if (shouldUseMirrorSearchFallback(input, null)) {
          const markdown = await fetchStoreSearchMarkdown(searchUrl, input.sourceDisplayName);
          const mirrorResults = extractSearchResultsFromMarkdown(markdown, {
            ...input,
            searchTitle: title
          });
          if (mirrorResults.length) {
            return mirrorResults;
          }
        }

        const tavilyResults = await searchStoreWithTavily(input, title);
        if (tavilyResults.length) {
          return tavilyResults;
        }

        return htmlResults;
      } catch (error) {
        if (shouldUseMirrorSearchFallback(input, error)) {
          const markdown = await fetchStoreSearchMarkdown(searchUrl, input.sourceDisplayName);
          const mirrorResults = extractSearchResultsFromMarkdown(markdown, {
            ...input,
            searchTitle: title
          });
          if (mirrorResults.length) {
            return mirrorResults;
          }
        }

        const tavilyResults = await searchStoreWithTavily(input, title);
        if (tavilyResults.length) {
          return tavilyResults;
        }

        throw error;
      }
    },
    async importGameFromSourceUrl(sourceUrl) {
      try {
        const product = await fetchSourcePageProduct(sourceUrl);
        return mapSourcePageProductToStoreSourceResult(product, input);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "error desconocido";
        throw new Error(`[${input.sourceDisplayName}] No se pudo importar la ficha (${reason}).`);
      }
    }
  };
}

export function extractMasqueocaSuggestionsFromHtml(
  html: string,
  input: {
    sourceName: StoreSourceName;
    sourceDisplayName: string;
    baseUrl: string;
    searchTitle: string;
    imageAllowed: boolean;
  }
): StoreSourceSearchResult[] {
  const queryNormalized = normalizeGameTitle(input.searchTitle);
  const fetchedAt = new Date();
  const results: StoreSourceSearchResult[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(/<div class=['"]suggestion-item['"][^>]+onclick="selectSuggestion\('(\d+)'\)"[^>]*>([\s\S]*?)<\/div>/gi)) {
    const itemId = cleanText(match[1] || "");
    const rawTitle = cleanText(stripTags(match[2] || ""));
    const href = `${input.baseUrl.replace(/\/+$/, "")}/producto.asp?item=${itemId}`;

    if (!itemId || !rawTitle || !href || seen.has(href)) {
      continue;
    }

    const title = sanitizeImportedTitle(rawTitle).trim() || rawTitle;
    const normalizedTitle = normalizeGameTitle(title);
    const confidence = scoreTitleMatch(normalizedTitle, queryNormalized);

    if (confidence < 0.2) {
      continue;
    }

    seen.add(href);
    results.push({
      sourceName: input.sourceName,
      sourceDisplayName: input.sourceDisplayName,
      sourceUrl: href,
      title,
      normalizedTitle,
      price: null,
      currency: null,
      availability: null,
      purchaseUrl: href,
      publisher: null,
      imageUrl: null,
      imageAllowed: input.imageAllowed,
      description: null,
      minPlayers: null,
      maxPlayers: null,
      minPlayTime: null,
      maxPlayTime: null,
      recommendedAge: null,
      language: null,
      rawData: {
        itemId,
        suggestionHtml: match[0]
      },
      fetchedAt,
      confidence
    });
  }

  return results.sort((left, right) => right.confidence - left.confidence || left.title.localeCompare(right.title, "es"));
}

function createMasqueocaConnector(input: {
  sourceName: StoreSourceName;
  sourceDisplayName: string;
  baseUrl: string;
  imageAllowed: boolean;
}): SourceConnector {
  return {
    ...input,
    buildSearchUrl(title) {
      return `${input.baseUrl}/get_suggestionsbpp.asp?q=${encodeURIComponent(title)}&n=1`;
    },
    matches(source) {
      return normalizeHost(source.baseUrl) === normalizeHost(input.baseUrl);
    },
    async searchGameInSource(title) {
      const suggestionHtml = await fetchStoreHtml(this.buildSearchUrl(title), input.sourceDisplayName);
      const suggestionResults = extractMasqueocaSuggestionsFromHtml(suggestionHtml, {
        ...input,
        searchTitle: title
      }).slice(0, 4);

      if (!suggestionResults.length) {
        return [];
      }

      const hydratedResults = await Promise.all(
        suggestionResults.map(async (result) => {
          try {
            const product = await fetchSourcePageProduct(result.sourceUrl);
            return {
              ...mapSourcePageProductToStoreSourceResult(product, input),
              confidence: result.confidence
            };
          } catch {
            return result;
          }
        })
      );

      return hydratedResults.sort(
        (left, right) => right.confidence - left.confidence || left.title.localeCompare(right.title, "es")
      );
    },
    async importGameFromSourceUrl(sourceUrl) {
      try {
        const product = await fetchSourcePageProduct(sourceUrl);
        return mapSourcePageProductToStoreSourceResult(product, input);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "error desconocido";
        throw new Error(`[${input.sourceDisplayName}] No se pudo importar la ficha (${reason}).`);
      }
    }
  };
}

function mapSourcePageProductToStoreSourceResult(
  product: SourcePageProduct,
  input: Pick<SourceConnector, "sourceName" | "sourceDisplayName" | "imageAllowed">
): StoreSourceResult {
  const searchableText = [
    product.title,
    product.description || "",
    ...Object.entries(product.facts).flatMap(([key, value]) => [`${key} ${value}`, value]),
    ...product.features
  ].join(" ");
  const players = parsePlayers(searchableText);
  const playtime = parsePlaytime(searchableText);
  const recommendedAge = parseAge(searchableText);
  const language = cleanText(product.facts.Idioma || product.facts.Idiomas || "");
  const title = sanitizeImportedTitle(product.title).trim() || "Juego importado";

  return {
    sourceName: input.sourceName,
    sourceDisplayName: input.sourceDisplayName,
    sourceUrl: product.sourceUrlClean,
    title,
    normalizedTitle: normalizeGameTitle(title),
    price: product.price,
    currency: product.currency === "EUR" ? "EUR" : product.price === null ? null : "EUR",
    availability: normalizeAvailability(product.availability),
    purchaseUrl: product.sourceUrlClean,
    publisher: product.publisher || product.brand,
    imageUrl: product.imageUrl,
    imageAllowed: input.imageAllowed,
    description: product.description,
    minPlayers: players.min,
    maxPlayers: players.max,
    minPlayTime: playtime.min,
    maxPlayTime: playtime.max,
    recommendedAge,
    language: language || null,
    rawData: product,
    fetchedAt: new Date()
  };
}

function getStoreResultImageUrls(result: StoreSourceResult) {
  const rawImages = isRecord(result.rawData) && Array.isArray(result.rawData.additionalImageUrls)
    ? result.rawData.additionalImageUrls.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];

  return [...new Set([result.imageUrl, ...rawImages].filter((value): value is string => Boolean(value)))].slice(0, 3);
}

async function fetchStoreHtml(url: string, sourceDisplayName: string) {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8"
      },
      cache: "no-store"
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "error desconocido";
    throw new Error(`[${sourceDisplayName}] No se pudo ejecutar la búsqueda (${reason}).`);
  }

  if (!response.ok) {
    throw new Error(`[${sourceDisplayName}] La búsqueda devolvió ${response.status}.`);
  }

  return response.text();
}

async function fetchStoreSearchMarkdown(url: string, sourceDisplayName: string) {
  let response: Response;

  try {
    response = await fetch(`https://r.jina.ai/http://${url.replace(/^https?:\/\//i, "")}`, {
      headers: {
        Accept: "text/plain, text/markdown;q=0.9, */*;q=0.8"
      },
      cache: "no-store"
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "error desconocido";
    throw new Error(`[${sourceDisplayName}] No se pudo ejecutar la búsqueda mirror (${reason}).`);
  }

  if (!response.ok) {
    throw new Error(`[${sourceDisplayName}] La búsqueda mirror devolvió ${response.status}.`);
  }

  return response.text();
}

async function searchStoreWithTavily(
  input: Pick<SourceConnector, "sourceName" | "sourceDisplayName" | "baseUrl" | "imageAllowed">,
  title: string
) {
  if (input.sourceName !== "zacatrus") {
    return [];
  }

  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    return [];
  }

  try {
    const { tavily } = await import("@tavily/core");
    const client = tavily({ apiKey });
    const searchQuery = `site:${normalizeHost(input.baseUrl)} \"${title.trim()}\"`;
    const response = await client.search(searchQuery, {
      searchDepth: "basic",
      topic: "general",
      maxResults: 6,
      includeAnswer: false,
      includeRawContent: "text",
      includeImages: false
    });

    return mapTavilyResultsToStoreSourceResults(response.results || [], {
      ...input,
      searchTitle: title
    });
  } catch (error) {
    console.warn(`[${input.sourceDisplayName}] Tavily fallback falló`, error);
    return [];
  }
}

function mapTavilyResultsToStoreSourceResults(
  results: Array<{ title?: string | null; url?: string | null; content?: string | null; score?: number | null }>,
  input: {
    sourceName: StoreSourceName;
    sourceDisplayName: string;
    baseUrl: string;
    searchTitle: string;
    imageAllowed: boolean;
  }
): StoreSourceSearchResult[] {
  const queryNormalized = normalizeGameTitle(input.searchTitle);
  const fetchedAt = new Date();
  const seen = new Set<string>();
  const mapped: StoreSourceSearchResult[] = [];

  for (const result of results) {
    const href = absoluteUrl(result.url || "", input.baseUrl);
    if (!href || seen.has(href) || !isLikelyStoreProductUrl(href, input.baseUrl)) {
      continue;
    }

    const rawTitle = cleanTavilyStoreTitle(result.title || "", href);
    if (!rawTitle) {
      continue;
    }

    const normalizedTitle = normalizeGameTitle(rawTitle);
    const confidence = Math.max(
      scoreTitleMatch(normalizedTitle, queryNormalized),
      typeof result.score === "number" && Number.isFinite(result.score) ? Math.max(0, Math.min(1, result.score)) : 0
    );

    if (confidence < 0.2) {
      continue;
    }

    seen.add(href);
    mapped.push({
      sourceName: input.sourceName,
      sourceDisplayName: input.sourceDisplayName,
      sourceUrl: href,
      title: sanitizeImportedTitle(rawTitle).trim() || rawTitle,
      normalizedTitle,
      price: null,
      currency: null,
      availability: null,
      purchaseUrl: href,
      publisher: null,
      imageUrl: null,
      imageAllowed: input.imageAllowed,
      description: cleanText(result.content || "") || null,
      minPlayers: null,
      maxPlayers: null,
      minPlayTime: null,
      maxPlayTime: null,
      recommendedAge: null,
      language: null,
      rawData: {
        tavily: result
      },
      fetchedAt,
      confidence
    });
  }

  return mapped.sort((left, right) => right.confidence - left.confidence || left.title.localeCompare(right.title, "es"));
}

function cleanTavilyStoreTitle(value: string, url: string) {
  const cleanValue = cleanText(value)
    .replace(/\s*[-|:]\s*Zacatrus\s*$/i, "")
    .replace(/\s*\|\s*Zacatrus\s*$/i, "")
    .trim();

  if (cleanValue) {
    return cleanValue;
  }

  const slug = url.split("/").pop()?.replace(/\.html.*$/i, "") || "";
  return slug
    .split("-")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function isLikelyStoreProductUrl(url: string, baseUrl: string) {
  const normalizedBase = normalizeHost(baseUrl);
  const normalizedUrl = normalizeHost(url);

  if (normalizedBase !== normalizedUrl) {
    return false;
  }

  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return /\.html(?:$|[?#])/.test(pathname) && !/\/(?:checkout|customer|catalogsearch|search|media|static)\//.test(pathname);
  } catch {
    return /\.html(?:$|[?#])/.test(url);
  }
}

function shouldUseMirrorSearchFallback(
  input: Pick<SourceConnector, "sourceName" | "baseUrl">,
  error: unknown
) {
  if (input.sourceName !== "zacatrus") {
    return false;
  }

  if (!error) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /\b403\b|just a moment|cloudflare/i.test(message);
}

function normalizeGameTitle(value: string) {
  return slugify(sanitizeImportedTitle(value).toLowerCase());
}

function scoreTitleMatch(resultTitle: string, queryTitle: string) {
  if (!resultTitle || !queryTitle) {
    return 0;
  }

  if (resultTitle === queryTitle) {
    return 1;
  }

  if (resultTitle.startsWith(queryTitle) || queryTitle.startsWith(resultTitle)) {
    return 0.9;
  }

  if (resultTitle.includes(queryTitle) || queryTitle.includes(resultTitle)) {
    return 0.75;
  }

  const queryTokens = queryTitle.split("-").filter(Boolean);
  if (!queryTokens.length) {
    return 0;
  }

  const resultTokenSet = new Set(resultTitle.split("-").filter(Boolean));
  const shared = queryTokens.filter((token) => resultTokenSet.has(token)).length;
  return shared / queryTokens.length;
}

function parsePlayers(value: string) {
  const compact = normalizeText(value);
  const labelledRange = /(?:n[uú]mero de jugadores|n[uú]m\.?\s*jugadores|jugadores?|players?)\s*(?:de\s+)?(\d{1,2})\s*(?:-|–|a)\s*(\d{1,2})/i.exec(compact);
  if (labelledRange) {
    return { min: Number(labelledRange[1]), max: Number(labelledRange[2]) };
  }

  const range = /(\d{1,2})\s*(?:-|–|a)\s*(\d{1,2})\s*(?:jugadores?|players?)/i.exec(compact);
  if (range) {
    return { min: Number(range[1]), max: Number(range[2]) };
  }

  return { min: null, max: null };
}

function parsePlaytime(value: string) {
  const compact = normalizeText(value);
  const labelledRange = /(?:tiempo de juego estimado|tiempo de juego|duraci[oó]n(?: aproximada)?|playtime)\s*(\d{1,3})\s*(?:-|–|a)\s*(\d{1,3})/i.exec(compact);
  if (labelledRange) {
    return { min: Number(labelledRange[1]), max: Number(labelledRange[2]) };
  }

  const labelledSingle = /(?:tiempo de juego estimado|tiempo de juego|duraci[oó]n(?: aproximada)?|playtime)\s*(\d{1,3})/i.exec(compact);
  if (labelledSingle) {
    const minutes = Number(labelledSingle[1]);
    return { min: minutes, max: minutes };
  }

  const range = /(\d{1,3})\s*(?:-|–|a)\s*(\d{1,3})\s*(?:minutos?|mins?|minutes?)/i.exec(compact);
  if (range) {
    return { min: Number(range[1]), max: Number(range[2]) };
  }

  return { min: null, max: null };
}

function parseAge(value: string) {
  const compact = normalizeText(value);
  const explicitYears = /(?:a partir de|edad m[ií]nima(?: recomendada)?|edad|age)\s*(\d{1,3})\s*(?:a[nñ]os?|years?)/i.exec(compact);
  if (explicitYears) {
    return Number(explicitYears[1]);
  }

  const plusAge = /(?:edad m[ií]nima(?: recomendada)?|edad|age)?\s*(\d{1,2})\s*\+/i.exec(compact);
  if (plusAge) {
    return Number(plusAge[1]);
  }

  return null;
}

function normalizeAvailability(value: string | null | undefined) {
  const compact = cleanText(value || "");
  if (!compact) {
    return null;
  }

  if (/instock$/i.test(compact) || /\ben stock\b/i.test(compact)) {
    return "En stock";
  }

  if (/outofstock$/i.test(compact) || /agotado|sin stock|fuera de stock/i.test(compact)) {
    return "Agotado";
  }

  if (/preorder$/i.test(compact) || /pre-?pedido|preventa|reserva/i.test(compact)) {
    return compact;
  }

  return compact;
}

function numberLike(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeHost(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return value.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "").toLowerCase();
  }
}

function absoluteUrl(value: string, baseUrl: string) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return "";
  }
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, " ");
}

function cleanText(value: string) {
  return sanitizeImportedText(decodeHtml(value).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim()) || "";
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number.parseInt(code, 10)));
}

function parseJsonLd(value: string) {
  try {
    return JSON.parse(decodeHtml(value));
  } catch {
    return null;
  }
}

function readUnknownString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeText(value: string) {
  return decodeHtml(value).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
