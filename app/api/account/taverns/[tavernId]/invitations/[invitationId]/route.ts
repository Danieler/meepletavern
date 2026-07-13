import { revalidatePath } from "next/cache";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { assertTrustedAccountMutation, privateJson, tavernApiError } from "@/lib/tavernApi";
import { revokeTavernInvitation } from "@/lib/tavernGroups";

type Context = { params: Promise<{ tavernId: string; invitationId: string }> };

export async function DELETE(request: Request, { params }: Context) {
  try {
    assertTrustedAccountMutation(request);
    const user = await requireCurrentAppUser();
    const { tavernId, invitationId } = await params;
    await revokeTavernInvitation(user.id, tavernId, invitationId);
    revalidatePath(`/comunidad/tabernas/${tavernId}/miembros`);
    return privateJson({ ok: true });
  } catch (error) {
    return tavernApiError(error, "No se pudo cancelar la invitación.");
  }
}
