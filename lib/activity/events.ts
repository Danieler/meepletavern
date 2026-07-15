import {
  ActivityEventType,
  ActivityEventVisibility,
  GameListVisibility,
  ProfileVisibility,
  type Prisma
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const TAVERN_ACTIVITY_CACHE_TAG = "tavern-activity";
export const ACTIVITY_COMMENT_SNIPPET_LENGTH = 140;

type ActivityActor = {
  id: string;
  displayName: string | null;
  profile: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    profileVisibility: ProfileVisibility;
    collectionVisibility: ProfileVisibility;
  } | null;
};

type ActivityGame = {
  id: string;
  slug: string;
  title: string | null;
  name: string;
};

type ActivityList = {
  id: string;
  name: string;
  slug: string;
  visibility: GameListVisibility;
};

type ActivityEventDb = Pick<typeof prisma, "activityEvent">;

export type RecordActivityEventInput = {
  type: ActivityEventType;
  actor: ActivityActor;
  game: ActivityGame;
  rating?: number | null;
  comment?: string | null;
  requiresPublicCollection?: boolean;
};

export async function recordPublicActivityEvent(
  input: RecordActivityEventInput,
  db: ActivityEventDb = prisma
) {
  const dedupeKey = buildActivityDedupeKey(input.type, input.actor.id, input.game.id);
  const profile = input.actor.profile;
  const isPublic =
    profile?.profileVisibility === ProfileVisibility.PUBLIC &&
    (!input.requiresPublicCollection || profile.collectionVisibility === ProfileVisibility.PUBLIC);

  if (!profile || !isPublic) {
    const result = await db.activityEvent.deleteMany({ where: { dedupeKey } });
    return result.count > 0;
  }

  const actorName = profile.displayName?.trim() || input.actor.displayName?.trim() || profile.username;
  const gameTitle = input.game.title?.trim() || input.game.name.trim();
  const data = {
    type: input.type,
    actorUserId: input.actor.id,
    actorNameSnapshot: actorName,
    actorUsernameSnapshot: profile.username,
    actorAvatarUrlSnapshot: profile.avatarUrl,
    gameId: input.game.id,
    gameTitleSnapshot: gameTitle,
    gameSlugSnapshot: input.game.slug,
    rating: normalizeRating(input.rating),
    commentSnippet: input.comment ? truncateActivityComment(input.comment) : null,
    visibility: ActivityEventVisibility.PUBLIC,
    createdAt: new Date()
  } satisfies Prisma.ActivityEventUncheckedCreateInput;

  await db.activityEvent.upsert({
    where: { dedupeKey },
    create: { ...data, dedupeKey },
    update: data
  });

  return true;
}

export async function removeActivityEvent(
  type: ActivityEventType,
  actorUserId: string,
  gameId: string,
  db: ActivityEventDb = prisma
) {
  const result = await db.activityEvent.deleteMany({
    where: { dedupeKey: buildActivityDedupeKey(type, actorUserId, gameId) }
  });
  return result.count > 0;
}

export async function hidePrivateActivityEvents(
  actorUserId: string,
  input: { hideAll: boolean; hideCollection: boolean },
  db: ActivityEventDb = prisma
) {
  if (!input.hideAll && !input.hideCollection) return false;

  const result = await db.activityEvent.updateMany({
    where: {
      actorUserId,
      visibility: ActivityEventVisibility.PUBLIC,
      ...(input.hideAll
        ? {}
        : {
            type: {
              in: [ActivityEventType.COLLECTION_ADDED, ActivityEventType.WANT_TO_PLAY, ActivityEventType.PLAYED]
            }
          })
    },
    data: { visibility: ActivityEventVisibility.PRIVATE }
  });

  return result.count > 0;
}

export async function syncActivityActorProfile(
  actor: ActivityActor,
  db: ActivityEventDb = prisma
) {
  const profile = actor.profile;

  if (!profile) {
    return hidePrivateActivityEvents(actor.id, { hideAll: true, hideCollection: true }, db);
  }

  const actorName = profile.displayName?.trim() || actor.displayName?.trim() || profile.username;
  const snapshotResult = await db.activityEvent.updateMany({
    where: { actorUserId: actor.id },
    data: {
      actorNameSnapshot: actorName,
      actorUsernameSnapshot: profile.username,
      actorAvatarUrlSnapshot: profile.avatarUrl
    }
  });
  const privacyChanged = await hidePrivateActivityEvents(
    actor.id,
    {
      hideAll: profile.profileVisibility === ProfileVisibility.PRIVATE,
      hideCollection: profile.collectionVisibility === ProfileVisibility.PRIVATE
    },
    db
  );

  return snapshotResult.count > 0 || privacyChanged;
}

export async function tryRecordPublicActivityEvent(input: RecordActivityEventInput) {
  try {
    return await recordPublicActivityEvent(input);
  } catch (error) {
    console.error("No se pudo registrar la actividad pública.", error);
    return false;
  }
}

export async function recordPublicListActivityEvent(
  input: {
    type: "LIST_CREATED" | "LIST_GAME_ADDED";
    actor: ActivityActor;
    list: ActivityList;
    game?: ActivityGame | null;
  },
  db: ActivityEventDb = prisma
) {
  if (input.type === "LIST_CREATED") {
    return false;
  }

  const profile = input.actor.profile;
  if (
    !profile ||
    profile.profileVisibility !== ProfileVisibility.PUBLIC ||
    input.list.visibility !== GameListVisibility.PUBLIC
  ) {
    return false;
  }

  const actorName = profile.displayName?.trim() || input.actor.displayName?.trim() || profile.username;
  const gameTitle = input.game ? input.game.title?.trim() || input.game.name.trim() : null;
  const dedupeKey = [input.type, input.actor.id, input.list.id, input.game?.id].filter(Boolean).join(":");
  const data = {
    type: input.type,
    actorUserId: input.actor.id,
    actorNameSnapshot: actorName,
    actorUsernameSnapshot: profile.username,
    actorAvatarUrlSnapshot: profile.avatarUrl,
    gameId: input.game?.id || null,
    gameTitleSnapshot: gameTitle,
    gameSlugSnapshot: input.game?.slug || null,
    listTitleSnapshot: input.list.name,
    listSlugSnapshot: input.list.slug,
    visibility: ActivityEventVisibility.PUBLIC,
    createdAt: new Date()
  } satisfies Prisma.ActivityEventUncheckedCreateInput;

  await db.activityEvent.upsert({
    where: { dedupeKey },
    create: { ...data, dedupeKey },
    update: data
  });
  return true;
}

export async function tryRecordPublicListActivityEvent(
  input: Parameters<typeof recordPublicListActivityEvent>[0]
) {
  try {
    return await recordPublicListActivityEvent(input);
  } catch (error) {
    console.error("No se pudo registrar la actividad pública de la lista.", error);
    return false;
  }
}

export async function syncListActivityVisibility(
  actorUserId: string,
  list: ActivityList,
  db: ActivityEventDb = prisma
) {
  if (list.visibility === GameListVisibility.PRIVATE) {
    const result = await db.activityEvent.updateMany({
      where: {
        actorUserId,
        dedupeKey: { contains: `:${list.id}` },
        type: { in: [ActivityEventType.LIST_CREATED, ActivityEventType.LIST_GAME_ADDED] }
      },
      data: { visibility: ActivityEventVisibility.PRIVATE }
    });
    return result.count > 0;
  }

  const result = await db.activityEvent.updateMany({
    where: {
      actorUserId,
      visibility: ActivityEventVisibility.PUBLIC,
      dedupeKey: { contains: `:${list.id}` },
      type: { in: [ActivityEventType.LIST_CREATED, ActivityEventType.LIST_GAME_ADDED] }
    },
    data: { listTitleSnapshot: list.name, listSlugSnapshot: list.slug }
  });
  return result.count > 0;
}

export async function removeListActivityEvents(
  actorUserId: string,
  listId: string,
  gameId?: string,
  db: ActivityEventDb = prisma
) {
  const result = await db.activityEvent.deleteMany({
    where: {
      actorUserId,
      dedupeKey: gameId
        ? `${ActivityEventType.LIST_GAME_ADDED}:${actorUserId}:${listId}:${gameId}`
        : { contains: `:${listId}` },
      type: gameId
        ? ActivityEventType.LIST_GAME_ADDED
        : { in: [ActivityEventType.LIST_CREATED, ActivityEventType.LIST_GAME_ADDED] }
    }
  });
  return result.count > 0;
}

export async function trySyncListActivityVisibility(actorUserId: string, list: ActivityList) {
  try {
    return await syncListActivityVisibility(actorUserId, list);
  } catch (error) {
    console.error("No se pudo sincronizar la actividad de la lista.", error);
    return false;
  }
}

export async function tryRemoveListActivityEvents(actorUserId: string, listId: string, gameId?: string) {
  try {
    return await removeListActivityEvents(actorUserId, listId, gameId);
  } catch (error) {
    console.error("No se pudo retirar la actividad de la lista.", error);
    return false;
  }
}

export async function tryRemoveActivityEvent(type: ActivityEventType, actorUserId: string, gameId: string) {
  try {
    return await removeActivityEvent(type, actorUserId, gameId);
  } catch (error) {
    console.error("No se pudo retirar la actividad pública.", error);
    return false;
  }
}

export async function trySyncActivityActorProfile(actor: ActivityActor) {
  try {
    return await syncActivityActorProfile(actor);
  } catch (error) {
    console.error("No se pudo sincronizar la privacidad de la actividad.", error);
    return false;
  }
}

export function truncateActivityComment(value: string, maxLength = ACTIVITY_COMMENT_SNIPPET_LENGTH) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const characters = Array.from(normalized);
  return characters.length <= maxLength ? normalized : `${characters.slice(0, maxLength - 3).join("")}...`;
}

function buildActivityDedupeKey(type: ActivityEventType, actorUserId: string, gameId: string) {
  return `${type}:${actorUserId}:${gameId}`;
}

function normalizeRating(value: number | null | undefined) {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 10 ? value : null;
}
