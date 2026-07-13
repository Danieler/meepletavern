import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { privateJson, tavernApiError } from "@/lib/tavernApi";
import { getTavernGroupLibrary } from "@/lib/tavernGroups";

type Context = { params: Promise<{ tavernId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const user = await requireCurrentAppUser();
    const { tavernId } = await params;
    const query = new URL(request.url).searchParams.get("q");
    return privateJson({ items: await getTavernGroupLibrary(user.id, tavernId, query) });
  } catch (error) {
    return tavernApiError(error, "No se pudo cargar la ludoteca.");
  }
}
