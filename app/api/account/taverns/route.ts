import { revalidatePath } from "next/cache";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { assertTrustedAccountMutation, privateJson, tavernApiError } from "@/lib/tavernApi";
import { createTavernGroup, getMyTavernDashboard } from "@/lib/tavernGroups";

export async function GET() {
  try {
    const user = await requireCurrentAppUser();
    return privateJson(await getMyTavernDashboard(user.id));
  } catch (error) {
    return tavernApiError(error, "No se pudieron cargar tus tabernas.");
  }
}

export async function POST(request: Request) {
  try {
    assertTrustedAccountMutation(request);
    const user = await requireCurrentAppUser();
    const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
    const tavern = await createTavernGroup(user.id, { name: body?.name });
    revalidatePath("/comunidad/tabernas");
    return privateJson({ tavern }, { status: 201 });
  } catch (error) {
    return tavernApiError(error, "No se pudo crear la taberna.");
  }
}
