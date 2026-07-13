import { revalidatePath } from "next/cache";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { assertTrustedAccountMutation, privateJson, tavernApiError } from "@/lib/tavernApi";
import { deleteTavernGroupPlay } from "@/lib/tavernGroups";

type Context = { params: Promise<{ tavernId: string; playId: string }> };

export async function DELETE(request: Request, { params }: Context) {
  try {
    assertTrustedAccountMutation(request);
    const user = await requireCurrentAppUser();
    const { tavernId, playId } = await params;
    await deleteTavernGroupPlay(user.id, tavernId, playId);
    revalidatePath(`/comunidad/tabernas/${tavernId}`);
    revalidatePath(`/comunidad/tabernas/${tavernId}/partidas`);
    return privateJson({ ok: true });
  } catch (error) {
    return tavernApiError(error, "No se pudo eliminar la partida.");
  }
}
