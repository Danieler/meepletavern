import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { createGameList, GameListError } from "@/lib/gameLists";

export async function POST(request: Request) {
  try {
    const appUser = await requireCurrentAppUser();
    const body = (await request.json().catch(() => null)) as {
      name?: unknown;
      description?: unknown;
      visibility?: unknown;
    } | null;
    const list = await createGameList(appUser.id, {
      name: body?.name,
      description: body?.description,
      visibility: body?.visibility
    });
    revalidateListPaths(appUser.profile?.username, list.slug);

    return NextResponse.json({ list }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return listErrorResponse(error, "No se pudo crear la lista.");
  }
}

function revalidateListPaths(username?: string, listSlug?: string) {
  revalidatePath("/mi-perfil");
  revalidatePath("/mi-perfil/listas");
  if (listSlug) revalidatePath(`/mi-perfil/listas/${listSlug}`);
  if (username) {
    revalidatePath(`/u/${username}`);
    revalidatePath(`/u/${username}/listas`);
    if (listSlug) revalidatePath(`/u/${username}/listas/${listSlug}`);
  }
}

function listErrorResponse(error: unknown, fallback: string) {
  const status = error instanceof GameListError ? error.status : 500;
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}
