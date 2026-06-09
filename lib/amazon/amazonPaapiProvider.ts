import crypto from "node:crypto";
import { getMockAmazonProduct } from "@/lib/amazon/amazonPaapiMockProvider";

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
  features?: string[];
};

type AmazonProviderMode = "mock" | "real";

type AmazonPaapiConfig = {
  accessKey: string;
  secretKey: string;
  partnerTag: string;
  host: string;
  region: string;
  marketplace: string;
  accessToken: string | null;
};

export function getAmazonPaapiProviderMode(): AmazonProviderMode {
  return process.env.AMAZON_PAAPI_USE_MOCK === "true" ? "mock" : "real";
}

export async function getAmazonProduct(input: { asin: string }): Promise<AmazonProduct> {
  if (getAmazonPaapiProviderMode() === "mock") {
    return getMockAmazonProduct(input.asin);
  }

  const config = readConfig();
  if (!config) {
    throw new Error("Amazon PA API no configurada.");
  }

  const body = JSON.stringify({
    ItemIds: [input.asin],
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

  return mapItemToProduct(item, input.asin);
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
