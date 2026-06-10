import crypto from "node:crypto";
import { buildAmazonCanonicalUrl } from "@/lib/amazon/parseAmazonInput";

export type AmazonProduct = {
  asin: string;
  title: string;
  detailPageUrl?: string;
  imageUrl?: string;
  brand?: string;
  manufacturer?: string;
  price?: number;
  currency?: string;
  availability?: string;
  rating?: number;
  reviewCount?: number;
  features?: string[];
  facts?: Record<string, string>;
};

type AmazonPaapiConfig = {
  accessKey: string;
  secretKey: string;
  partnerTag: string;
  host: string;
  region: string;
  marketplace: string;
  accessToken: string | null;
};

export function getAmazonPaapiProviderMode() {
  return "real" as const;
}

export async function getAmazonProduct(input: { asin: string; sourceUrl?: string }): Promise<AmazonProduct> {
  const config = readConfig();
  if (config) {
    return fetchAmazonProductFromPaapi(input.asin, config);
  }

  return fetchAmazonProductFromPage({
    asin: input.asin,
    sourceUrl: input.sourceUrl
  });
}

async function fetchAmazonProductFromPaapi(asin: string, config: AmazonPaapiConfig): Promise<AmazonProduct> {
  const body = JSON.stringify({
    ItemIds: [asin],
    ItemIdType: "ASIN",
    PartnerTag: config.partnerTag,
    PartnerType: "Associates",
    Marketplace: config.marketplace,
    Resources: [
      "ItemInfo.Title",
      "ItemInfo.ByLineInfo",
      "ItemInfo.Features",
      "Images.Primary.Large",
      "Offers.Listings.Price",
      "OffersV2.Listings.Price"
    ]
  });

  const timestamp = new Date();
  const amzDate = toAmzDate(timestamp);
  const dateStamp = amzDate.slice(0, 8);
  const endpoint = `https://${config.host}/paapi5/getitems`;
  const signedHeadersParts = ["content-type", "host", "x-amz-date", "x-amz-target"];
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    Host: config.host,
    "X-Amz-Date": amzDate,
    "X-Amz-Target": "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems"
  };

  if (config.accessToken) {
    headers["X-Amz-Access-Token"] = config.accessToken;
    signedHeadersParts.push("x-amz-access-token");
  }
  const signedHeaders = signedHeadersParts.join(";");

  const canonicalRequest = [
    "POST",
    "/paapi5/getitems",
    "",
    `content-type:${headers["Content-Type"]}`,
    `host:${headers.Host}`,
    `x-amz-date:${headers["X-Amz-Date"]}`,
    `x-amz-target:${headers["X-Amz-Target"]}`,
    ...(config.accessToken ? [`x-amz-access-token:${headers["X-Amz-Access-Token"]}`] : []),
    "",
    signedHeaders,
    sha256(body)
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    `${dateStamp}/${config.region}/ProductAdvertisingAPI/aws4_request`,
    sha256(canonicalRequest)
  ].join("\n");

  const signingKey = getSignatureKey(config.secretKey, dateStamp, config.region, "ProductAdvertisingAPI");
  const signature = hmac(signingKey, stringToSign);
  const authorization = [
    "AWS4-HMAC-SHA256",
    `Credential=${config.accessKey}/${dateStamp}/${config.region}/ProductAdvertisingAPI/aws4_request`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`
  ].join(", ");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...headers,
      Authorization: authorization
    },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Amazon PA API respondió con ${response.status}: ${text.slice(0, 180)}`);
  }

  const payload = (await response.json()) as AmazonPaapiResponse;
  const item = payload?.ItemsResult?.Items?.[0];

  if (!item) {
    throw new Error("Amazon PA API no devolvió ningún producto.");
  }

  return mapItemToProduct(item, asin);
}

async function fetchAmazonProductFromPage(input: { asin: string; sourceUrl?: string }): Promise<AmazonProduct> {
  const detailPageUrl = buildAmazonDetailPageUrl(input.asin, input.sourceUrl);
  let response: Response;
  try {
    response = await fetch(detailPageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache"
      }
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "no se pudo abrir la ficha";
    throw new Error(`No se pudo acceder a Amazon desde este entorno (${reason}).`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`No se pudo leer la ficha de Amazon (${response.status}): ${text.slice(0, 160)}`);
  }

  const html = await response.text();
  if (looksLikeAmazonCaptcha(html)) {
    throw new Error("Amazon bloqueó la lectura directa de la ficha. Añade credenciales de PA API para seguir importando.");
  }

  return mapPageToProduct(html, input.asin, detailPageUrl);
}

function readConfig(): AmazonPaapiConfig | null {
  const accessKey = process.env.AMAZON_PAAPI_ACCESS_KEY?.trim() || "";
  const secretKey = process.env.AMAZON_PAAPI_SECRET_KEY?.trim() || "";
  const partnerTag = process.env.AMAZON_PAAPI_PARTNER_TAG?.trim() || "";
  const host = process.env.AMAZON_PAAPI_HOST?.trim() || "webservices.amazon.es";
  const region = process.env.AMAZON_PAAPI_REGION?.trim() || "eu-west-1";
  const marketplace = process.env.AMAZON_PAAPI_MARKETPLACE?.trim() || "www.amazon.es";
  const accessToken = process.env.AMAZON_PAAPI_ACCESS_TOKEN?.trim() || null;

  if (!accessKey || !secretKey || !partnerTag) {
    return null;
  }

  return { accessKey, secretKey, partnerTag, host, region, marketplace, accessToken };
}

function mapPageToProduct(html: string, asin: string, detailPageUrl: string): AmazonProduct {
  const title =
    clean(meta(html, "og:title")) ||
    clean(meta(html, "twitter:title")) ||
    clean(textBetween(html, "<title", "</title")) ||
    `Producto Amazon ${asin}`;
  const imageUrl =
    extractLandingImageUrl(html) ||
    absoluteUrl(meta(html, "og:image") || meta(html, "twitter:image") || "", detailPageUrl);
  const facts = extractFacts(html);
  const rating = extractCustomerRating(html);
  const reviewCount = extractCustomerReviewCount(html);
  const brand = clean(meta(html, "product:brand") || facts["Marca"] || facts["Brand"] || matchLabel(html, /Marca|Brand/i));
  const manufacturer = clean(
    meta(html, "product:manufacturer") || facts["Fabricante"] || facts["Manufacturer"] || matchLabel(html, /Fabricante|Manufacturer/i)
  );
  const priceAmount = firstNumberLike(extractPriceText(html) || meta(html, "product:price:amount") || meta(html, "price") || "");
  const currency = clean(meta(html, "product:price:currency") || meta(html, "priceCurrency") || "");
  const availability = clean(meta(html, "availability") || matchLabel(html, /Disponibilidad|Availability/i));
  const features = extractFeatures(html);

  return {
    asin,
    title,
    detailPageUrl,
    imageUrl: imageUrl || undefined,
    brand: brand || undefined,
    manufacturer: manufacturer || undefined,
    price: priceAmount,
    currency: currency || undefined,
    availability: availability || undefined,
    rating,
    reviewCount,
    features,
    facts
  };
}

type AmazonPaapiResponse = {
  ItemsResult?: {
    Items?: Array<{
      ASIN?: string;
      DetailPageURL?: string;
      ItemInfo?: {
        Title?: { DisplayValue?: string };
        ByLineInfo?: {
          Brand?: { DisplayValue?: string };
          Manufacturer?: { DisplayValue?: string };
        };
        Features?: {
          DisplayValues?: string[];
        };
      };
      Images?: {
        Primary?: {
          Large?: {
            URL?: string;
          };
        };
      };
      OffersV2?: {
        Listings?: Array<{
          Price?: { Amount?: number; Currency?: string };
          Availability?: { Message?: string };
        }>;
      };
      Offers?: {
        Listings?: Array<{
          Price?: { Amount?: number; Currency?: string };
          Availability?: { Message?: string };
        }>;
      };
    }>;
  };
};

type AmazonPaapiItem = NonNullable<NonNullable<AmazonPaapiResponse["ItemsResult"]>["Items"]>[number];

function mapItemToProduct(item: AmazonPaapiItem, fallbackAsin: string): AmazonProduct {
  const priceCandidate =
    item.OffersV2?.Listings?.[0]?.Price || item.Offers?.Listings?.[0]?.Price || undefined;
  const availabilityCandidate =
    item.OffersV2?.Listings?.[0]?.Availability?.Message || item.Offers?.Listings?.[0]?.Availability?.Message || undefined;

  return {
    asin: item.ASIN || fallbackAsin,
    title: item.ItemInfo?.Title?.DisplayValue?.trim() || `Producto Amazon ${fallbackAsin}`,
    detailPageUrl: item.DetailPageURL || undefined,
    imageUrl: item.Images?.Primary?.Large?.URL || undefined,
    brand: item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue?.trim() || undefined,
    manufacturer: item.ItemInfo?.ByLineInfo?.Manufacturer?.DisplayValue?.trim() || undefined,
    price: priceCandidate?.Amount,
    currency: priceCandidate?.Currency,
    availability: availabilityCandidate?.trim() || undefined,
    features: item.ItemInfo?.Features?.DisplayValues?.filter((value): value is string => Boolean(value?.trim()))?.map((value) =>
      value.trim()
    )
  };
}

function buildAmazonDetailPageUrl(asin: string, _sourceUrl?: string) {
  return buildAmazonCanonicalUrl(asin);
}

function meta(html: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  return decode(pattern.exec(html)?.[1] || "");
}

function textBetween(html: string, start: string, end: string) {
  const startIndex = html.toLowerCase().indexOf(start.toLowerCase());
  if (startIndex < 0) {
    return "";
  }

  const contentStart = html.indexOf(">", startIndex) + 1;
  const endIndex = html.toLowerCase().indexOf(end.toLowerCase(), contentStart);
  return endIndex > contentStart ? decode(stripTags(html.slice(contentStart, endIndex))) : "";
}

function matchLabel(html: string, label: RegExp) {
  const compact = stripTags(html).replace(/\s+/g, " ");
  const match = new RegExp(`${label.source}\\s*:?\\s*([^|•\\n]{0,60})`, "i").exec(compact);
  return clean(match?.[1] || "");
}

function extractFeatures(html: string) {
  const section = extractSection(html, "feature-bullets", 9000);
  const lines = [...section.matchAll(/<span class="a-list-item">\s*([\s\S]*?)\s*<\/span>/gi)]
    .map((match) => clean(stripTags(match[1] || "")))
    .filter((item) => item.length > 12);

  if (lines.length) {
    return lines.slice(0, 8);
  }

  return stripTags(html)
    .replace(/\s+/g, " ")
    .split("•")
    .map((item) => clean(item))
    .filter((item) => item.length > 8)
    .slice(0, 5);
}

function firstNumberLike(value: string) {
  const match = value.match(/[\d.,]+/);
  if (!match) {
    return undefined;
  }

  const normalized = Number.parseFloat(match[0].replace(",", "."));
  return Number.isFinite(normalized) ? normalized : undefined;
}

function extractFacts(html: string) {
  const factLabels: Array<[string, RegExp]> = [
    ["Marca", /Marca/i],
    ["Fabricante", /Fabricante/i],
    ["Género", /Género/i],
    ["Tema", /Tema/i],
    ["Número de jugadores", /Número de jugadores/i],
    ["Tiempo de juego estimado", /Tiempo de juego estimado/i],
    ["Edición", /Edición/i],
    ["Idioma", /Idioma/i],
    ["Componentes Incluidos", /Componentes Incluidos/i],
    ["Edad mínima recomendada", /Edad mínima recomendada/i],
    ["Descripción del rango de edad", /Descripción del rango de edad/i],
    ["ASIN", /ASIN/i],
    ["UPC", /UPC/i],
    ["Tipo de embalaje", /Tipo de embalaje/i],
    ["Nombre del conjunto", /Nombre del conjunto/i],
    ["Número Modelo", /Número Modelo/i]
  ];

  const facts: Record<string, string> = {
    ...extractFactsFromTables(html),
    ...extractFactsFromDetailBullets(html)
  };

  for (const [label, pattern] of factLabels) {
    if (facts[label]) {
      continue;
    }

    const value = matchLabel(html, pattern);
    if (value) {
      facts[label] = value;
    }
  }

  return facts;
}

function extractFactsFromTables(html: string) {
  const facts: Record<string, string> = {};
  const rows = html.matchAll(/<tr[^>]*>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi);

  for (const row of rows) {
    const label = normalizeFactLabel(clean(stripTags(row[1] || "")));
    const value = clean(stripTags(row[2] || ""));
    if (label && value) {
      facts[label] = value;
    }
  }

  return facts;
}

function extractFactsFromDetailBullets(html: string) {
  const facts: Record<string, string> = {};
  const section = extractSection(html, "detailBullets_feature_div", 18000);
  const items = section.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);

  for (const item of items) {
    const block = item[1] || "";
    const label = normalizeFactLabel(clean(stripTags(/<span[^>]*class="[^"]*a-text-bold[^"]*"[^>]*>([\s\S]*?)<\/span>/i.exec(block)?.[1] || "")));
    const value = clean(stripTags(block))
      .replace(/^.*?:\s*/, "")
      .replace(/‎/g, "")
      .trim();

    if (label && value) {
      facts[label] = value;
    }
  }

  return facts;
}

function normalizeFactLabel(value: string) {
  return value.replace(/[:：‎]/g, "").replace(/\s+/g, " ").trim();
}

function extractLandingImageUrl(html: string) {
  const landingTagMatch = /<img\b[^>]*id="landingImage"[^>]*>/i.exec(html);
  const tag = landingTagMatch?.[0] || "";

  const oldHires = attrValue(tag, "data-old-hires");
  if (oldHires) {
    return decode(oldHires);
  }

  const dynamicImage = attrValue(tag, "data-a-dynamic-image");
  if (dynamicImage) {
    try {
      const parsed = JSON.parse(decode(dynamicImage)) as Record<string, unknown>;
      const urls = Object.keys(parsed);
      if (urls.length) {
        return urls.sort((left, right) => scoreAmazonImageUrl(right) - scoreAmazonImageUrl(left))[0];
      }
    } catch {
      // ignore malformed dynamic image data
    }
  }

  const src = attrValue(tag, "src");
  return src ? decode(src) : "";
}

function extractCustomerRating(html: string) {
  const text = stripTags(html).replace(/\s+/g, " ");
  const patterns = [
    /(\d(?:[.,]\d)?)\s*de\s*5\s*estrellas/i,
    /(\d(?:[.,]\d)?)\s*out of\s*5\s*stars/i
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) {
      const value = Number.parseFloat(match[1].replace(",", "."));
      if (Number.isFinite(value)) {
        return Math.max(0, Math.min(5, value));
      }
    }
  }

  return undefined;
}

function extractCustomerReviewCount(html: string) {
  const text = stripTags(html).replace(/\s+/g, " ");
  const patterns = [
    /([\d.]+)\s*(?:valoraciones|opiniones|reseñas|reviews?|ratings?)/i,
    /([\d.]+)\s*(?:customer reviews?|customer ratings?)/i
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) {
      const normalized = Number.parseInt(match[1].replace(/\./g, "").replace(/,/g, ""), 10);
      if (Number.isFinite(normalized) && normalized >= 0) {
        return normalized;
      }
    }
  }

  return undefined;
}

function extractPriceText(html: string) {
  const section = extractSection(html, "corePrice_feature_div", 3000) || extractSection(html, "apex_desktop", 3000);
  const match = /class="a-offscreen"[^>]*>\s*([^<]+?)\s*</i.exec(section);
  if (match?.[1]) {
    return clean(match[1]);
  }

  const textMatch = /\b(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*€/.exec(stripTags(section));
  return textMatch ? textMatch[0] : "";
}

function extractSection(html: string, marker: string, radius: number) {
  const index = html.toLowerCase().indexOf(marker.toLowerCase());
  if (index < 0) {
    return "";
  }

  const start = Math.max(0, index - Math.floor(radius / 4));
  const end = Math.min(html.length, index + radius);
  return html.slice(start, end);
}

function attrValue(tag: string, name: string) {
  const pattern = new RegExp(`${name}="([^"]*)"`, "i");
  return pattern.exec(tag)?.[1] || "";
}

function scoreAmazonImageUrl(url: string) {
  const match = /_AC_(?:SX|SY|SL)(\d+)_/i.exec(url);
  return match ? Number(match[1]) : 0;
}

function looksLikeAmazonCaptcha(html: string) {
  const compact = html.toLowerCase();
  return compact.includes("robot check") || compact.includes("captcha") || compact.includes("enter the characters you see below");
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
  return decode(value).replace(/\s+/g, " ").trim();
}

function decode(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function toAmzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key: Buffer | string, value: string) {
  return crypto.createHmac("sha256", key).update(value, "utf8").digest("hex");
}

function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string) {
  const kDate = crypto.createHmac("sha256", `AWS4${key}`).update(dateStamp).digest();
  const kRegion = crypto.createHmac("sha256", kDate).update(regionName).digest();
  const kService = crypto.createHmac("sha256", kRegion).update(serviceName).digest();
  return crypto.createHmac("sha256", kService).update("aws4_request").digest();
}
