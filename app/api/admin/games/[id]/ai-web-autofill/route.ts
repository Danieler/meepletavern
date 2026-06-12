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
      return jsonNoStore({ proposal: pending, reused: true });
    }

    const search = await searchBoardGameWithTavily(game);
    const extracted = await extractBoardGameFieldsWithNova({
      game,
      tavilyResults: search.results
    });
    const proposal = await saveGameImportProposal({
      gameId: id,
      query: search.query,
      rawSearchResults: search.results,
      extractedFields: extracted
    });

    return jsonNoStore({ proposal: serializeProposal(proposal) });
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
