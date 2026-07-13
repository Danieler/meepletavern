import { revalidatePath } from "next/cache";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { assertTrustedAccountMutation, privateJson, tavernApiError } from "@/lib/tavernApi";
import { leaveTavernGroup } from "@/lib/tavernGroups";

type Context = { params: Promise<{ tavernId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    assertTrustedAccountMutation(request);
    const user = await requireCurrentAppUser();
    const { tavernId } = await params;
    await leaveTavernGroup(user.id, tavernId);
    revalidatePath("/comunidad/tabernas");
    return privateJson({ ok: true });
  } catch (error) {
    return tavernApiError(error, "No se pudo abandonar la taberna.");
  }
}
