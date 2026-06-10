import { revalidatePath } from "next/cache";
import { assertTrustedAdminApiRequest, jsonNoStore } from "@/lib/adminApiSecurity";
import { completeGameEditorialFieldsWithBedrock, EditorialCompletionError } from "@/lib/ai/completeGameEditorialFieldsWithBedrock";
import { gameRepository } from "@/lib/editorialRepositories";
import { buildSafeEditorialPatch } from "@/lib/games/buildSafeEditorialPatch";
import { sanitizeEditorialFields } from "@/lib/import/sanitizeEditorialFields";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  assertTrustedAdminApiRequest(_request);
  const { id } = await context.params;

  try {
    const game = await gameRepository.getEditorById(id);

    if (!game) {
      return jsonNoStore({ error: "No existe ese juego." }, { status: 404 });
    }

    const candidate = await findCandidateContext(game.buyUrl);
    const completion = await completeGameEditorialFieldsWithBedrock(game, candidate);
    const sanitizedCompletion = sanitizeEditorialFields(completion);
    const { patch, appliedFields, suggestedTitle } = buildSafeEditorialPatch(game, sanitizedCompletion);
    const updatedGame = appliedFields.length
      ? await gameRepository.update(id, patch)
      : game;

    revalidateGameAdmin(id);

    return jsonNoStore({
      ok: true,
      game: updatedGame,
      appliedFields,
      confidence: sanitizedCompletion.confidence,
      warnings: sanitizedCompletion.warnings,
      suggestedTitle
    });
  } catch (error) {
    console.error("POST /api/admin/games/[id]/complete-editorial failed", error);

    const { message, status } = mapRouteError(error);
    return jsonNoStore({ error: message }, { status });
  }
}

async function findCandidateContext(sourceUrl: string | null) {
  if (!sourceUrl) {
    return null;
  }

  const candidate = await prisma.gameCandidate.findFirst({
    where: { sourceUrl },
    orderBy: [{ updatedAt: "desc" }]
  });

  if (!candidate) {
    return null;
  }

  return {
    title: candidate.title,
    extractedDescription: candidate.extractedDescription,
    metadata: candidate.metadata
  };
}

function mapRouteError(error: unknown) {
  if (error instanceof EditorialCompletionError) {
    if (error.code === "aws_config") {
      return { message: error.message, status: 500 };
    }

    if (error.code === "invalid_json") {
      return { message: "Bedrock devolvió JSON inválido.", status: 502 };
    }

    if (error.code === "invalid_schema") {
      return { message: "Bedrock devolvió un JSON fuera del schema esperado.", status: 502 };
    }

    return { message: "Bedrock no pudo completar los campos editoriales.", status: 502 };
  }

  if (error instanceof Error) {
    return { message: error.message, status: 500 };
  }

  return { message: "No se pudieron completar los campos editoriales.", status: 500 };
}

function revalidateGameAdmin(id: string) {
  revalidatePath("/admin/games");
  revalidatePath(`/admin/games/${id}`);
  revalidatePath(`/admin/games/${id}/edit`);
}
