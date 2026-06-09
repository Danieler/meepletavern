"use server";

import { revalidatePath } from "next/cache";
import { bulkImportCandidates, type BulkImportResult } from "@/lib/editorialRepositories";

type BulkImportState = {
  ok: boolean;
  error: string | null;
  results: BulkImportResult[];
};

export async function bulkImportAction(_state: BulkImportState, formData: FormData): Promise<BulkImportState> {
  try {
    const results = await bulkImportCandidates(formData.get("sourceId"), formData.get("urls"), formData.get("limit"));
    revalidatePath("/admin/candidates");

    return {
      ok: true,
      error: null,
      results
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo ejecutar la importación bulk.",
      results: []
    };
  }
}
