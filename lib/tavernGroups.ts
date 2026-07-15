import {
  GameStatus,
  Prisma,
  TavernInvitationStatus,
  TavernMemberRole
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TavernGroupError } from "@/lib/tavernGroupError";

export { TavernGroupError } from "@/lib/tavernGroupError";

export const MAX_TAVERN_NAME_LENGTH = 60;
export const MAX_TAVERNS_PER_USER = 10;
export const MAX_TAVERN_MEMBERS = 50;
export const MAX_PENDING_TAVERN_INVITATIONS = 50;
export const TAVERN_INVITATION_DAYS = 14;
export const MAX_TAVERN_LIBRARY_ITEMS = 48;
export const TAVERN_LIBRARY_PAGE_SIZE = 24;
export const MAX_TAVERN_PLAY_OPTIONS = 80;
export const MAX_TAVERN_PLAYS = 25;
export const TAVERN_PLAYS_PAGE_SIZE = 20;

export type TavernRole = "ADMIN" | "MEMBER";

export function normalizeTavernName(value: unknown) {
  return typeof value === "string"
    ? Array.from(value.trim().replace(/\s+/g, " ")).slice(0, MAX_TAVERN_NAME_LENGTH).join("")
    : "";
}

export function normalizeTavernUsername(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/^@/, "").toLowerCase() : "";
}

export function parseTavernRole(value: unknown) {
  if (value === TavernMemberRole.ADMIN || value === TavernMemberRole.MEMBER) return value;
  throw new TavernGroupError("El rol no es válido.", 400, "INVALID_ROLE");
}

export function canEditTavernPlay(input: {
  actorUserId: string;
  actorRole: TavernRole;
  recordedByUserId: string | null;
}) {
  return input.actorRole === TavernMemberRole.ADMIN || input.actorUserId === input.recordedByUserId;
}

function validateTavernName(value: unknown) {
  const name = normalizeTavernName(value);
  if (name.length < 2) {
    throw new TavernGroupError("El nombre debe tener al menos 2 caracteres.", 400, "INVALID_NAME");
  }
  return name;
}

function publicUser(user: {
  id: string;
  displayName: string | null;
  profile: { username: string; displayName: string | null } | null;
}) {
  return {
    id: user.id,
    username: user.profile?.username || "usuario",
    displayName: tavernDisplayName(user)
  };
}

function tavernDisplayName(user: {
  displayName: string | null;
  profile: { username: string; displayName: string | null } | null;
}) {
  return user.profile?.displayName || user.displayName || user.profile?.username || "Usuario";
}

type TavernSummaryRow = {
  id: string;
  name: string;
  role: TavernMemberRole;
  memberCount: number;
  playCount: number;
  uniqueGames: number;
};
type TavernDashboardRow = {
  sortGroup: number;
  sortAt: Date;
  kind: "tavern" | "invitation";
  id: string;
  tavernId: string;
  name: string;
  role: TavernMemberRole | null;
  joinedAt: Date | null;
  updatedAt: Date | null;
  expiresAt: Date | null;
  memberCount: number;
  playCount: number;
  uniqueGames: number;
  invitedByUserId: string | null;
  invitedByUsername: string | null;
  invitedByProfileDisplayName: string | null;
  invitedByDisplayName: string | null;
};

export async function getTavernGroupSummary(userId: string, tavernId: string) {
  const [row] = await prisma.$queryRaw<TavernSummaryRow[]>(Prisma.sql`
    WITH member_count AS (
      SELECT COUNT(*)::int AS cnt FROM "TavernGroupMember" WHERE "tavernId" = ${tavernId}
    ), play_count AS (
      SELECT COUNT(*)::int AS cnt FROM "TavernGroupPlay" WHERE "tavernId" = ${tavernId}
    ), unique_games AS (
      SELECT COUNT(DISTINCT library."gameId")::int AS cnt
      FROM "TavernGroupMember" member
      JOIN "UserLibraryGame" library
        ON library."userId" = member."userId" AND library."owned" = true
      JOIN "Game" game
        ON game.id = library."gameId" AND game.status = ${GameStatus.published}::"GameStatus"
      WHERE member."tavernId" = ${tavernId}
    )
    SELECT
      tavern.id,
      tavern.name,
      membership.role,
      mc.cnt AS "memberCount",
      pc.cnt AS "playCount",
      ug.cnt AS "uniqueGames"
    FROM "TavernGroupMember" membership
    JOIN "TavernGroup" tavern ON tavern.id = membership."tavernId"
    CROSS JOIN member_count mc
    CROSS JOIN play_count pc
    CROSS JOIN unique_games ug
    WHERE membership."tavernId" = ${tavernId}
      AND membership."userId" = ${userId}
    LIMIT 1
  `);
  if (!row) {
    throw new TavernGroupError("La taberna no existe.", 404, "TAVERN_NOT_FOUND");
  }
  return row;
}

export async function getMyTavernDashboard(userId: string) {
  const now = new Date();
  const rows = await prisma.$queryRaw<TavernDashboardRow[]>(Prisma.sql`
    WITH user_taverns AS (
      SELECT membership."tavernId", membership.role::text AS role, membership."joinedAt", membership.id AS mid
      FROM "TavernGroupMember" membership
      WHERE membership."userId" = ${userId}
      ORDER BY membership."joinedAt" DESC, membership.id DESC
      LIMIT 30
    ), tavern_ids AS (
      SELECT "tavernId" FROM user_taverns
    ), member_counts AS (
      SELECT "tavernId", COUNT(*)::int AS cnt
      FROM "TavernGroupMember"
      WHERE "tavernId" IN (SELECT "tavernId" FROM tavern_ids)
      GROUP BY "tavernId"
    ), play_counts AS (
      SELECT "tavernId", COUNT(*)::int AS cnt
      FROM "TavernGroupPlay"
      WHERE "tavernId" IN (SELECT "tavernId" FROM tavern_ids)
      GROUP BY "tavernId"
    ), unique_game_counts AS (
      SELECT member."tavernId", COUNT(DISTINCT library."gameId")::int AS cnt
      FROM "TavernGroupMember" member
      JOIN "UserLibraryGame" library
        ON library."userId" = member."userId" AND library."owned" = true
      JOIN "Game" game
        ON game.id = library."gameId" AND game.status = ${GameStatus.published}::"GameStatus"
      WHERE member."tavernId" IN (SELECT "tavernId" FROM tavern_ids)
      GROUP BY member."tavernId"
    ), dashboard_taverns AS (
      SELECT
        tavern.id,
        tavern.id AS "tavernId",
        tavern.name,
        ut.role,
        ut."joinedAt",
        tavern."updatedAt",
        COALESCE(mc.cnt, 0)::int AS "memberCount",
        COALESCE(pc.cnt, 0)::int AS "playCount",
        COALESCE(ugc.cnt, 0)::int AS "uniqueGames"
      FROM user_taverns ut
      JOIN "TavernGroup" tavern ON tavern.id = ut."tavernId"
      LEFT JOIN member_counts mc ON mc."tavernId" = tavern.id
      LEFT JOIN play_counts pc ON pc."tavernId" = tavern.id
      LEFT JOIN unique_game_counts ugc ON ugc."tavernId" = tavern.id
    ), pending_invitation_base AS (
      SELECT
        invitation.id,
        invitation."tavernId",
        invitation."expiresAt",
        invitation."createdAt",
        invitation."invitedByUserId"
      FROM "TavernGroupInvitation" invitation
      WHERE invitation."targetUserId" = ${userId}
        AND invitation.status = ${TavernInvitationStatus.PENDING}::"TavernInvitationStatus"
        AND invitation."expiresAt" > ${now}
      ORDER BY invitation."createdAt" DESC, invitation.id DESC
      LIMIT 30
    ), invitation_member_counts AS (
      SELECT "tavernId", COUNT(*)::int AS cnt
      FROM "TavernGroupMember"
      WHERE "tavernId" IN (SELECT "tavernId" FROM pending_invitation_base)
      GROUP BY "tavernId"
    ), pending_invitations AS (
      SELECT
        invitation.id,
        tavern.id AS "tavernId",
        tavern.name,
        invitation."expiresAt",
        invitation."createdAt",
        COALESCE(imc.cnt, 0)::int AS "memberCount",
        invited_by.id AS "invitedByUserId",
        invited_profile.username AS "invitedByUsername",
        invited_profile."displayName" AS "invitedByProfileDisplayName",
        invited_by."displayName" AS "invitedByDisplayName"
      FROM pending_invitation_base invitation
      JOIN "TavernGroup" tavern ON tavern.id = invitation."tavernId"
      LEFT JOIN "User" invited_by ON invited_by.id = invitation."invitedByUserId"
      LEFT JOIN "UserProfile" invited_profile ON invited_profile."userId" = invited_by.id
      LEFT JOIN invitation_member_counts imc ON imc."tavernId" = tavern.id
    )
    SELECT
      0::int AS "sortGroup",
      dashboard_taverns."joinedAt" AS "sortAt",
      'tavern'::text AS kind,
      dashboard_taverns.id,
      dashboard_taverns."tavernId",
      dashboard_taverns.name,
      dashboard_taverns.role,
      dashboard_taverns."joinedAt",
      dashboard_taverns."updatedAt",
      NULL::timestamp AS "expiresAt",
      dashboard_taverns."memberCount",
      dashboard_taverns."playCount",
      dashboard_taverns."uniqueGames",
      NULL::text AS "invitedByUserId",
      NULL::text AS "invitedByUsername",
      NULL::text AS "invitedByProfileDisplayName",
      NULL::text AS "invitedByDisplayName"
    FROM dashboard_taverns
    UNION ALL
    SELECT
      1::int AS "sortGroup",
      pending_invitations."createdAt" AS "sortAt",
      'invitation'::text AS kind,
      pending_invitations.id,
      pending_invitations."tavernId",
      pending_invitations.name,
      NULL::text AS role,
      NULL::timestamp AS "joinedAt",
      NULL::timestamp AS "updatedAt",
      pending_invitations."expiresAt",
      pending_invitations."memberCount",
      0::int AS "playCount",
      0::int AS "uniqueGames",
      pending_invitations."invitedByUserId",
      pending_invitations."invitedByUsername",
      pending_invitations."invitedByProfileDisplayName",
      pending_invitations."invitedByDisplayName"
    FROM pending_invitations
    ORDER BY "sortGroup" ASC, "sortAt" DESC, id DESC
  `);

  const taverns: Array<{
    id: string;
    name: string;
    role: TavernMemberRole;
    joinedAt: string;
    updatedAt: string;
    memberCount: number;
    playCount: number;
    uniqueGames: number;
  }> = [];
  const invitations: Array<{
    id: string;
    expiresAt: string;
    tavern: { id: string; name: string; memberCount: number };
    invitedBy: { id: string; username: string; displayName: string } | null;
  }> = [];

  for (const row of rows) {
    if (row.kind === "tavern" && row.role && row.joinedAt && row.updatedAt) {
      taverns.push({
        id: row.id,
        name: row.name,
        role: row.role,
        joinedAt: row.joinedAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        memberCount: row.memberCount,
        playCount: row.playCount,
        uniqueGames: row.uniqueGames
      });
      continue;
    }

    if (row.kind === "invitation" && row.expiresAt) {
      invitations.push({
        id: row.id,
        expiresAt: row.expiresAt.toISOString(),
        tavern: {
          id: row.tavernId,
          name: row.name,
          memberCount: row.memberCount
        },
        invitedBy: row.invitedByUserId ? {
          id: row.invitedByUserId,
          username: row.invitedByUsername || "usuario",
          displayName: row.invitedByProfileDisplayName
            || row.invitedByDisplayName
            || row.invitedByUsername
            || "Usuario"
        } : null
      });
    }
  }

  return {
    taverns,
    invitations
  };
}

export async function createTavernGroup(userId: string, input: { name: unknown }) {
  const name = validateTavernName(input.name);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`);
    const createdCount = await tx.tavernGroup.count({ where: { createdByUserId: userId } });
    if (createdCount >= MAX_TAVERNS_PER_USER) {
      throw new TavernGroupError(
        `Puedes crear hasta ${MAX_TAVERNS_PER_USER} tabernas.`,
        409,
        "TAVERN_LIMIT"
      );
    }
    const tavern = await tx.tavernGroup.create({
      data: { name, createdByUserId: userId },
      select: { id: true, name: true, createdAt: true }
    });
    await tx.tavernGroupMember.create({
      data: { tavernId: tavern.id, userId, role: TavernMemberRole.ADMIN }
    });
    return tavern;
  });
}

export async function requireTavernMembership(
  userId: string,
  tavernId: string,
  requiredRole?: TavernRole
) {
  const membership = await prisma.tavernGroupMember.findUnique({
    where: { tavernId_userId: { tavernId, userId } },
    select: {
      id: true,
      userId: true,
      role: true,
      joinedAt: true,
      tavern: { select: { id: true, name: true, createdAt: true, updatedAt: true } }
    }
  });
  if (!membership) {
    throw new TavernGroupError("La taberna no existe.", 404, "TAVERN_NOT_FOUND");
  }
  if (requiredRole && membership.role !== requiredRole) {
    throw new TavernGroupError("No tienes permiso para realizar esta acción.", 403, "ADMIN_REQUIRED");
  }
  return membership;
}

type TavernLibrarySqlRow = {
  gameId: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  copyCount: number;
  playCount: number;
  lastPlayedAt: Date | null;
  ownerNames: string[] | null;
};

export async function getTavernGroupLibrary(userId: string, tavernId: string, searchValue?: string | null) {
  await requireTavernMembership(userId, tavernId);
  return getTavernGroupLibraryPreviewForMember(tavernId, searchValue);
}

export async function getTavernGroupLibraryForMember(tavernId: string, searchValue?: string | null) {
  const rows = await queryTavernGroupLibraryRows(tavernId, searchValue, {
    take: MAX_TAVERN_LIBRARY_ITEMS,
    skip: 0
  });
  return mapTavernLibraryRows(rows);
}

export function normalizeTavernPage(value: unknown) {
  const parsed = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : 1;
  return Number.isSafeInteger(parsed) ? Math.min(Math.max(parsed, 1), 100) : 1;
}

export async function getTavernGroupLibraryPageForMember(
  tavernId: string,
  searchValue?: string | null,
  pageValue?: unknown
) {
  const page = normalizeTavernPage(pageValue);
  const rows = await queryTavernGroupLibraryRows(tavernId, searchValue, {
    take: TAVERN_LIBRARY_PAGE_SIZE + 1,
    skip: (page - 1) * TAVERN_LIBRARY_PAGE_SIZE
  });

  return {
    items: mapTavernLibraryRows(rows.slice(0, TAVERN_LIBRARY_PAGE_SIZE)),
    page,
    hasNext: rows.length > TAVERN_LIBRARY_PAGE_SIZE
  };
}

async function queryTavernGroupLibraryRows(
  tavernId: string,
  searchValue: string | null | undefined,
  pagination: { take: number; skip: number }
) {
  const search = typeof searchValue === "string" ? searchValue.trim().replace(/\s+/g, " ").slice(0, 80) : "";
  const pattern = `%${search}%`;
  return prisma.$queryRaw<TavernLibrarySqlRow[]>(Prisma.sql`
    WITH copies AS (
      SELECT ulg."gameId", COUNT(*)::int AS "copyCount"
      FROM "TavernGroupMember" member
      JOIN "UserLibraryGame" ulg
        ON ulg."userId" = member."userId" AND ulg."owned" = true
      WHERE member."tavernId" = ${tavernId}
      GROUP BY ulg."gameId"
    ), page_games AS (
      SELECT
        game.id AS "gameId",
        COALESCE(NULLIF(game.title, ''), game.name) AS title,
        game.slug,
        game."coverImageUrl",
        copies."copyCount",
        lower(COALESCE(NULLIF(game.title, ''), game.name)) AS "sortTitle"
      FROM copies
      JOIN "Game" game ON game.id = copies."gameId"
      WHERE game.status = ${GameStatus.published}::"GameStatus"
        AND (${search} = '' OR game.title ILIKE ${pattern} OR game.name ILIKE ${pattern})
      ORDER BY lower(COALESCE(NULLIF(game.title, ''), game.name)) ASC, game.id ASC
      LIMIT ${pagination.take}
      OFFSET ${pagination.skip}
    )
    SELECT
      page_games."gameId",
      page_games.title,
      page_games.slug,
      page_games."coverImageUrl",
      page_games."copyCount",
      COALESCE(play_stats."playCount", 0)::int AS "playCount",
      play_stats."lastPlayedAt",
      COALESCE(owner_names."ownerNames", ARRAY[]::text[]) AS "ownerNames"
    FROM page_games
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS "playCount", MAX(play."playedAt") AS "lastPlayedAt"
      FROM "TavernGroupPlay" play
      WHERE play."tavernId" = ${tavernId}
        AND play."gameId" = page_games."gameId"
    ) play_stats ON true
    LEFT JOIN LATERAL (
      SELECT ARRAY_AGG(owner_rows."ownerName" ORDER BY owner_rows."updatedAt" DESC, owner_rows.id DESC) AS "ownerNames"
      FROM (
        SELECT
          COALESCE(
            NULLIF(profile."displayName", ''),
            NULLIF(owner_user."displayName", ''),
            profile.username,
            'Usuario'
          ) AS "ownerName",
          owner_library."updatedAt",
          owner_library.id
        FROM "TavernGroupMember" owner_member
        JOIN "UserLibraryGame" owner_library
          ON owner_library."userId" = owner_member."userId"
          AND owner_library."owned" = true
          AND owner_library."gameId" = page_games."gameId"
        JOIN "User" owner_user ON owner_user.id = owner_member."userId"
        LEFT JOIN "UserProfile" profile ON profile."userId" = owner_user.id
        WHERE owner_member."tavernId" = ${tavernId}
        ORDER BY owner_library."updatedAt" DESC, owner_library.id DESC
        LIMIT 2
      ) owner_rows
    ) owner_names ON true
    ORDER BY page_games."sortTitle" ASC, page_games."gameId" ASC
  `);
}

function mapTavernLibraryRows(rows: TavernLibrarySqlRow[]) {
  return rows.map((row) => ({
    gameId: row.gameId,
    title: row.title,
    slug: row.slug,
    coverImageUrl: row.coverImageUrl,
    copyCount: row.copyCount,
    playCount: row.playCount,
    lastPlayedAt: row.lastPlayedAt?.toISOString().slice(0, 10) || null,
    owners: (row.ownerNames || []).map((displayName) => ({ displayName }))
  }));
}

export async function getTavernGroupLibraryPreviewForMember(tavernId: string, searchValue?: string | null) {
  return getTavernGroupLibraryForMember(tavernId, searchValue);
}

type TavernPlayFormOptionRow = {
  sortGroup: number;
  sortKey: string;
  stableId: string;
  kind: "game" | "member";
  gameId: string | null;
  title: string | null;
  slug: string | null;
  copyCount: number | null;
  userId: string | null;
  username: string | null;
  displayName: string | null;
};

export async function getTavernGroupPlayFormOptionsForMember(tavernId: string) {
  const rows = await prisma.$queryRaw<TavernPlayFormOptionRow[]>(Prisma.sql`
    WITH game_options AS (
      SELECT
        game.id AS "gameId",
        COALESCE(NULLIF(game.title, ''), game.name) AS title,
        game.slug,
        COUNT(*)::int AS "copyCount"
      FROM "TavernGroupMember" member
      JOIN "UserLibraryGame" ulg
        ON ulg."userId" = member."userId" AND ulg."owned" = true
      JOIN "Game" game
        ON game.id = ulg."gameId" AND game.status = ${GameStatus.published}::"GameStatus"
      WHERE member."tavernId" = ${tavernId}
      GROUP BY game.id, game.title, game.name, game.slug
      ORDER BY lower(COALESCE(NULLIF(game.title, ''), game.name)) ASC, game.id ASC
      LIMIT ${MAX_TAVERN_PLAY_OPTIONS}
    ), member_options AS (
      SELECT
        app_user.id AS "userId",
        COALESCE(profile.username, 'usuario') AS username,
        COALESCE(
          NULLIF(profile."displayName", ''),
          NULLIF(app_user."displayName", ''),
          profile.username,
          'Usuario'
        ) AS "displayName"
      FROM "TavernGroupMember" member
      JOIN "User" app_user ON app_user.id = member."userId"
      LEFT JOIN "UserProfile" profile ON profile."userId" = app_user.id
      WHERE member."tavernId" = ${tavernId}
      ORDER BY lower(COALESCE(NULLIF(profile."displayName", ''), NULLIF(app_user."displayName", ''), profile.username, 'Usuario')) ASC,
        app_user.id ASC
      LIMIT ${MAX_TAVERN_MEMBERS}
    )
    SELECT
      0::int AS "sortGroup",
      lower(game_options.title) AS "sortKey",
      game_options."gameId" AS "stableId",
      'game'::text AS kind,
      game_options."gameId",
      game_options.title,
      game_options.slug,
      game_options."copyCount",
      NULL::text AS "userId",
      NULL::text AS username,
      NULL::text AS "displayName"
    FROM game_options
    UNION ALL
    SELECT
      1::int AS "sortGroup",
      lower(member_options."displayName") AS "sortKey",
      member_options."userId" AS "stableId",
      'member'::text AS kind,
      NULL::text AS "gameId",
      NULL::text AS title,
      NULL::text AS slug,
      NULL::int AS "copyCount",
      member_options."userId",
      member_options.username,
      member_options."displayName"
    FROM member_options
    ORDER BY "sortGroup" ASC, "sortKey" ASC, "stableId" ASC
  `);

  return {
    games: rows.flatMap((row) => row.kind === "game" && row.gameId && row.title && row.slug
      ? [{ gameId: row.gameId, title: row.title, slug: row.slug, copyCount: row.copyCount || 0 }]
      : []),
    members: rows.flatMap((row) => row.kind === "member" && row.userId && row.username && row.displayName
      ? [{ user: { id: row.userId, username: row.username, displayName: row.displayName } }]
      : [])
  };
}

type TavernMembersPageRow = {
  kind: "member" | "invitation";
  currentRole: TavernMemberRole;
  memberId: string | null;
  memberRole: TavernMemberRole | null;
  joinedAt: Date | null;
  invitationId: string | null;
  expiresAt: Date | null;
  userId: string;
  username: string;
  displayName: string;
};

/**
 * Loads the members page in one authorized round trip. The actor CTE is the
 * data boundary: non-members produce no rows, and invitations are read only
 * when the database-confirmed role is ADMIN.
 */
export async function getTavernGroupMembersPageData(userId: string, tavernId: string) {
  const now = new Date();
  const rows = await prisma.$queryRaw<TavernMembersPageRow[]>(Prisma.sql`
    WITH actor AS (
      SELECT membership.role
      FROM "TavernGroupMember" membership
      WHERE membership."tavernId" = ${tavernId}
        AND membership."userId" = ${userId}
      LIMIT 1
    ), member_rows AS (
      SELECT
        0::int AS "sortGroup",
        CASE WHEN member.role = ${TavernMemberRole.ADMIN}::"TavernMemberRole" THEN 0 ELSE 1 END AS "sortRole",
        member."joinedAt" AS "sortAt",
        member.id AS "stableId",
        'member'::text AS kind,
        actor.role::text AS "currentRole",
        member.id AS "memberId",
        member.role::text AS "memberRole",
        member."joinedAt",
        NULL::text AS "invitationId",
        NULL::timestamp AS "expiresAt",
        app_user.id AS "userId",
        COALESCE(profile.username, 'usuario') AS username,
        COALESCE(
          NULLIF(profile."displayName", ''),
          NULLIF(app_user."displayName", ''),
          profile.username,
          'Usuario'
        ) AS "displayName"
      FROM actor
      JOIN LATERAL (
        SELECT selected_member.*
        FROM "TavernGroupMember" selected_member
        WHERE selected_member."tavernId" = ${tavernId}
        ORDER BY selected_member.role ASC, selected_member."joinedAt" ASC, selected_member.id ASC
        LIMIT ${MAX_TAVERN_MEMBERS}
      ) member ON true
      JOIN "User" app_user ON app_user.id = member."userId"
      LEFT JOIN "UserProfile" profile ON profile."userId" = app_user.id
    ), invitation_rows AS (
      SELECT
        1::int AS "sortGroup",
        0::int AS "sortRole",
        invitation."createdAt" AS "sortAt",
        invitation.id AS "stableId",
        'invitation'::text AS kind,
        actor.role::text AS "currentRole",
        NULL::text AS "memberId",
        NULL::text AS "memberRole",
        NULL::timestamp AS "joinedAt",
        invitation.id AS "invitationId",
        invitation."expiresAt",
        target_user.id AS "userId",
        COALESCE(target_profile.username, 'usuario') AS username,
        COALESCE(
          NULLIF(target_profile."displayName", ''),
          NULLIF(target_user."displayName", ''),
          target_profile.username,
          'Usuario'
        ) AS "displayName"
      FROM actor
      JOIN LATERAL (
        SELECT pending.*
        FROM "TavernGroupInvitation" pending
        WHERE actor.role = ${TavernMemberRole.ADMIN}::"TavernMemberRole"
          AND pending."tavernId" = ${tavernId}
          AND pending.status = ${TavernInvitationStatus.PENDING}::"TavernInvitationStatus"
          AND pending."expiresAt" > ${now}
        ORDER BY pending."createdAt" DESC, pending.id DESC
        LIMIT ${MAX_PENDING_TAVERN_INVITATIONS}
      ) invitation ON true
      JOIN "User" target_user ON target_user.id = invitation."targetUserId"
      LEFT JOIN "UserProfile" target_profile ON target_profile."userId" = target_user.id
    )
    SELECT * FROM (
      SELECT * FROM member_rows
      UNION ALL
      SELECT * FROM invitation_rows
    ) combined_rows
    ORDER BY
      "sortGroup" ASC,
      "sortRole" ASC,
      CASE WHEN "sortGroup" = 0 THEN "sortAt" END ASC,
      CASE WHEN "sortGroup" = 1 THEN "sortAt" END DESC,
      "stableId" ASC
  `);

  const currentRole = rows[0]?.currentRole;
  if (!currentRole) {
    throw new TavernGroupError("La taberna no existe.", 404, "TAVERN_NOT_FOUND");
  }

  return {
    currentRole,
    members: rows.flatMap((row) => row.kind === "member" && row.memberId && row.memberRole && row.joinedAt
      ? [{
          id: row.memberId,
          role: row.memberRole,
          joinedAt: row.joinedAt.toISOString(),
          user: { id: row.userId, username: row.username, displayName: row.displayName }
        }]
      : []),
    invitations: rows.flatMap((row) => row.kind === "invitation" && row.invitationId && row.expiresAt
      ? [{
          id: row.invitationId,
          expiresAt: row.expiresAt.toISOString(),
          user: { id: row.userId, username: row.username, displayName: row.displayName }
        }]
      : [])
  };
}

export async function getTavernGroupMembers(userId: string, tavernId: string) {
  const membership = await requireTavernMembership(userId, tavernId);
  return getTavernGroupMembersForMember(tavernId, membership.role, { includeInvitations: true });
}

export async function getTavernGroupMembersForMember(
  tavernId: string,
  currentRole: TavernRole,
  options: { includeInvitations?: boolean } = {}
) {
  const [members, invitations] = await Promise.all([
    prisma.tavernGroupMember.findMany({
      where: { tavernId },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        role: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            displayName: true,
            profile: { select: { username: true, displayName: true } }
          }
        }
      }
    }),
    options.includeInvitations !== false && currentRole === TavernMemberRole.ADMIN
      ? prisma.tavernGroupInvitation.findMany({
          where: {
            tavernId,
            status: TavernInvitationStatus.PENDING,
            expiresAt: { gt: new Date() }
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: {
            id: true,
            expiresAt: true,
            targetUser: {
              select: {
                id: true,
                displayName: true,
                profile: { select: { username: true, displayName: true } }
              }
            }
          }
        })
      : Promise.resolve([])
  ]);

  return {
    currentRole,
    members: members.map((member) => ({
      id: member.id,
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
      user: publicUser(member.user)
    })),
    invitations: invitations.map((invitation) => ({
      id: invitation.id,
      expiresAt: invitation.expiresAt.toISOString(),
      user: publicUser(invitation.targetUser)
    }))
  };
}

export async function inviteTavernGroupMember(
  actorUserId: string,
  tavernId: string,
  input: { username: unknown }
) {
  await requireTavernMembership(actorUserId, tavernId, TavernMemberRole.ADMIN);
  const username = normalizeTavernUsername(input.username);
  if (username.length < 3) {
    throw new TavernGroupError("Escribe un nombre de usuario válido.", 400, "INVALID_USERNAME");
  }

  const targetProfile = await prisma.userProfile.findUnique({
    where: { username },
    select: {
      userId: true,
      user: {
        select: {
          id: true,
          displayName: true,
          profile: { select: { username: true, displayName: true } }
        }
      }
    }
  });
  if (!targetProfile) {
    throw new TavernGroupError("No encontramos ese usuario.", 404, "USER_NOT_FOUND");
  }
  if (targetProfile.userId === actorUserId) {
    throw new TavernGroupError("Ya formas parte de esta taberna.", 409, "ALREADY_MEMBER");
  }

  const invitation = await serializedTavernMutation(tavernId, async (tx) => {
    const [actor, memberCount, existingMember, pendingCount, existingInvitation] = await Promise.all([
      tx.tavernGroupMember.findUnique({
        where: { tavernId_userId: { tavernId, userId: actorUserId } },
        select: { role: true }
      }),
      tx.tavernGroupMember.count({ where: { tavernId } }),
      tx.tavernGroupMember.findUnique({
        where: { tavernId_userId: { tavernId, userId: targetProfile.userId } },
        select: { id: true }
      }),
      tx.tavernGroupInvitation.count({
        where: { tavernId, status: TavernInvitationStatus.PENDING, expiresAt: { gt: new Date() } }
      }),
      tx.tavernGroupInvitation.findFirst({
        where: {
          tavernId,
          targetUserId: targetProfile.userId,
          status: TavernInvitationStatus.PENDING
        },
        select: { id: true, expiresAt: true }
      })
    ]);
    if (actor?.role !== TavernMemberRole.ADMIN) {
      throw new TavernGroupError("No tienes permiso para invitar miembros.", 403, "ADMIN_REQUIRED");
    }
    if (existingMember) {
      throw new TavernGroupError("Ese usuario ya es miembro.", 409, "ALREADY_MEMBER");
    }
    if (existingInvitation && existingInvitation.expiresAt > new Date()) {
      throw new TavernGroupError("Ese usuario ya tiene una invitación pendiente.", 409, "INVITE_PENDING");
    }
    if (memberCount >= MAX_TAVERN_MEMBERS || pendingCount >= MAX_PENDING_TAVERN_INVITATIONS) {
      throw new TavernGroupError("La taberna ha alcanzado su límite de miembros o invitaciones.", 409, "MEMBER_LIMIT");
    }

    if (existingInvitation) {
      await tx.tavernGroupInvitation.update({
        where: { id: existingInvitation.id },
        data: { status: TavernInvitationStatus.EXPIRED, respondedAt: new Date() }
      });
    }
    return tx.tavernGroupInvitation.create({
      data: {
        tavernId,
        targetUserId: targetProfile.userId,
        invitedByUserId: actorUserId,
        expiresAt: new Date(Date.now() + TAVERN_INVITATION_DAYS * 24 * 60 * 60 * 1000)
      },
      select: { id: true, expiresAt: true }
    });
  });

  return { ...invitation, user: publicUser(targetProfile.user) };
}

export async function respondToTavernInvitation(
  userId: string,
  invitationId: string,
  response: "accept" | "decline"
) {
  const now = new Date();
  const availableInvitation = await prisma.tavernGroupInvitation.findFirst({
    where: { id: invitationId, targetUserId: userId, status: TavernInvitationStatus.PENDING },
    select: { id: true, tavernId: true, expiresAt: true }
  });
  if (!availableInvitation) {
    throw new TavernGroupError("La invitación ya no está disponible.", 409, "INVITE_UNAVAILABLE");
  }
  if (availableInvitation.expiresAt <= now) {
    await prisma.tavernGroupInvitation.updateMany({
      where: { id: availableInvitation.id, targetUserId: userId, status: TavernInvitationStatus.PENDING },
      data: { status: TavernInvitationStatus.EXPIRED, respondedAt: now }
    });
    throw new TavernGroupError("La invitación ha caducado.", 410, "INVITE_EXPIRED");
  }

  return serializedTavernMutation(availableInvitation.tavernId, async (tx) => {
    const invitation = await tx.tavernGroupInvitation.findFirst({
      where: { id: invitationId, targetUserId: userId, status: TavernInvitationStatus.PENDING },
      select: { id: true, tavernId: true, expiresAt: true }
    });
    if (!invitation) {
      throw new TavernGroupError("La invitación ya no está disponible.", 409, "INVITE_UNAVAILABLE");
    }
    if (invitation.expiresAt <= now) {
      throw new TavernGroupError("La invitación ha caducado.", 410, "INVITE_EXPIRED");
    }
    if (response === "accept") {
      const [memberCount, existingMember] = await Promise.all([
        tx.tavernGroupMember.count({ where: { tavernId: invitation.tavernId } }),
        tx.tavernGroupMember.findUnique({
          where: { tavernId_userId: { tavernId: invitation.tavernId, userId } },
          select: { id: true }
        })
      ]);
      if (!existingMember && memberCount >= MAX_TAVERN_MEMBERS) {
        throw new TavernGroupError("La taberna ya ha alcanzado su límite de miembros.", 409, "MEMBER_LIMIT");
      }
    }
    const claimed = await tx.tavernGroupInvitation.updateMany({
      where: { id: invitation.id, targetUserId: userId, status: TavernInvitationStatus.PENDING },
      data: {
        status: response === "accept" ? TavernInvitationStatus.ACCEPTED : TavernInvitationStatus.DECLINED,
        respondedAt: now
      }
    });
    if (!claimed.count) {
      throw new TavernGroupError("La invitación ya se había respondido.", 409, "INVITE_UNAVAILABLE");
    }
    if (response === "decline") return { accepted: false, tavernId: invitation.tavernId };

    await tx.tavernGroupMember.upsert({
      where: { tavernId_userId: { tavernId: invitation.tavernId, userId } },
      update: {},
      create: { tavernId: invitation.tavernId, userId, role: TavernMemberRole.MEMBER }
    });
    return { accepted: true, tavernId: invitation.tavernId };
  });
}

export async function revokeTavernInvitation(actorUserId: string, tavernId: string, invitationId: string) {
  return serializedTavernMutation(tavernId, async (tx) => {
    const actor = await tx.tavernGroupMember.findUnique({
      where: { tavernId_userId: { tavernId, userId: actorUserId } },
      select: { role: true }
    });
    if (actor?.role !== TavernMemberRole.ADMIN) {
      throw new TavernGroupError("No tienes permiso para revocar invitaciones.", 403, "ADMIN_REQUIRED");
    }
    const result = await tx.tavernGroupInvitation.updateMany({
      where: { id: invitationId, tavernId, status: TavernInvitationStatus.PENDING },
      data: { status: TavernInvitationStatus.REVOKED, respondedAt: new Date() }
    });
    if (!result.count) {
      throw new TavernGroupError("La invitación ya no está pendiente.", 404, "INVITE_NOT_FOUND");
    }
  });
}

async function serializedTavernMutation<T>(
  tavernId: string,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  attempt = 0
): Promise<T> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT id FROM "TavernGroup" WHERE id = ${tavernId} FOR UPDATE`);
        return operation(tx);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    if (attempt < 1 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return serializedTavernMutation(tavernId, operation, attempt + 1);
    }
    throw error;
  }
}

export async function updateTavernMemberRole(
  actorUserId: string,
  tavernId: string,
  memberId: string,
  roleValue: unknown
) {
  const nextRole = parseTavernRole(roleValue);
  return serializedTavernMutation(tavernId, async (tx) => {
    const actor = await tx.tavernGroupMember.findUnique({
      where: { tavernId_userId: { tavernId, userId: actorUserId } },
      select: { role: true }
    });
    if (actor?.role !== TavernMemberRole.ADMIN) {
      throw new TavernGroupError("No tienes permiso para cambiar roles.", 403, "ADMIN_REQUIRED");
    }
    const target = await tx.tavernGroupMember.findFirst({
      where: { id: memberId, tavernId },
      select: { id: true, role: true }
    });
    if (!target) throw new TavernGroupError("El miembro no existe.", 404, "MEMBER_NOT_FOUND");
    if (target.role === TavernMemberRole.ADMIN && nextRole === TavernMemberRole.MEMBER) {
      const adminCount = await tx.tavernGroupMember.count({ where: { tavernId, role: TavernMemberRole.ADMIN } });
      if (adminCount <= 1) {
        throw new TavernGroupError("La taberna debe conservar al menos un administrador.", 409, "LAST_ADMIN");
      }
    }
    return tx.tavernGroupMember.update({ where: { id: target.id }, data: { role: nextRole } });
  });
}

export async function removeTavernMember(actorUserId: string, tavernId: string, memberId: string) {
  return serializedTavernMutation(tavernId, async (tx) => {
    const actor = await tx.tavernGroupMember.findUnique({
      where: { tavernId_userId: { tavernId, userId: actorUserId } },
      select: { role: true }
    });
    if (actor?.role !== TavernMemberRole.ADMIN) {
      throw new TavernGroupError("No tienes permiso para eliminar miembros.", 403, "ADMIN_REQUIRED");
    }
    const target = await tx.tavernGroupMember.findFirst({
      where: { id: memberId, tavernId },
      select: { id: true, role: true }
    });
    if (!target) throw new TavernGroupError("El miembro no existe.", 404, "MEMBER_NOT_FOUND");
    if (target.role === TavernMemberRole.ADMIN) {
      const adminCount = await tx.tavernGroupMember.count({ where: { tavernId, role: TavernMemberRole.ADMIN } });
      if (adminCount <= 1) {
        throw new TavernGroupError("La taberna debe conservar al menos un administrador.", 409, "LAST_ADMIN");
      }
    }
    await tx.tavernGroupMember.delete({ where: { id: target.id } });
    return { ok: true };
  });
}

export async function leaveTavernGroup(userId: string, tavernId: string) {
  return serializedTavernMutation(tavernId, async (tx) => {
    const membership = await tx.tavernGroupMember.findUnique({
      where: { tavernId_userId: { tavernId, userId } },
      select: { id: true, role: true }
    });
    if (!membership) throw new TavernGroupError("La taberna no existe.", 404, "TAVERN_NOT_FOUND");
    if (membership.role === TavernMemberRole.ADMIN) {
      const adminCount = await tx.tavernGroupMember.count({ where: { tavernId, role: TavernMemberRole.ADMIN } });
      if (adminCount <= 1) {
        throw new TavernGroupError("Nombra a otro administrador antes de salir.", 409, "LAST_ADMIN");
      }
    }
    await tx.tavernGroupMember.delete({ where: { id: membership.id } });
    return { ok: true };
  });
}

function parsePlayedAt(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new TavernGroupError("La fecha de la partida no es válida.", 400, "INVALID_DATE");
  }
  const date = new Date(`${raw}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) {
    throw new TavernGroupError("La fecha de la partida no es válida.", 400, "INVALID_DATE");
  }
  if (date.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    throw new TavernGroupError("La partida no puede estar en el futuro.", 400, "INVALID_DATE");
  }
  return date;
}

export async function createTavernGroupPlay(
  userId: string,
  tavernId: string,
  input: { gameId: unknown; playedAt: unknown; participantUserIds: unknown }
) {
  await requireTavernMembership(userId, tavernId);
  const gameId = typeof input.gameId === "string" ? input.gameId.trim() : "";
  if (!gameId) throw new TavernGroupError("Selecciona un juego.", 400, "GAME_REQUIRED");
  const participantUserIds = Array.isArray(input.participantUserIds)
    ? [...new Set(input.participantUserIds.filter((id): id is string => typeof id === "string" && Boolean(id.trim())).map((id) => id.trim()))]
    : [];
  if (!participantUserIds.length || participantUserIds.length > MAX_TAVERN_MEMBERS) {
    throw new TavernGroupError("Selecciona al menos un participante válido.", 400, "PARTICIPANTS_REQUIRED");
  }
  const playedAt = parsePlayedAt(input.playedAt);

  return serializedTavernMutation(tavernId, async (tx) => {
    const [actorMembership, game, participantCount] = await Promise.all([
      tx.tavernGroupMember.findUnique({
        where: { tavernId_userId: { tavernId, userId } },
        select: { id: true }
      }),
      tx.game.findFirst({
        where: {
          id: gameId,
          status: GameStatus.published,
          libraryEntries: {
            some: {
              owned: true,
              user: { tavernGroupMemberships: { some: { tavernId } } }
            }
          }
        },
        select: { id: true, title: true, name: true, slug: true }
      }),
      tx.tavernGroupMember.count({
        where: { tavernId, userId: { in: participantUserIds } }
      })
    ]);
    if (!actorMembership) {
      throw new TavernGroupError("La taberna no existe.", 404, "TAVERN_NOT_FOUND");
    }
    if (!game) {
      throw new TavernGroupError("El juego ya no está en la ludoteca de la taberna.", 409, "GAME_NOT_IN_LIBRARY");
    }
    if (participantCount !== participantUserIds.length) {
      throw new TavernGroupError("Todos los participantes deben ser miembros actuales.", 409, "INVALID_PARTICIPANT");
    }

    return tx.tavernGroupPlay.create({
      data: {
        tavernId,
        gameId: game.id,
        gameTitleSnapshot: game.title.trim() || game.name,
        gameSlugSnapshot: game.slug,
        recordedByUserId: userId,
        playedAt,
        participants: { create: participantUserIds.map((participantUserId) => ({ userId: participantUserId })) }
      },
      select: { id: true, playedAt: true }
    });
  });
}

export async function getTavernGroupPlays(userId: string, tavernId: string, gameId?: string | null) {
  const membership = await requireTavernMembership(userId, tavernId);
  return getTavernGroupPlaysForMember(userId, tavernId, membership.role, gameId);
}

export async function getTavernGroupPlaysForMember(
  userId: string,
  tavernId: string,
  currentRole: TavernRole,
  gameId?: string | null
) {
  const plays = await prisma.tavernGroupPlay.findMany({
    where: { tavernId, ...(gameId ? { gameId } : {}) },
    orderBy: [{ playedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    take: MAX_TAVERN_PLAYS,
    select: {
      id: true,
      gameId: true,
      gameTitleSnapshot: true,
      gameSlugSnapshot: true,
      playedAt: true,
      createdAt: true,
      recordedByUserId: true,
      game: { select: { slug: true, title: true, name: true } },
      recordedByUser: {
        select: {
          id: true,
          displayName: true,
          profile: { select: { username: true, displayName: true } }
        }
      },
      participants: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          user: {
            select: {
              id: true,
              displayName: true,
              profile: { select: { username: true, displayName: true } }
            }
          }
        }
      }
    }
  });

  return {
    currentRole,
    items: plays.map((play) => ({
      id: play.id,
      gameId: play.gameId,
      title: play.game ? play.game.title.trim() || play.game.name : play.gameTitleSnapshot,
      slug: play.game?.slug || play.gameSlugSnapshot,
      playedAt: play.playedAt.toISOString().slice(0, 10),
      createdAt: play.createdAt.toISOString(),
      recordedByUserId: play.recordedByUserId,
      recordedBy: play.recordedByUser ? publicUser(play.recordedByUser) : null,
      canDelete: canEditTavernPlay({
        actorUserId: userId,
        actorRole: currentRole,
        recordedByUserId: play.recordedByUserId
      }),
      participants: play.participants.map((participant) =>
        participant.user ? publicUser(participant.user) : { id: participant.id, username: "", displayName: "Usuario eliminado" }
      )
    }))
  };
}

export async function getTavernGroupPlayHistoryForMember(
  userId: string,
  tavernId: string,
  currentRole: TavernRole,
  pageValue?: unknown
) {
  const page = normalizeTavernPage(pageValue);
  const plays = await prisma.tavernGroupPlay.findMany({
    where: { tavernId },
    orderBy: [{ playedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    take: TAVERN_PLAYS_PAGE_SIZE + 1,
    skip: (page - 1) * TAVERN_PLAYS_PAGE_SIZE,
    select: {
      id: true,
      gameTitleSnapshot: true,
      gameSlugSnapshot: true,
      playedAt: true,
      recordedByUserId: true,
      game: { select: { slug: true, title: true, name: true } },
      recordedByUser: {
        select: {
          id: true,
          displayName: true,
          profile: { select: { username: true, displayName: true } }
        }
      },
      participants: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          user: {
            select: {
              id: true,
              displayName: true,
              profile: { select: { username: true, displayName: true } }
            }
          }
        }
      }
    }
  });

  return {
    items: plays.slice(0, TAVERN_PLAYS_PAGE_SIZE).map((play) => ({
      id: play.id,
      title: play.game ? play.game.title.trim() || play.game.name : play.gameTitleSnapshot,
      slug: play.game?.slug || play.gameSlugSnapshot,
      playedAt: play.playedAt.toISOString().slice(0, 10),
      recordedBy: play.recordedByUser ? publicUser(play.recordedByUser) : null,
      canDelete: canEditTavernPlay({
        actorUserId: userId,
        actorRole: currentRole,
        recordedByUserId: play.recordedByUserId
      }),
      participants: play.participants.map((participant) =>
        participant.user ? publicUser(participant.user) : { id: participant.id, username: "", displayName: "Usuario eliminado" }
      )
    })),
    page,
    hasNext: plays.length > TAVERN_PLAYS_PAGE_SIZE
  };
}

type TavernPlaysPageRow = {
  kind: "game" | "member" | "play" | "participant";
  currentRole: TavernMemberRole;
  position: number;
  parentPosition: number | null;
  gameId: string | null;
  title: string | null;
  slug: string | null;
  copyCount: number | null;
  memberUserId: string | null;
  memberUsername: string | null;
  memberDisplayName: string | null;
  playId: string | null;
  playedAt: Date | null;
  recordedByUserId: string | null;
  recordedByUsername: string | null;
  recordedByDisplayName: string | null;
  canDelete: boolean | null;
  participantId: string | null;
  participantUserId: string | null;
  participantUsername: string | null;
  participantDisplayName: string | null;
};

/**
 * Loads options and the bounded play history in one authorized round trip.
 * Every branch starts from actor, so a guessed tavern id cannot read private
 * members, games or plays before membership has been established.
 */
export async function getTavernGroupPlaysPageData(
  userId: string,
  tavernId: string,
  pageValue?: unknown
) {
  const page = normalizeTavernPage(pageValue);
  const rows = await prisma.$queryRaw<TavernPlaysPageRow[]>(Prisma.sql`
    WITH actor AS (
      SELECT membership.role
      FROM "TavernGroupMember" membership
      WHERE membership."tavernId" = ${tavernId}
        AND membership."userId" = ${userId}
      LIMIT 1
    ), game_option_base AS (
      SELECT
        actor.role::text AS "currentRole",
        game.id AS "gameId",
        COALESCE(NULLIF(game.title, ''), game.name) AS title,
        game.slug,
        COUNT(*)::int AS "copyCount",
        lower(COALESCE(NULLIF(game.title, ''), game.name)) AS "sortTitle"
      FROM actor
      JOIN "TavernGroupMember" member ON member."tavernId" = ${tavernId}
      JOIN "UserLibraryGame" library
        ON library."userId" = member."userId" AND library."owned" = true
      JOIN "Game" game
        ON game.id = library."gameId" AND game.status = ${GameStatus.published}::"GameStatus"
      GROUP BY actor.role, game.id, game.title, game.name, game.slug
      ORDER BY lower(COALESCE(NULLIF(game.title, ''), game.name)) ASC, game.id ASC
      LIMIT ${MAX_TAVERN_PLAY_OPTIONS}
    ), game_options AS (
      SELECT
        game_option_base.*,
        (ROW_NUMBER() OVER (ORDER BY "sortTitle" ASC, "gameId" ASC))::int AS position
      FROM game_option_base
    ), member_option_base AS (
      SELECT
        actor.role::text AS "currentRole",
        app_user.id AS "memberUserId",
        COALESCE(profile.username, 'usuario') AS "memberUsername",
        COALESCE(
          NULLIF(profile."displayName", ''),
          NULLIF(app_user."displayName", ''),
          profile.username,
          'Usuario'
        ) AS "memberDisplayName"
      FROM actor
      JOIN "TavernGroupMember" member ON member."tavernId" = ${tavernId}
      JOIN "User" app_user ON app_user.id = member."userId"
      LEFT JOIN "UserProfile" profile ON profile."userId" = app_user.id
      ORDER BY lower(COALESCE(NULLIF(profile."displayName", ''), NULLIF(app_user."displayName", ''), profile.username, 'Usuario')) ASC,
        app_user.id ASC
      LIMIT ${MAX_TAVERN_MEMBERS}
    ), member_options AS (
      SELECT
        member_option_base.*,
        (ROW_NUMBER() OVER (ORDER BY lower("memberDisplayName") ASC, "memberUserId" ASC))::int AS position
      FROM member_option_base
    ), play_base AS (
      SELECT
        actor.role::text AS "currentRole",
        play.id AS "playId",
        COALESCE(NULLIF(game.title, ''), NULLIF(game.name, ''), play."gameTitleSnapshot") AS title,
        COALESCE(game.slug, play."gameSlugSnapshot") AS slug,
        play."playedAt",
        play."createdAt" AS "sortCreatedAt",
        play."recordedByUserId",
        CASE WHEN recorded_by.id IS NULL THEN NULL ELSE COALESCE(recorded_profile.username, 'usuario') END AS "recordedByUsername",
        CASE WHEN recorded_by.id IS NULL THEN NULL ELSE COALESCE(
          NULLIF(recorded_profile."displayName", ''),
          NULLIF(recorded_by."displayName", ''),
          recorded_profile.username,
          'Usuario'
        ) END AS "recordedByDisplayName",
        (actor.role = ${TavernMemberRole.ADMIN}::"TavernMemberRole" OR play."recordedByUserId" = ${userId}) AS "canDelete"
      FROM actor
      JOIN "TavernGroupPlay" play ON play."tavernId" = ${tavernId}
      LEFT JOIN "Game" game ON game.id = play."gameId"
      LEFT JOIN "User" recorded_by ON recorded_by.id = play."recordedByUserId"
      LEFT JOIN "UserProfile" recorded_profile ON recorded_profile."userId" = recorded_by.id
      ORDER BY play."playedAt" DESC, play."createdAt" DESC, play.id DESC
      LIMIT ${TAVERN_PLAYS_PAGE_SIZE + 1}
      OFFSET ${(page - 1) * TAVERN_PLAYS_PAGE_SIZE}
    ), plays AS (
      SELECT
        play_base.*,
        (ROW_NUMBER() OVER (ORDER BY "playedAt" DESC, "sortCreatedAt" DESC, "playId" DESC))::int AS position
      FROM play_base
    ), play_participants AS (
      SELECT
        plays."currentRole",
        plays.position AS "parentPosition",
        (ROW_NUMBER() OVER (
          PARTITION BY participant."playId"
          ORDER BY participant."createdAt" ASC, participant.id ASC
        ))::int AS position,
        plays."playId",
        participant.id AS "participantId",
        participant_user.id AS "participantUserId",
        CASE WHEN participant_user.id IS NULL THEN NULL ELSE COALESCE(participant_profile.username, 'usuario') END AS "participantUsername",
        CASE WHEN participant_user.id IS NULL THEN NULL ELSE COALESCE(
          NULLIF(participant_profile."displayName", ''),
          NULLIF(participant_user."displayName", ''),
          participant_profile.username,
          'Usuario'
        ) END AS "participantDisplayName"
      FROM plays
      JOIN "TavernGroupPlayParticipant" participant ON participant."playId" = plays."playId"
      LEFT JOIN "User" participant_user ON participant_user.id = participant."userId"
      LEFT JOIN "UserProfile" participant_profile ON participant_profile."userId" = participant_user.id
    )
    SELECT
      0::int AS "sortGroup",
      game_options.position,
      NULL::int AS "parentPosition",
      'game'::text AS kind,
      game_options."currentRole",
      game_options."gameId",
      game_options.title,
      game_options.slug,
      game_options."copyCount",
      NULL::text AS "memberUserId",
      NULL::text AS "memberUsername",
      NULL::text AS "memberDisplayName",
      NULL::text AS "playId",
      NULL::date AS "playedAt",
      NULL::text AS "recordedByUserId",
      NULL::text AS "recordedByUsername",
      NULL::text AS "recordedByDisplayName",
      NULL::boolean AS "canDelete",
      NULL::text AS "participantId",
      NULL::text AS "participantUserId",
      NULL::text AS "participantUsername",
      NULL::text AS "participantDisplayName"
    FROM game_options
    UNION ALL
    SELECT
      1::int AS "sortGroup",
      member_options.position,
      NULL::int AS "parentPosition",
      'member'::text AS kind,
      member_options."currentRole",
      NULL::text AS "gameId",
      NULL::text AS title,
      NULL::text AS slug,
      NULL::int AS "copyCount",
      member_options."memberUserId",
      member_options."memberUsername",
      member_options."memberDisplayName",
      NULL::text AS "playId",
      NULL::date AS "playedAt",
      NULL::text AS "recordedByUserId",
      NULL::text AS "recordedByUsername",
      NULL::text AS "recordedByDisplayName",
      NULL::boolean AS "canDelete",
      NULL::text AS "participantId",
      NULL::text AS "participantUserId",
      NULL::text AS "participantUsername",
      NULL::text AS "participantDisplayName"
    FROM member_options
    UNION ALL
    SELECT
      2::int AS "sortGroup",
      plays.position,
      NULL::int AS "parentPosition",
      'play'::text AS kind,
      plays."currentRole",
      NULL::text AS "gameId",
      plays.title,
      plays.slug,
      NULL::int AS "copyCount",
      NULL::text AS "memberUserId",
      NULL::text AS "memberUsername",
      NULL::text AS "memberDisplayName",
      plays."playId",
      plays."playedAt",
      plays."recordedByUserId",
      plays."recordedByUsername",
      plays."recordedByDisplayName",
      plays."canDelete",
      NULL::text AS "participantId",
      NULL::text AS "participantUserId",
      NULL::text AS "participantUsername",
      NULL::text AS "participantDisplayName"
    FROM plays
    UNION ALL
    SELECT
      3::int AS "sortGroup",
      play_participants.position,
      play_participants."parentPosition",
      'participant'::text AS kind,
      play_participants."currentRole",
      NULL::text AS "gameId",
      NULL::text AS title,
      NULL::text AS slug,
      NULL::int AS "copyCount",
      NULL::text AS "memberUserId",
      NULL::text AS "memberUsername",
      NULL::text AS "memberDisplayName",
      play_participants."playId",
      NULL::date AS "playedAt",
      NULL::text AS "recordedByUserId",
      NULL::text AS "recordedByUsername",
      NULL::text AS "recordedByDisplayName",
      NULL::boolean AS "canDelete",
      play_participants."participantId",
      play_participants."participantUserId",
      play_participants."participantUsername",
      play_participants."participantDisplayName"
    FROM play_participants
    ORDER BY "sortGroup" ASC, "parentPosition" ASC NULLS FIRST, position ASC
  `);

  const currentRole = rows[0]?.currentRole;
  if (!currentRole) {
    throw new TavernGroupError("La taberna no existe.", 404, "TAVERN_NOT_FOUND");
  }

  const playRows = rows.filter((row) => row.kind === "play" && row.playId && row.title && row.playedAt);
  const visiblePlayRows = playRows.slice(0, TAVERN_PLAYS_PAGE_SIZE);
  const visiblePlayIds = new Set(visiblePlayRows.map((row) => row.playId!));
  const participantsByPlay = new Map<string, Array<{ id: string; username: string; displayName: string }>>();

  for (const row of rows) {
    if (row.kind !== "participant" || !row.playId || !row.participantId || !visiblePlayIds.has(row.playId)) continue;
    const participants = participantsByPlay.get(row.playId) || [];
    participants.push(row.participantUserId
      ? {
          id: row.participantUserId,
          username: row.participantUsername || "usuario",
          displayName: row.participantDisplayName || row.participantUsername || "Usuario"
        }
      : { id: row.participantId, username: "", displayName: "Usuario eliminado" });
    participantsByPlay.set(row.playId, participants);
  }

  return {
    currentRole,
    games: rows.flatMap((row) => row.kind === "game" && row.gameId && row.title && row.slug
      ? [{ gameId: row.gameId, title: row.title, slug: row.slug, copyCount: row.copyCount || 0 }]
      : []),
    members: rows.flatMap((row) => row.kind === "member" && row.memberUserId && row.memberUsername && row.memberDisplayName
      ? [{ user: { id: row.memberUserId, username: row.memberUsername, displayName: row.memberDisplayName } }]
      : []),
    items: visiblePlayRows.map((row) => ({
      id: row.playId!,
      title: row.title!,
      slug: row.slug,
      playedAt: row.playedAt!.toISOString().slice(0, 10),
      recordedBy: row.recordedByUserId
        ? {
            id: row.recordedByUserId,
            username: row.recordedByUsername || "usuario",
            displayName: row.recordedByDisplayName || row.recordedByUsername || "Usuario"
          }
        : null,
      canDelete: row.canDelete === true,
      participants: participantsByPlay.get(row.playId!) || []
    })),
    page,
    hasNext: playRows.length > TAVERN_PLAYS_PAGE_SIZE
  };
}

export async function deleteTavernGroupPlay(userId: string, tavernId: string, playId: string) {
  return serializedTavernMutation(tavernId, async (tx) => {
    const [membership, play] = await Promise.all([
      tx.tavernGroupMember.findUnique({
        where: { tavernId_userId: { tavernId, userId } },
        select: { role: true }
      }),
      tx.tavernGroupPlay.findFirst({
        where: { id: playId, tavernId },
        select: { id: true, recordedByUserId: true }
      })
    ]);
    if (!membership) throw new TavernGroupError("La taberna no existe.", 404, "TAVERN_NOT_FOUND");
    if (!play) throw new TavernGroupError("La partida no existe.", 404, "PLAY_NOT_FOUND");
    if (!canEditTavernPlay({ actorUserId: userId, actorRole: membership.role, recordedByUserId: play.recordedByUserId })) {
      throw new TavernGroupError("No tienes permiso para eliminar esta partida.", 403, "PLAY_FORBIDDEN");
    }
    await tx.tavernGroupPlay.delete({ where: { id: play.id } });
  });
}

export async function updateTavernGroup(userId: string, tavernId: string, input: { name: unknown }) {
  const name = validateTavernName(input.name);
  return serializedTavernMutation(tavernId, async (tx) => {
    const actor = await tx.tavernGroupMember.findUnique({
      where: { tavernId_userId: { tavernId, userId } },
      select: { role: true }
    });
    if (actor?.role !== TavernMemberRole.ADMIN) {
      throw new TavernGroupError("No tienes permiso para editar la taberna.", 403, "ADMIN_REQUIRED");
    }
    return tx.tavernGroup.update({ where: { id: tavernId }, data: { name }, select: { id: true, name: true } });
  });
}

export async function deleteTavernGroup(userId: string, tavernId: string, confirmation: unknown) {
  return serializedTavernMutation(tavernId, async (tx) => {
    const membership = await tx.tavernGroupMember.findUnique({
      where: { tavernId_userId: { tavernId, userId } },
      select: { role: true, tavern: { select: { name: true } } }
    });
    if (membership?.role !== TavernMemberRole.ADMIN) {
      throw new TavernGroupError("No tienes permiso para eliminar la taberna.", 403, "ADMIN_REQUIRED");
    }
    if (normalizeTavernName(confirmation) !== membership.tavern.name) {
      throw new TavernGroupError("Escribe exactamente el nombre de la taberna para eliminarla.", 400, "CONFIRMATION_REQUIRED");
    }
    await tx.tavernGroup.delete({ where: { id: tavernId } });
  });
}
