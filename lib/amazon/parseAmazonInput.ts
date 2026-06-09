const ASIN_PATTERN = /^[A-Z0-9]{10}$/i;

export type AmazonInputType = "asin" | "url" | "invalid";

export type ParsedAmazonInput = {
  asin: string | null;
  inputType: AmazonInputType;
};

export function parseAmazonInput(input: unknown): ParsedAmazonInput {
  if (typeof input !== "string") {
    return { asin: null, inputType: "invalid" };
  }

  const raw = input.trim();
  if (!raw) {
    return { asin: null, inputType: "invalid" };
  }

  if (ASIN_PATTERN.test(raw)) {
    return { asin: raw.toUpperCase(), inputType: "asin" };
  }

  const asinFromUrl = extractAsinFromUrl(raw);
  if (asinFromUrl) {
    return { asin: asinFromUrl, inputType: "url" };
  }

  return { asin: null, inputType: "invalid" };
}

export function buildAmazonCanonicalUrl(asin: string) {
  return `https://www.amazon.es/dp/${asin.trim().toUpperCase()}`;
}

function extractAsinFromUrl(value: string) {
  try {
    const url = new URL(value);
    const candidates = [
      ...pathCandidates(url.pathname),
      url.searchParams.get("asin"),
      url.searchParams.get("ASIN")
    ];

    for (const candidate of candidates) {
      const asin = cleanAsin(candidate);
      if (asin) {
        return asin;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function pathCandidates(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const result: Array<string | null> = [];

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index].toLowerCase();
    if ((part === "dp" || part === "product" || part === "gp") && parts[index + 1]) {
      if (part === "gp" && parts[index + 1].toLowerCase() === "product" && parts[index + 2]) {
        result.push(parts[index + 2]);
      } else {
        result.push(parts[index + 1]);
      }
    }
  }

  return result;
}

function cleanAsin(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return ASIN_PATTERN.test(normalized) ? normalized : null;
}
