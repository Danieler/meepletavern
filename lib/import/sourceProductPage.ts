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
    throw new Error(`No se pudo leer la ficha original (${response.status}): ${text.slice(0, 160)}`);
  }

  const html = await response.text();
  return extractSourcePageProductFromHtml(html, normalizedUrl);
}

export function extractSourcePageProductFromHtml(html: string, sourceUrl: string): SourcePageProduct {
  const prestashopProduct = extractPrestashopProduct(html, sourceUrl);

  if (prestashopProduct) {
    return prestashopProduct;
  }

  return extractGenericProduct(html, sourceUrl);
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
  const brand = clean(metaByProperty(html, "brand") || itempropMeta(html, "brand") || extractLabeledValue(html, "Marca"));
  const categoryName = clean(payload.category_name || "");
  const availability = clean(payload.availability_message || payload.availability || metaByProperty(html, "product:availability"));
  const price =
    numberLike(metaByProperty(html, "product:price:amount")) ??
    numberLike(metaByProperty(html, "product:sale_price:amount")) ??
    (typeof payload.price_amount === "number" ? payload.price_amount : null);
  const currency = clean(metaByProperty(html, "product:price:currency") || metaByProperty(html, "product:sale_price:currency"));
  const facts = {
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

function extractGenericProduct(html: string, sourceUrl: string): SourcePageProduct {
  const title = clean(meta(html, "og:title") || meta(html, "twitter:title") || textBetween(html, "<title", "</title")) || "Producto";
  const description = clean(
    meta(html, "description") ||
    meta(html, "og:description") ||
    itempropMeta(html, "description") ||
    extractDescriptionHtml(html)
  );
  const imageUrl = absoluteUrl(meta(html, "og:image") || meta(html, "twitter:image"), sourceUrl) || null;
  const brand = clean(metaByProperty(html, "brand") || itempropMeta(html, "brand"));
  const price =
    numberLike(metaByProperty(html, "product:price:amount")) ??
    numberLike(metaByProperty(html, "product:sale_price:amount")) ??
    null;
  const currency = clean(metaByProperty(html, "product:price:currency") || metaByProperty(html, "product:sale_price:currency"));
  const availability = clean(metaByProperty(html, "product:availability"));

  return {
    sourceUrl,
    sourceUrlClean: sourceUrl,
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

function extractLargeImageUrls(html: string, sourceUrl: string) {
  return [...new Set(
    [...html.matchAll(/data-image-large-src="([^"]+)"/gi)]
      .map((match) => absoluteUrl(decodeHtml(match[1] || ""), sourceUrl))
      .filter(Boolean)
  )];
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
