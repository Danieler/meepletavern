import { revalidatePath } from "next/cache";
import { assertTrustedAdminApiRequest, jsonNoStore } from "@/lib/adminApiSecurity";
import { sourceRepository } from "@/lib/editorialRepositories";
import { buildStoreOfferInputFromCandidate, getBestOffer, upsertStoreOfferRecordDetailed } from "@/lib/gameOffers";
import { importSourceProductCandidate } from "@/lib/import/importSourceProduct";
import { prisma } from "@/lib/prisma";
import { revalidatePublicGameDetail } from "@/lib/publicGameCache";

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
        slug: true
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
    const offer = buildStoreOfferInputFromCandidate({
      source,
      candidate: {
        sourceUrl: imported.candidate.sourceUrl,
        title: imported.candidate.title,
        originalTitle: imported.candidate.originalTitle,
        metadata: imported.candidate.metadata
      }
    });

    if (!offer) {
      return jsonNoStore({ error: "No se pudo extraer un precio u oferta usable desde esa URL." }, { status: 400 });
    }

    await upsertStoreOfferRecordDetailed(prisma, {
      gameId: game.id,
      source,
      offer
    });

    const offers = await prisma.gameOffer.findMany({
      where: { gameId: game.id },
      orderBy: [{ price: "asc" }, { updatedAt: "desc" }]
    });
    const bestOffer = getBestOffer(offers);
    const buyUrl = bestOffer?.affiliateUrl || bestOffer?.purchaseUrl || bestOffer?.sourceUrl || null;

    await prisma.game.update({
      where: { id: game.id },
      data: { buyUrl }
    });

    revalidateGame(game.id, game.slug);

    return jsonNoStore({
      ok: true,
      buyUrl,
      offers
    });
  } catch (error) {
    return jsonNoStore(
      { error: error instanceof Error ? error.message : "No se pudo importar la oferta desde la URL." },
      { status: 400 }
    );
  }
}

function revalidateGame(id: string, slug: string) {
  revalidatePath("/admin/games");
  revalidatePath(`/admin/games/${id}`);
  revalidatePublicGameDetail(slug);
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
