import { revalidatePath } from "next/cache";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { assertTrustedAccountMutation, privateJson, tavernApiError } from "@/lib/tavernApi";
import { inviteTavernGroupMember } from "@/lib/tavernGroups";

type Context = { params: Promise<{ tavernId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    assertTrustedAccountMutation(request);
    const user = await requireCurrentAppUser();
    const { tavernId } = await params;
    const body = (await request.json().catch(() => null)) as { username?: unknown } | null;
    const invitation = await inviteTavernGroupMember(user.id, tavernId, { username: body?.username });
    revalidatePath(`/comunidad/tabernas/${tavernId}/miembros`);
    return privateJson({ invitation }, { status: 201 });
  } catch (error) {
    return tavernApiError(error, "No se pudo enviar la invitación.");
  }
}
