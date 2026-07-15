import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { ActivityEventType } from "@prisma/client";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import {
  tryRecordPublicListActivityEvent,
  tryRemoveListActivityEvents
} from "@/lib/activity/events";
import { revalidateCommunityActivityCaches } from "@/lib/communityCache";
import {
  addGameToList,
  GAME_LIST_ITEM_PAGE_SIZE,
  GameListError,
  getListDetailForOwner,
  removeGameFromList
} from "@/lib/gameLists";

type RouteContext = { params: Promise<{ listId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const appUser = await requireCurrentAppUser();
    const { listId } = await params;
    const cursor = new URL(request.url).searchParams.get("cursor")?.trim() || null;
    if (cursor && (cursor.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(cursor))) {
      throw new GameListError("Cursor no válido.");
    }

    const page = await getListDetailForOwner({
      userId: appUser.id,
      listId,
      cursor,
      limit: GAME_LIST_ITEM_PAGE_SIZE
    });
    if (!page) throw new GameListError("La lista no existe.", 404);
    return NextResponse.json(page, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return listErrorResponse(error, "No se pudo cargar la lista.");
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const appUser = await requireCurrentAppUser();
    const { listId } = await params;
    const body = (await request.json().catch(() => null)) as { gameId?: unknown } | null;
    const gameId = typeof body?.gameId === "string" ? body.gameId.trim() : "";
    if (!gameId) throw new GameListError("Falta el juego.");

    const result = await addGameToList(appUser.id, listId, gameId);
    const activityChanged = await tryRecordPublicListActivityEvent({
      type: ActivityEventType.LIST_GAME_ADDED,
      actor: appUser,
      list: result.list,
      game: result.game
    });
    if (activityChanged) revalidateCommunityActivityCaches();
    revalidateListPaths(appUser.profile?.username, result.list.slug);

    return NextResponse.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return listErrorResponse(error, "No se pudo añadir el juego.");
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const appUser = await requireCurrentAppUser();
    const { listId } = await params;
    const body = (await request.json().catch(() => null)) as { gameId?: unknown } | null;
    const gameId = typeof body?.gameId === "string" ? body.gameId.trim() : "";
    if (!gameId) throw new GameListError("Falta el juego.");

    const list = await removeGameFromList(appUser.id, listId, gameId);
    const activityChanged = await tryRemoveListActivityEvents(appUser.id, list.id, gameId);
    if (activityChanged) revalidateCommunityActivityCaches();
    revalidateListPaths(appUser.profile?.username, list.slug);

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return listErrorResponse(error, "No se pudo quitar el juego.");
  }
}

function revalidateListPaths(username?: string, listSlug?: string) {
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
