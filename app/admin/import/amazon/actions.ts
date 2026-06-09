"use server";

import { importAmazonProductReview, type AmazonImportResult } from "@/lib/amazon/importAmazonProduct";

export type AmazonImportState = {
  error: string | null;
  result: AmazonImportResult | null;
};

export const initialAmazonImportState: AmazonImportState = {
  error: null,
  result: null
};

export async function importAmazonAction(_state: AmazonImportState, formData: FormData): Promise<AmazonImportState> {
  try {
    const result = await importAmazonProductReview({
      sourceId: formData.get("sourceId"),
      amazonInput: formData.get("amazonInput")
    });

    return {
      error: null,
      result
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo importar desde Amazon.",
      result: null
    };
  }
}
