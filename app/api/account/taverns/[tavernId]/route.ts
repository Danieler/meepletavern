import { revalidatePath } from "next/cache";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { assertTrustedAccountMutation, privateJson, tavernApiError } from "@/lib/tavernApi";
import { deleteTavernGroup, getTavernGroupSummary, updateTavernGroup } from "@/lib/tavernGroups";

type Context = { params: Promise<{ tavernId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireCurrentAppUser();
    const { tavernId } = await params;
    return privateJson({ tavern: await getTavernGroupSummary(user.id, tavernId) });
  } catch (error) {
    return tavernApiError(error, "No se pudo cargar la taberna.");
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    assertTrustedAccountMutation(request);
    const user = await requireCurrentAppUser();
    const { tavernId } = await params;
    const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
    const tavern = await updateTavernGroup(user.id, tavernId, { name: body?.name });
    revalidateTavern(tavernId);
    return privateJson({ tavern });
  } catch (error) {
    return tavernApiError(error, "No se pudo actualizar la taberna.");
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    assertTrustedAccountMutation(request);
    const user = await requireCurrentAppUser();
    const { tavernId } = await params;
    const body = (await request.json().catch(() => null)) as { confirmation?: unknown } | null;
    await deleteTavernGroup(user.id, tavernId, body?.confirmation);
    revalidatePath("/comunidad/tabernas");
    return privateJson({ ok: true });
  } catch (error) {
    return tavernApiError(error, "No se pudo eliminar la taberna.");
  }
}

function revalidateTavern(tavernId: string) {
  revalidatePath("/comunidad/tabernas");
  revalidatePath(`/comunidad/tabernas/${tavernId}`);
  revalidatePath(`/comunidad/tabernas/${tavernId}/miembros`);
  revalidatePath(`/comunidad/tabernas/${tavernId}/ajustes`);
}
