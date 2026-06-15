export type SourcePageProduct = {
  sourceUrl: string;
  sourceUrlClean: string;
  platform: "prestashop" | "generic";
  title: string;
  description: string | null;
  imageUrl: string | null;
  additionalImageUrls: string[];
  brand: string | null;
  publisher: string | null;
  price: number | null;
  currency: string | null;
  availability: string | null;
  facts: Record<string, string>;
  features: string[];
};

type PrestashopProductData = {
  link?: string;
  name?: string;
  description?: string;
  price_amount?: number;
  availability_message?: string;
  availability?: string;
  category_name?: string;
  cover?: {
    large?: { url?: string };
    medium?: { url?: string };
    small?: { url?: string };
  };
  images?: Array<{
    large?: { url?: string };
    medium?: { url?: string };
    small?: { url?: string };
  }>;
  features?: Array<{
    name?: string;
    value?: string;
  }>;
};

export async function fetchSourcePageProduct(sourceUrl: string): Promise<SourcePageProduct> {
  const normalizedUrl = normalizeSourceUrl(sourceUrl);
  let response: Response;

  try {
    response = await fetch(normalizedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache"
      },
      cache: "no-store"
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "no se pudo abrir la ficha";
    throw new Error(`No se pudo acceder a la ficha original desde este entorno (${reason}).`);
  }

  if (!response.ok) {
    const text = await response.text();
    const mirrorProduct = await tryFetchMirrorProduct(normalizedUrl);
    if (mirrorProduct) {
      return mirrorProduct;
    }
    throw new Error(`No se pudo leer la ficha original (${response.status}): ${text.slice(0, 160)}`);
  }

  const html = await response.text();
  if (looksLikeAccessChallenge(html)) {
    const mirrorProduct = await tryFetchMirrorProduct(normalizedUrl);
    if (mirrorProduct) {
      return mirrorProduct;
    }
  }
  return extractSourcePageProductFromHtml(html, normalizedUrl);
}

export function extractSourcePageProductFromHtml(html: string, sourceUrl: string): SourcePageProduct {
  const prestashopProduct = extractPrestashopProduct(html, sourceUrl);

  if (prestashopProduct) {
    return prestashopProduct;
  }

  return extractGenericProduct(html, sourceUrl);
}

export function extractSourcePageProductFromMarkdown(markdown: string, sourceUrl: string): SourcePageProduct {
  const title = extractMarkdownProductTitle(markdown, sourceUrl) || "Producto";
  const imageUrls = extractMarkdownProductImages(markdown, sourceUrl);
  const facts = extractMarkdownFacts(markdown);
  const description = extractMarkdownDescription(markdown);
  const availability = extractMarkdownAvailability(markdown);
  const brand = clean(facts.Editorial || facts.Marca || "");
  const price = extractMarkdownPrice(markdown);

  return {
    sourceUrl,
    sourceUrlClean: sourceUrl,
    platform: "generic",
    title,
    description: description || null,
    imageUrl: imageUrls[0] || null,
    additionalImageUrls: imageUrls,
    brand: brand || null,
    publisher: brand || null,
    price,
    currency: price === null ? null : "EUR",
    availability: availability || null,
    facts,
    features: []
  };
}

function extractPrestashopProduct(html: string, sourceUrl: string): SourcePageProduct | null {
  const encoded = /data-product="([^"]+)"/i.exec(html)?.[1] || "";

  if (!encoded) {
    return null;
  }

  let payload: PrestashopProductData;
  try {
    payload = JSON.parse(decodeHtml(encoded)) as PrestashopProductData;
  } catch {
    return null;
  }

  const title = clean(payload.name || meta(html, "og:title") || textBetween(html, "<title", "</title")) || "Producto";
  const description = clean(stripTags(payload.description || extractDescriptionHtml(html) || ""));
  const htmlImageUrls = extractLargeImageUrls(html, sourceUrl);
  const payloadImageUrls = (payload.images || [])
    .map((image) => absoluteUrl(image.large?.url || image.medium?.url || image.small?.url || "", sourceUrl))
    .filter(Boolean);
  const preferredImageUrl =
    absoluteUrl(
      payload.cover?.large?.url ||
      payload.cover?.medium?.url ||
      payload.cover?.small?.url ||
      metaByProperty(html, "og:image"),
      sourceUrl
    ) || null;
  const additionalImageUrls = [...new Set([...(preferredImageUrl ? [preferredImageUrl] : []), ...payloadImageUrls, ...htmlImageUrls])];
  const imageUrl = preferredImageUrl || additionalImageUrls[0] || null;
  const featureFacts = extractPrestashopFeatureFacts(payload.features || []);
  const brand = clean(
    metaByProperty(html, "brand") ||
    itempropMeta(html, "brand") ||
    extractLabeledValue(html, "Marca") ||
    featureFacts.Editorial ||
    featureFacts.Marca
  );
  const categoryName = clean(payload.category_name || "");
  const availability = clean(payload.availability_message || payload.availability || metaByProperty(html, "product:availability"));
  const price =
    numberLike(metaByProperty(html, "product:price:amount")) ??
    numberLike(metaByProperty(html, "product:sale_price:amount")) ??
    (typeof payload.price_amount === "number" ? payload.price_amount : null);
  const currency = clean(metaByProperty(html, "product:price:currency") || metaByProperty(html, "product:sale_price:currency"));
  const facts = {
    ...featureFacts,
    ...(brand ? { Marca: brand } : {}),
    ...(categoryName && categoryName.toLowerCase() !== "juegos de tablero" ? { Categoría: categoryName } : {}),
    ...(availability ? { Disponibilidad: availability } : {})
  };

  return {
    sourceUrl,
    sourceUrlClean: clean(payload.link || sourceUrl) || sourceUrl,
    platform: "prestashop",
    title,
    description: description || null,
    imageUrl,
    additionalImageUrls,
    brand: brand || null,
    publisher: brand || null,
    price,
    currency: currency || null,
    availability: availability || null,
    facts,
    features: []
  };
}

function extractPrestashopFeatureFacts(
  features: Array<{
    name?: string;
    value?: string;
  }>
) {
  const facts: Record<string, string> = {};

  for (const feature of features) {
    const name = clean(feature.name || "");
    const value = clean(stripTags(feature.value || ""));
    if (!name || !value) {
      continue;
    }

    facts[name] = value;
  }

  return facts;
}

function extractGenericProduct(html: string, sourceUrl: string): SourcePageProduct {
  const siteName = clean(metaByProperty(html, "og:site_name") || "");
  const plainText = normalizedPlainText(html);
  const facts = extractGenericFacts(plainText);
  const title =
    clean(
      cleanGenericProductTitle(
        metaByProperty(html, "og:title") || meta(html, "twitter:title") || textBetween(html, "<title", "</title"),
        siteName,
        sourceUrl
      )
    ) || "Producto";
  const description = clean(
    extractGenericDescription(html, plainText) ||
    meta(html, "description") ||
    metaByProperty(html, "og:description") ||
    itempropMeta(html, "description")
  );
  const imageUrl = absoluteUrl(metaByProperty(html, "og:image") || meta(html, "twitter:image") || itempropMeta(html, "image"), sourceUrl) || null;
  const brand = clean(
    metaByProperty(html, "brand") ||
    itempropMeta(html, "brand") ||
    facts.Marca ||
    facts.Fabricante ||
    facts["Marca comercial"] ||
    ""
  );
  const price =
    numberLike(metaByProperty(html, "product:price:amount")) ??
    numberLike(metaByProperty(html, "product:sale_price:amount")) ??
    null;
  const currency = clean(metaByProperty(html, "product:price:currency") || metaByProperty(html, "product:sale_price:currency"));
  const availability = clean(metaByProperty(html, "product:availability") || facts.Disponibilidad || "");
  const sourceUrlClean = clean(canonicalUrl(html, sourceUrl) || sourceUrl) || sourceUrl;

  return {
    sourceUrl,
    sourceUrlClean,
    platform: "generic",
    title,
    description: description || null,
    imageUrl,
    additionalImageUrls: imageUrl ? [imageUrl] : [],
    brand: brand || null,
    publisher: brand || null,
    price,
    currency: currency || null,
    availability: availability || null,
    facts: {
      ...facts,
      ...(brand ? { Marca: brand } : {}),
      ...(availability ? { Disponibilidad: availability } : {})
    },
    features: []
  };
}

function normalizeSourceUrl(value: string) {
  try {
    return new URL(value).toString();
  } catch {
    throw new Error("La URL del juego no es válida.");
  }
}

function extractDescriptionHtml(html: string) {
  const match =
    /<div class="product-description"[^>]*>([\s\S]*?)<\/div>/i.exec(html) ||
    /<div[^>]+itemprop="description"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
  return match?.[1] || "";
}

function extractLabeledValue(html: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(
    `<label[^>]*>\\s*${escaped}\\s*<\\/label>[\\s\\S]{0,240}?(?:<a[^>]*>|<span[^>]*>|<div[^>]*>|<p[^>]*>)\\s*([\\s\\S]*?)\\s*<\\/(?:a|span|div|p)>`,
    "i"
  ).exec(html);
  return clean(stripTags(match?.[1] || ""));
}

function extractGenericDescription(html: string, plainText: string) {
  const htmlDescription = clean(stripTags(extractDescriptionHtml(html)));
  if (htmlDescription) {
    return htmlDescription;
  }

  const sectionPatterns = [
    /Descripci[oó]n\s+Detalles del producto\s+Opiniones\s+Preguntas Frecuentes\s+([\s\S]*?)(?:\s+(?:Tiempo de juego|Edad m[ií]nima|N[uú]mero de jugadores|Idiomas|Marca|Referencia|Ficha t[eé]cnica|Informaci[oó]n sobre el distribuidor)\b)/i,
    /Descripci[oó]n\s+([\s\S]*?)(?:\s+(?:Detalles del producto|Tiempo de juego|Edad m[ií]nima|N[uú]mero de jugadores|Idiomas|Marca|Referencia|Ficha t[eé]cnica)\b)/i
  ];

  for (const pattern of sectionPatterns) {
    const value = clean(pattern.exec(plainText)?.[1] || "");
    if (value) {
      return value;
    }
  }

  return "";
}

function extractGenericFacts(plainText: string) {
  const facts: Record<string, string> = {};
  const factDefinitions: Array<[string, string[], string[]]> = [
    ["Tiempo de juego", ["Tiempo de juego", "Duración"], ["Edad mínima", "Número de jugadores", "Idiomas", "Marca", "Referencia"]],
    ["Edad mínima", ["Edad mínima"], ["Número de jugadores", "Idiomas", "Marca", "Referencia", "Ficha técnica"]],
    ["Número de jugadores", ["Número de jugadores", "Nº de jugadores"], ["Idiomas", "Marca", "Referencia", "Ficha técnica"]],
    ["Idiomas", ["Idiomas", "Idioma"], ["Marca", "Referencia", "Ficha técnica"]],
    ["Marca", ["Marca"], ["Referencia", "EAN", "Ficha técnica"]],
    ["Fabricante", ["Fabricante"], ["Fecha de lanzamiento", "Marca", "Referencia", "EAN", "Ficha técnica"]],
    ["Disponibilidad", ["Disponibilidad"], ["Información sobre el distribuidor", "Marca comercial", "Dirección", "Contacto", "También podría interesarle"]]
  ];

  for (const [key, labels, stopLabels] of factDefinitions) {
    const value = extractTextFactValue(plainText, labels, stopLabels);
    if (value) {
      facts[key] = value;
    }
  }

  return facts;
}

function extractTextFactValue(plainText: string, labels: string[], stopLabels: string[]) {
  for (const label of labels) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const stopPattern = stopLabels
      .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");
    const pattern = new RegExp(`${escapedLabel}\\s*:?[\\s\\u00a0]*([\\s\\S]{1,140}?)(?=\\s+(?:${stopPattern})\\b|$)`, "i");
    const value = clean(pattern.exec(plainText)?.[1] || "");
    if (value) {
      return value;
    }
  }

  return "";
}

function cleanGenericProductTitle(value: string, siteName: string, sourceUrl: string) {
  let title = clean(value);
  if (!title) {
    return "";
  }

  const suffixes = [siteName, hostLabel(sourceUrl)].filter(Boolean);
  for (const suffix of suffixes) {
    const escapedSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    title = title.replace(new RegExp(`\\s*[|·-]\\s*${escapedSuffix}\\s*$`, "i"), "").trim();
  }

  return title.replace(/\s+juego de mesa\s*$/i, "").trim();
}

function canonicalUrl(html: string, sourceUrl: string) {
  const match = /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i.exec(html);
  return absoluteUrl(decodeHtml(match?.[1] || ""), sourceUrl);
}

function normalizedPlainText(html: string) {
  return decodeHtml(stripTags(html))
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hostLabel(sourceUrl: string) {
  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./i, "");
    return host
      .split(".")
      .slice(0, -1)
      .join(" ")
      .replace(/[-_]+/g, " ")
      .trim();
  } catch {
    return "";
  }
}

function extractLargeImageUrls(html: string, sourceUrl: string) {
  return [...new Set(
    [...html.matchAll(/data-image-large-src="([^"]+)"/gi)]
      .map((match) => absoluteUrl(decodeHtml(match[1] || ""), sourceUrl))
      .filter(Boolean)
  )];
}

async function tryFetchMirrorProduct(sourceUrl: string) {
  try {
    const response = await fetch(`https://r.jina.ai/http://${sourceUrl}`, {
      headers: {
        Accept: "text/plain, text/markdown;q=0.9, */*;q=0.8"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    const markdown = await response.text();
    if (!looksLikeMirrorProduct(markdown)) {
      return null;
    }

    return extractSourcePageProductFromMarkdown(markdown, sourceUrl);
  } catch {
    return null;
  }
}

function looksLikeAccessChallenge(html: string) {
  const lower = html.toLowerCase();
  return (
    lower.includes("just a moment") &&
    (lower.includes("enable javascript and cookies to continue") ||
      lower.includes("_cf_chl_opt") ||
      lower.includes("challenges.cloudflare.com"))
  );
}

function looksLikeMirrorProduct(markdown: string) {
  const lower = markdown.toLowerCase();
  return lower.includes("url source: https://") && lower.includes("ficha técnica");
}

function extractMarkdownProductTitle(markdown: string, sourceUrl: string) {
  const lines = markdown.split(/\r?\n/).map((line) => line.trim());
  const headings = lines
    .map((line) => (line.startsWith("# ") ? line.slice(2).trim() : ""))
    .filter(Boolean);
  const heading =
    headings.find((line) => !line.includes(" - ") && !/zacatrus/i.test(line)) ||
    headings.find((line) => !/zacatrus/i.test(line)) ||
    "";
  if (heading) {
    return cleanGenericProductTitle(heading, "Zacatrus", sourceUrl);
  }

  const pageTitle = /^\#\s+(.+?)\s+-\s+.*Zacatrus/im.exec(markdown)?.[1] || "";
  return cleanGenericProductTitle(pageTitle, "Zacatrus", sourceUrl);
}

function extractMarkdownProductImages(markdown: string, sourceUrl: string) {
  const gallerySection = extractMarkdownGallerySection(markdown);
  const matches = [...gallerySection.matchAll(/!\[[^\]]*\]\((https:\/\/zacatrus\.es\/media\/catalog\/product\/[^)]+)\)/gi)];
  const urls = matches
    .map((match) => absoluteUrl(match[1] || "", sourceUrl))
    .filter((value): value is string => Boolean(value));

  return [...new Set(urls)].filter((url) => !isLikelyRetailerEditedImage(url));
}

function extractMarkdownGallerySection(markdown: string) {
  const galleryMatch =
    /\[Saltar al final de la galer[íi]a de im[áa]genes\][\s\S]*?\n([\s\S]*?)\n\[Saltar al comienzo de la galer[íi]a de im[áa]genes\]/i.exec(markdown);
  if (galleryMatch?.[1]) {
    return galleryMatch[1];
  }

  const headingMatches = [...markdown.matchAll(/^#\s+.+$/gm)];
  if (headingMatches.length >= 2) {
    const start = headingMatches[0].index ?? 0;
    const end = headingMatches[1].index ?? markdown.length;
    return markdown.slice(start, end);
  }

  return markdown;
}

function extractMarkdownPrice(markdown: string) {
  const detailSection = extractMarkdownDetailSection(markdown);
  const priceMatch = /(?:Precio especial\s*)?(\d+(?:,\d+)?)€/i.exec(detailSection);
  return numberLike(priceMatch?.[1] || "");
}

function extractMarkdownAvailability(markdown: string) {
  const detailSection = extractMarkdownDetailSection(markdown);
  const estimated = /Llegada estimada:\s*(.+?)(?:\n|Valoración:|\[\d+\s+comentarios\])/i.exec(detailSection)?.[1] || "";
  if (estimated) {
    return clean(`Disponible (${estimated.replace(/\*/g, "")})`);
  }

  if (/No est[aá] disponible/i.test(detailSection)) {
    return "No está disponible";
  }

  return clean(/Producto\s+\*\*([^*]+)\*\*/i.exec(detailSection)?.[1] || "");
}

function extractMarkdownDescription(markdown: string) {
  const detailsSection = /\[Detalles\][\s\S]*?\n\n([\s\S]*?)(?=\n\[(?:comentarios|Reseñas))/i.exec(markdown)?.[1] || "";
  const detailsText = clean(detailsSection.replace(/\[(.*?)\]\((.*?)\)/g, "$1").replace(/\*+/g, ""));
  if (detailsText) {
    return detailsText;
  }

  const teaser = /\n(?:\d+(?:,\d+)?€|Precio especial[^\n]+)\n\n(?:!\[[^\]]*\]\([^)]+\)\n\n)*([\s\S]*?)(?=\n(?:\*\*Envío gratis\*\*|\[Ver toda la información de envio\]|\s+INFORMACIÓN DE ENVÍO))/i.exec(markdown)?.[1] || "";
  return clean(teaser.replace(/\*+/g, ""));
}

function extractMarkdownFacts(markdown: string) {
  const section = /Ficha técnica\s+([\s\S]*?)(?=\n\[Detalles\]|\n\[comentarios\]|\n\*\*Escribir Su propia reseña)/i.exec(markdown)?.[1] || "";
  const lines = section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const facts: Record<string, string> = {};
  const mappedLabels: Record<string, string> = {
    "Si buscas...": "Categorías",
    "Núm. jugadores": "Número de jugadores",
    "Tiempo de juego": "Tiempo de juego",
    Autor: "Autor",
    Mecánica: "Mecánica",
    Temática: "Temática",
    Edad: "Edad mínima",
    Medidas: "Medidas",
    Complejidad: "Complejidad",
    Editorial: "Editorial",
    Contenido: "Contenido",
    Idioma: "Idioma",
    "Dependencia del idioma": "Dependencia del idioma"
  };

  for (let index = 0; index < lines.length; index += 1) {
    const label = lines[index];
    const mappedLabel = mappedLabels[label];
    if (!mappedLabel) {
      continue;
    }

    if (mappedLabel === "Contenido") {
      const contentLines: string[] = [];
      let cursor = index + 1;
      while (cursor < lines.length && lines[cursor].startsWith("*")) {
        contentLines.push(clean(lines[cursor].replace(/^\*\s*/, "")));
        cursor += 1;
      }
      if (contentLines.length) {
        facts[mappedLabel] = contentLines.join(", ");
      }
      index = cursor - 1;
      continue;
    }

    const value = clean(lines[index + 1] || "");
    if (!value) {
      continue;
    }

    facts[mappedLabel] = normalizeMarkdownFactValue(mappedLabel, value);
  }

  return facts;
}

function extractMarkdownDetailSection(markdown: string) {
  const match = /\n#\s+[^\n]+\n\n([\s\S]*?)(?=\nFicha técnica\b|\n\*\*Envío gratis\*\*|\n\[Ver toda la información de envio\])/i.exec(markdown);
  return match?.[1] || markdown;
}

function normalizeMarkdownFactValue(label: string, value: string) {
  if (label === "Número de jugadores") {
    const matches = [...value.matchAll(/\d+/g)].map((match) => Number.parseInt(match[0] || "", 10)).filter(Number.isFinite);
    if (matches.length >= 2) {
      return `${Math.min(...matches)} - ${Math.max(...matches)} jugadores`;
    }
    if (matches.length === 1) {
      return `${matches[0]} jugadores`;
    }
  }

  if (label === "Edad mínima") {
    const firstAge = /\d+/.exec(value)?.[0] || "";
    return firstAge ? `${firstAge} años` : value;
  }

  return value;
}

function isLikelyRetailerEditedImage(url: string) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const filename = pathname.split("/").pop() || "";
    return /(?:^|[_-])video(?:[_-]|\.|$)/i.test(filename);
  } catch {
    return false;
  }
}

function meta(html: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  return decodeHtml(pattern.exec(html)?.[1] || "");
}

function metaByProperty(html: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  return decodeHtml(pattern.exec(html)?.[1] || "");
}

function itempropMeta(html: string, itemprop: string) {
  const escaped = itemprop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta[^>]+itemprop=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  return decodeHtml(pattern.exec(html)?.[1] || "");
}

function textBetween(html: string, start: string, end: string) {
  const startIndex = html.toLowerCase().indexOf(start.toLowerCase());
  if (startIndex < 0) {
    return "";
  }

  const contentStart = html.indexOf(">", startIndex) + 1;
  const endIndex = html.toLowerCase().indexOf(end.toLowerCase(), contentStart);
  return endIndex > contentStart ? decodeHtml(stripTags(html.slice(contentStart, endIndex))) : "";
}

function absoluteUrl(value: string, sourceUrl: string) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value, sourceUrl).toString();
  } catch {
    return "";
  }
}

function stripTags(value: string) {
  return value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
}

function clean(value: string) {
  return decodeHtml(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function numberLike(value: string) {
  const match = value.replace(/\u00a0/g, " ").match(/[\d.,]+/);
  if (!match) {
    return null;
  }

  const raw = match[0];
  const normalizedValue =
    raw.includes(",") && raw.includes(".")
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw.includes(",")
        ? raw.replace(",", ".")
        : raw;
  const normalized = Number.parseFloat(normalizedValue);
  return Number.isFinite(normalized) ? normalized : null;
}
