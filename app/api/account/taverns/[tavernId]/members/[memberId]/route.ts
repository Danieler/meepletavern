import { revalidatePath } from "next/cache";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { assertTrustedAccountMutation, privateJson, tavernApiError } from "@/lib/tavernApi";
import { removeTavernMember, updateTavernMemberRole } from "@/lib/tavernGroups";

type Context = { params: Promise<{ tavernId: string; memberId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    assertTrustedAccountMutation(request);
    const user = await requireCurrentAppUser();
    const { tavernId, memberId } = await params;
    const body = (await request.json().catch(() => null)) as { role?: unknown } | null;
    await updateTavernMemberRole(user.id, tavernId, memberId, body?.role);
    revalidate(tavernId);
    return privateJson({ ok: true });
  } catch (error) {
    return tavernApiError(error, "No se pudo cambiar el rol.");
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    assertTrustedAccountMutation(request);
    const user = await requireCurrentAppUser();
    const { tavernId, memberId } = await params;
    await removeTavernMember(user.id, tavernId, memberId);
    revalidate(tavernId);
    return privateJson({ ok: true });
  } catch (error) {
    return tavernApiError(error, "No se pudo eliminar el miembro.");
  }
}

function revalidate(tavernId: string) {
  revalidatePath(`/comunidad/tabernas/${tavernId}`);
  revalidatePath(`/comunidad/tabernas/${tavernId}/miembros`);
}
