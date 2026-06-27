import { GameImageStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { assertTrustedAdminApiRequest, jsonNoStore } from "@/lib/adminApiSecurity";
import { prisma } from "@/lib/prisma";
import { revalidatePublishedGame } from "@/lib/publicGameCache";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertTrustedAdminApiRequest(request, { requireJson: true });
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const assetId = readAssetId(body?.assetId);

    const game = await prisma.game.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        primaryImageId: true,
        title: true,
        name: true
      }
    });

    if (!game) {
      return jsonNoStore({ error: "No existe ese juego." }, { status: 404 });
    }

    const asset = await prisma.mediaAsset.findFirst({
      where: {
        id: assetId,
        gameId: game.id
      },
      include: {
        source: true
      }
    });

    if (!asset) {
      return jsonNoStore({ error: "No existe ese asset en este juego." }, { status: 404 });
    }

    const replacementAsset =
      game.primaryImageId === asset.id
        ? await prisma.mediaAsset.findFirst({
            where: {
              gameId: game.id,
              id: { not: asset.id }
            },
            include: {
              source: true
            },
            orderBy: [{ createdAt: "asc" }, { updatedAt: "asc" }]
          })
        : null;

    await prisma.$transaction(async (transaction) => {
      await transaction.mediaAsset.update({
        where: { id: asset.id },
        data: { gameId: null }
      });

      if (game.primaryImageId === asset.id) {
        await transaction.game.update({
          where: { id: game.id },
          data: replacementAsset
            ? {
                primaryImageId: replacementAsset.id,
                coverImageUrl: replacementAsset.url,
                imageUrl: replacementAsset.url,
                coverImageAlt: `Portada de ${game.title || game.name}`,
                imageSourceName: replacementAsset.source?.name || null,
                imageSourceUrl: replacementAsset.source?.baseUrl || null,
                imageLicenseNote: replacementAsset.attribution || null,
                imageStatus: GameImageStatus.verified
              }
            : {
                primaryImageId: null,
                coverImageUrl: null,
                imageUrl: null,
                coverImageAlt: `Portada de ${game.title || game.name}`,
                imageSourceName: null,
                imageSourceUrl: null,
                imageLicenseNote: null,
                imageStatus: GameImageStatus.missing
              }
        });
      }
    });

    revalidateGame(game.id, game.slug);

    return jsonNoStore({
      ok: true,
      removedAssetId: asset.id,
      replacementAssetId: replacementAsset?.id || null
    });
  } catch (error) {
    return jsonNoStore(
      { error: error instanceof Error ? error.message : "No se pudo quitar la imagen." },
      { status: 400 }
    );
  }
}

function revalidateGame(id: string, slug: string) {
  revalidatePath("/admin/games");
  revalidatePath(`/admin/games/${id}`);
  revalidatePath(`/admin/games/${id}/edit`);
  revalidatePublishedGame(slug);
}

function readAssetId(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Falta el asset.");
  }

  return value.trim();
}
