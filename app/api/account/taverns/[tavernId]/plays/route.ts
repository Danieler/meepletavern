import { revalidatePath } from "next/cache";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { assertTrustedAccountMutation, privateJson, tavernApiError } from "@/lib/tavernApi";
import { createTavernGroupPlay, getTavernGroupPlays } from "@/lib/tavernGroups";

type Context = { params: Promise<{ tavernId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const user = await requireCurrentAppUser();
    const { tavernId } = await params;
    const gameId = new URL(request.url).searchParams.get("gameId");
    return privateJson(await getTavernGroupPlays(user.id, tavernId, gameId));
  } catch (error) {
    return tavernApiError(error, "No se pudieron cargar las partidas.");
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    assertTrustedAccountMutation(request);
    const user = await requireCurrentAppUser();
    const { tavernId } = await params;
    const body = (await request.json().catch(() => null)) as {
      gameId?: unknown;
      playedAt?: unknown;
      participantUserIds?: unknown;
    } | null;
    const play = await createTavernGroupPlay(user.id, tavernId, {
      gameId: body?.gameId,
      playedAt: body?.playedAt,
      participantUserIds: body?.participantUserIds
    });
    revalidate(tavernId);
    return privateJson({ play }, { status: 201 });
  } catch (error) {
    return tavernApiError(error, "No se pudo registrar la partida.");
  }
}

function revalidate(tavernId: string) {
  revalidatePath(`/comunidad/tabernas/${tavernId}`);
  revalidatePath(`/comunidad/tabernas/${tavernId}/partidas`);
}
