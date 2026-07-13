import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { privateJson, tavernApiError } from "@/lib/tavernApi";
import { getTavernGroupMembers } from "@/lib/tavernGroups";

type Context = { params: Promise<{ tavernId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireCurrentAppUser();
    const { tavernId } = await params;
    return privateJson(await getTavernGroupMembers(user.id, tavernId));
  } catch (error) {
    return tavernApiError(error, "No se pudieron cargar los miembros.");
  }
}
