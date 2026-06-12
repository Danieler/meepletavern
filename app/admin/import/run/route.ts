import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { autoApplyGameWebAutofill } from "@/lib/ai/gameWebAutofill";
import { autoCompleteImportedGameWithAi, cleanupImportedCandidate } from "@/lib/import/importedGame";
import { importSourceProductReview } from "@/lib/import/importSourceProduct";

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  try {
    const imported = await importSourceProductReview({
      sourceId: formData.get("sourceId"),
      sourceInput: formData.get("sourceInput")
    });
    const result = await autoCompleteImportedGameWithAi(imported);
    await autoApplyGameWebAutofill(result.gameId);
    await cleanupImportedCandidate(imported.candidateId);

    revalidatePath("/admin/import");
    revalidatePath("/admin/games");
    revalidatePath("/admin/candidates");

    return NextResponse.redirect(new URL(`/admin/games/${result.gameId}?imported=1`, request.url), 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo importar el juego.";
    const sourceId = formData.get("sourceId");
    const redirectUrl = new URL("/admin/import", request.url);
    redirectUrl.searchParams.set("error", message);

    if (typeof sourceId === "string" && sourceId) {
      redirectUrl.searchParams.set("sourceId", sourceId);
    }

    return NextResponse.redirect(redirectUrl, 303);
  }
}
