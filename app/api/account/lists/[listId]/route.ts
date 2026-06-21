import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { ActivityEventType, GameListVisibility } from "@prisma/client";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import {
  TAVERN_ACTIVITY_CACHE_TAG,
  tryRecordPublicListActivityEvent,
  tryRemoveListActivityEvents,
  trySyncListActivityVisibility
} from "@/lib/activity/events";
import { deleteGameList, GameListError, updateGameList } from "@/lib/gameLists";

type RouteContext = { params: Promise<{ listId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const appUser = await requireCurrentAppUser();
    const { listId } = await params;
    const body = (await request.json().catch(() => null)) as {
      name?: unknown;
      description?: unknown;
      visibility?: unknown;
    } | null;
    const { list, previousVisibility } = await updateGameList(appUser.id, listId, {
      name: body?.name,
      description: body?.description,
      visibility: body?.visibility
    });
    const becamePublic = previousVisibility === GameListVisibility.PRIVATE && list.visibility === GameListVisibility.PUBLIC;
    const activityChanged = becamePublic
      ? await tryRecordPublicListActivityEvent({ type: ActivityEventType.LIST_CREATED, actor: appUser, list })
      : await trySyncListActivityVisibility(appUser.id, list);
    if (activityChanged) revalidateTag(TAVERN_ACTIVITY_CACHE_TAG);
    revalidateListPaths(appUser.profile?.username, list.slug);

    return NextResponse.json({ list }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return listErrorResponse(error, "No se pudo actualizar la lista.");
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const appUser = await requireCurrentAppUser();
    const { listId } = await params;
    const list = await deleteGameList(appUser.id, listId);
    const activityChanged = await tryRemoveListActivityEvents(appUser.id, list.id);
    if (activityChanged) revalidateTag(TAVERN_ACTIVITY_CACHE_TAG);
    revalidateListPaths(appUser.profile?.username, list.slug);

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return listErrorResponse(error, "No se pudo eliminar la lista.");
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
