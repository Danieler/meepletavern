import type { Source } from "@prisma/client";
import { getAmazonProduct } from "@/lib/amazon/amazonPaapiProvider";
import { mapAmazonProductToCandidate } from "@/lib/amazon/mapAmazonProductToCandidate";
import { buildAmazonCanonicalUrl, parseAmazonInput } from "@/lib/amazon/parseAmazonInput";
import { sourceRepository } from "@/lib/editorialRepositories";
import { persistImportedGameReview, type ImportedGameResult } from "@/lib/import/importedGame";

export type AmazonImportResult = ImportedGameResult;

export async function importAmazonProductReview(input: {
  sourceId: unknown;
  amazonInput: unknown;
}): Promise<AmazonImportResult> {
  const sourceId = readString(input.sourceId, "Selecciona una fuente.");
  const rawAmazonInput = readString(input.amazonInput, "Escribe un ASIN o una URL de Amazon.");
  const parsedInput = parseAmazonInput(rawAmazonInput);

  if (parsedInput.inputType === "invalid" || !parsedInput.asin) {
    throw new Error("Introduce un ASIN válido o una URL de Amazon válida.");
  }

  const source = await sourceRepository.getById(sourceId);
  if (!source) {
    throw new Error("No existe esa fuente.");
  }

  if (!isAmazonSource(source)) {
    throw new Error("Selecciona una fuente de Amazon.");
  }

  const sourceUrlClean = buildAmazonCanonicalUrl(parsedInput.asin);
  const product = await getAmazonProduct({
    asin: parsedInput.asin,
    sourceUrl: sourceUrlClean
  });
  const candidate = mapAmazonProductToCandidate({
    product,
    sourceUrl: sourceUrlClean
  });

  return persistImportedGameReview({
    source,
    candidate,
    publicImageUrl: product.imageUrl || null
  });
}

function readString(value: unknown, message: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(message);
  }

  return value.trim();
}

function isAmazonSource(source: Pick<Source, "baseUrl" | "name">) {
  return `${source.name} ${source.baseUrl}`.toLowerCase().includes("amazon.");
}
