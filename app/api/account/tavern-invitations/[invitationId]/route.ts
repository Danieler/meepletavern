import { revalidatePath } from "next/cache";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { assertTrustedAccountMutation, privateJson, tavernApiError } from "@/lib/tavernApi";
import { respondToTavernInvitation } from "@/lib/tavernGroups";

type Context = { params: Promise<{ invitationId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    assertTrustedAccountMutation(request);
    const user = await requireCurrentAppUser();
    const { invitationId } = await params;
    const body = (await request.json().catch(() => null)) as { action?: unknown } | null;
    const action = body?.action === "decline" ? "decline" : body?.action === "accept" ? "accept" : null;
    if (!action) return privateJson({ error: "La respuesta no es válida." }, { status: 400 });
    const result = await respondToTavernInvitation(user.id, invitationId, action);
    revalidatePath("/comunidad/tabernas");
    revalidatePath(`/comunidad/tabernas/${result.tavernId}`);
    return privateJson(result);
  } catch (error) {
    return tavernApiError(error, "No se pudo responder a la invitación.");
  }
}
