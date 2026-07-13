import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { privateJson, tavernApiError } from "@/lib/tavernApi";
import { searchTavernInviteCandidates } from "@/lib/tavernMemberSearch";

type Context = { params: Promise<{ tavernId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const user = await requireCurrentAppUser();
    const { tavernId } = await params;
    const query = new URL(request.url).searchParams.get("q");
    const users = await searchTavernInviteCandidates(user.id, tavernId, query);
    return privateJson({ users });
  } catch (error) {
    return tavernApiError(error, "No se pudieron buscar usuarios.");
  }
}
