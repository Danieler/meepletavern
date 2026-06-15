import { Prisma } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { assertTrustedAdminApiRequest, jsonNoStore } from "@/lib/adminApiSecurity";
import {
  applyGameImportProposalFields,
  extractBoardGameFieldsWithNova,
  getPendingGameImportProposal,
  saveGameImportProposal,
  searchBoardGameWithTavily,
  serializeProposal,
  rejectGameImportProposal
} from "@/lib/ai/gameWebAutofill";
import { prisma } from "@/lib/prisma";
import {
  mergeHowToPlayVideoSuggestions,
  sanitizeAdminHowToPlayVideos
} from "@/lib/videos/howToPlayVideos";
import { searchHowToPlayVideosWithTavily } from "@/lib/videos/howToPlayVideoSearch";

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
    const game = await prisma.game.findUnique({ where: { id } });

    if (!game) {
      return jsonNoStore({ error: "No existe ese juego." }, { status: 404 });
    }

    const pending = !body?.regenerate ? await getPendingGameImportProposal(id) : null;
    if (pending) {
      const videoSearch = await safeSearchHowToPlayVideos(game);
      const howToPlayVideos = mergeHowToPlayVideoSuggestions(game.howToPlayVideos, videoSearch.videos);
      const updatedGame = await prisma.game.update({
        where: { id },
        data: {
          howToPlayVideos: howToPlayVideos as unknown as Prisma.InputJsonValue
        },
        select: {
          slug: true,
          howToPlayVideos: true
        }
      });
      revalidateGame(updatedGame.slug);

      return jsonNoStore({
        proposal: pending,
        reused: true,
        howToPlayVideos: updatedGame.howToPlayVideos,
        videoWarning: videoSearch.warning
      });
    }

    const [search, videoSearch] = await Promise.all([
      searchBoardGameWithTavily(game),
      safeSearchHowToPlayVideos(game)
    ]);
    const extracted = await extractBoardGameFieldsWithNova({
      game,
      tavilyResults: search.results
    });
    const howToPlayVideos = mergeHowToPlayVideoSuggestions(game.howToPlayVideos, videoSearch.videos);
    const updatedGame = await prisma.game.update({
      where: { id },
      data: {
        howToPlayVideos: howToPlayVideos as unknown as Prisma.InputJsonValue
      },
      select: {
        slug: true,
        howToPlayVideos: true
      }
    });
    const proposal = await saveGameImportProposal({
      gameId: id,
      query: search.query,
      rawSearchResults: search.results,
      extractedFields: extracted
    });

    revalidateGame(updatedGame.slug);

    return jsonNoStore({
      proposal: serializeProposal(proposal),
      howToPlayVideos: updatedGame.howToPlayVideos,
      videoWarning: videoSearch.warning
    });
  } catch (error) {
    return jsonNoStore(
      { error: error instanceof Error ? error.message : "No se pudo completar con IA web." },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertTrustedAdminApiRequest(request, { requireJson: true });
    const { id } = await context.params;
    const body = await request.json();

    if (body.action === "reject") {
      await rejectGameImportProposal(id, body.proposalId);
      return jsonNoStore({ ok: true });
    }

    if (body.action === "update-videos") {
      const game = await prisma.game.findUnique({
        where: { id },
        select: { slug: true }
      });

      if (!game) {
        return jsonNoStore({ error: "No existe ese juego." }, { status: 404 });
      }

      const videos = sanitizeAdminHowToPlayVideos(body.videos);
      const updatedGame = await prisma.game.update({
        where: { id },
        data: {
          howToPlayVideos: videos as unknown as Prisma.InputJsonValue
        },
        select: {
          howToPlayVideos: true
        }
      });
      revalidateGame(game.slug);

      return jsonNoStore({ ok: true, howToPlayVideos: updatedGame.howToPlayVideos });
    }

    const appliedFields = await applyGameImportProposalFields({
      gameId: id,
      proposalId: body.proposalId,
      fields: Array.isArray(body.fields) ? body.fields : [],
      emptyOnly: Boolean(body.emptyOnly)
    });

    return jsonNoStore({ ok: true, appliedFields });
  } catch (error) {
    return jsonNoStore(
      { error: error instanceof Error ? error.message : "No se pudo aplicar la propuesta." },
      { status: 400 }
    );
  }
}

function revalidateGame(slug: string) {
  revalidateTag("public-games");
  revalidatePath("/juegos");
  revalidatePath(`/juegos/${slug}`);
}

async function safeSearchHowToPlayVideos(game: Awaited<ReturnType<typeof prisma.game.findUnique>>) {
  if (!game) {
    return { videos: [], warning: null };
  }

  try {
    return await searchHowToPlayVideosWithTavily(game);
  } catch (error) {
    return {
      videos: [],
      warning: error instanceof Error && /TAVILY/i.test(error.message)
        ? "Tavily no configurado para búsqueda de vídeos"
        : "No se pudieron buscar vídeos de cómo se juega"
    };
  }
}
