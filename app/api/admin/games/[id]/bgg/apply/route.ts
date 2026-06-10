import { GameStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { assertTrustedAdminApiRequest, jsonNoStore } from "@/lib/adminApiSecurity";
import { getBggGameDetails, BggApiError } from "@/lib/bgg";
import { buildBggGameUpdateInput } from "@/lib/bggEnrichment";
import { gameRepository } from "@/lib/editorialRepositories";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    assertTrustedAdminApiRequest(request, { requireJson: true });
    const { id } = await context.params;
    const body = (await request.json()) as {
      bggId?: number | string;
      overwriteManualFields?: boolean;
    };
    const game = await gameRepository.getEditorById(id);

    if (!game) {
      return jsonNoStore({ error: "No existe ese juego." }, { status: 404 });
    }

    const bggId = Number(body.bggId);
    if (!Number.isFinite(bggId) || bggId <= 0) {
      return jsonNoStore({ error: "El identificador de BGG no es válido." }, { status: 400 });
    }

    const details = await getBggGameDetails(bggId);
    const patch = buildBggGameUpdateInput(game, details, {
      overwriteManualFields: body.overwriteManualFields === true
    });
    const updated = await gameRepository.update(id, patch);

    revalidatePath("/admin/games");
    revalidatePath(`/admin/games/${id}`);
    revalidatePath(`/admin/games/${id}/edit`);
    if (updated.status === GameStatus.published) {
      revalidatePath(`/juegos/${updated.slug}`);
    }

    return jsonNoStore({
      gameId: updated.id,
      slug: updated.slug,
      bggId: updated.bggId,
      appliedFields: Object.keys(patch),
      overwriteManualFields: body.overwriteManualFields === true
    });
  } catch (error) {
    return jsonNoStore({ error: mapBggError(error) }, { status: statusFromError(error) });
  }
}

function mapBggError(error: unknown) {
  if (error instanceof BggApiError) {
    return error.message;
  }

  return error instanceof Error ? error.message : "No se pudo aplicar BGG.";
}

function statusFromError(error: unknown) {
  if (error instanceof BggApiError) {
    return error.status;
  }

  if (error instanceof Error && "status" in error && typeof error.status === "number") {
    return error.status;
  }

  return 500;
}
