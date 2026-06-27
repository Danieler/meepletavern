import { MediaAssetStatus, MediaAssetType, MediaAssetUsage } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { assertTrustedAdminApiRequest, jsonNoStore } from "@/lib/adminApiSecurity";
import { sourceRepository } from "@/lib/editorialRepositories";
import { importSourceProductCandidate } from "@/lib/import/importSourceProduct";
import { prisma } from "@/lib/prisma";
import { revalidatePublishedGame } from "@/lib/publicGameCache";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    assertTrustedAdminApiRequest(request, { requireJson: true });
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const sourceUrl = readSourceUrl(body?.sourceUrl);
    const game = await prisma.game.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        title: true,
        name: true,
        primaryImageId: true
      }
    });

    if (!game) {
      return jsonNoStore({ error: "No existe ese juego." }, { status: 404 });
    }

    const sources = await sourceRepository.list();
    const source = detectSourceFromUrl(sources, sourceUrl);
    if (!source) {
      return jsonNoStore({ error: "Esa URL no corresponde a ninguna fuente dada de alta en admin." }, { status: 400 });
    }

    const imported = await importSourceProductCandidate({
      source,
      sourceUrl
    });
    const imageUrls = [...new Set([
      ...imported.publicImageUrls,
      ...imported.candidate.candidateImages.map((image) => image.url)
    ].filter((value): value is string => Boolean(value)))]
      .slice(0, 3);

    if (!imageUrls.length) {
      return jsonNoStore({ error: "No se encontraron imágenes en esa URL." }, { status: 400 });
    }

    const existingAssets = await prisma.mediaAsset.findMany({
      where: {
        gameId: game.id,
        url: { in: imageUrls }
      },
      select: {
        id: true,
        url: true
      }
    });
    const existingUrls = new Set(existingAssets.map((asset) => asset.url));
    const newUrls = imageUrls.filter((url) => !existingUrls.has(url));

    const createdAssets = await prisma.$transaction(async (transaction) => {
      const assets = [];

      for (let index = 0; index < newUrls.length; index += 1) {
        const url = newUrls[index];
        const asset = await transaction.mediaAsset.create({
          data: {
            gameId: game.id,
            sourceId: source.id,
            url,
            type: index === 0 ? MediaAssetType.cover : MediaAssetType.component,
            status: MediaAssetStatus.candidate,
            usage: MediaAssetUsage.admin_only
          }
        });
        assets.push(asset);
      }

      const primaryAsset = assets[0] || existingAssets.find((asset) => asset.url === imageUrls[0]) || null;
      const primaryUrl = primaryAsset ? primaryAsset.url : imageUrls[0];

      await transaction.game.update({
        where: { id: game.id },
        data: {
          primaryImageId: primaryAsset?.id || game.primaryImageId || null,
          coverImageUrl: primaryUrl,
          imageUrl: primaryUrl,
          coverImageAlt: `Portada de ${game.title || game.name}`,
          imageSourceName: source.name,
          imageSourceUrl: source.baseUrl,
          imageLicenseNote: null,
          imageStatus: "verified"
        }
      });

      return assets;
    });

    revalidateGame(game.id, game.slug);

    return jsonNoStore({
      ok: true,
      importedCount: createdAssets.length,
      totalCount: imageUrls.length
    });
  } catch (error) {
    return jsonNoStore(
      { error: error instanceof Error ? error.message : "No se pudieron importar las imágenes desde la URL." },
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

function readSourceUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Pega una URL.");
  }

  try {
    return new URL(value.trim()).toString();
  } catch {
    throw new Error("Pega una URL válida.");
  }
}

function detectSourceFromUrl<T extends { baseUrl: string }>(sources: T[], sourceUrl: string) {
  const urlHost = hostOf(sourceUrl);
  return sources.find((source) => hostMatches(urlHost, hostOf(source.baseUrl))) || null;
}

function hostOf(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function hostMatches(left: string, right: string) {
  return Boolean(left && right) && (left === right || left.endsWith(`.${right}`) || right.endsWith(`.${left}`));
}
