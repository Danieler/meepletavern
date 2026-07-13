import {
  GameStatus,
  Prisma,
  TavernInvitationStatus,
  TavernMemberRole
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TavernGroupError } from "@/lib/tavernGroupError";
import { isSystemGeneratedUsername } from "@/lib/usernames";

export { TavernGroupError } from "@/lib/tavernGroupError";

export const MAX_TAVERN_NAME_LENGTH = 60;
export const MAX_TAVERNS_PER_USER = 10;
export const MAX_TAVERN_MEMBERS = 50;
export const MAX_PENDING_TAVERN_INVITATIONS = 50;
export const TAVERN_INVITATION_DAYS = 14;
export const MAX_TAVERN_LIBRARY_ITEMS = 120;
export const MAX_TAVERN_PLAYS = 100;

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
  const generatedUsername = isSystemGeneratedUsername(user.profile?.username);
  return {
    id: user.id,
    username: generatedUsername ? "" : user.profile?.username || "usuario",
    displayName: generatedUsername
      ? user.profile?.displayName || user.displayName || "Miembro nuevo"
      : tavernDisplayName(user)
  };
}

function tavernDisplayName(user: {
  displayName: string | null;
  profile: { username: string; displayName: string | null } | null;
}) {
  return user.profile?.displayName || user.displayName || user.profile?.username || "Usuario";
}

type TavernLibraryCountRow = { tavernId: string; uniqueGames: number };
type TavernSummaryCountRow = { memberCount: number; playCount: number; uniqueGames: number };

async function ownedGameCountsByTavern(tavernIds: string[]) {
  if (!tavernIds.length) return new Map<string, number>();
  const rows = await prisma.$queryRaw<TavernLibraryCountRow[]>(Prisma.sql`
    SELECT member."tavernId", COUNT(DISTINCT library."gameId")::int AS "uniqueGames"
    FROM "TavernGroupMember" member
    JOIN "UserLibraryGame" library
      ON library."userId" = member."userId" AND library."owned" = true
    JOIN "Game" game
      ON game.id = library."gameId" AND game.status = ${GameStatus.published}::"GameStatus"
    WHERE member."tavernId" IN (${Prisma.join(tavernIds)})
    GROUP BY member."tavernId"
  `);
  return new Map(rows.map((row) => [row.tavernId, row.uniqueGames]));
}

async function getTavernSummaryCounts(tavernId: string) {
  const [row] = await prisma.$queryRaw<TavernSummaryCountRow[]>(Prisma.sql`
    SELECT
      (SELECT COUNT(*)::int FROM "TavernGroupMember" WHERE "tavernId" = ${tavernId}) AS "memberCount",
      (SELECT COUNT(*)::int FROM "TavernGroupPlay" WHERE "tavernId" = ${tavernId}) AS "playCount",
      (
        SELECT COUNT(DISTINCT library."gameId")::int
        FROM "TavernGroupMember" member
        JOIN "UserLibraryGame" library
          ON library."userId" = member."userId" AND library."owned" = true
        JOIN "Game" game
          ON game.id = library."gameId" AND game.status = ${GameStatus.published}::"GameStatus"
        WHERE member."tavernId" = ${tavernId}
      ) AS "uniqueGames"
  `);
  return row || { memberCount: 0, playCount: 0, uniqueGames: 0 };
}

export async function getMyTavernDashboard(userId: string) {
  const now = new Date();
  const [memberships, invitations] = await Promise.all([
    prisma.tavernGroupMember.findMany({
      where: { userId },
      orderBy: [{ joinedAt: "desc" }, { id: "desc" }],
      take: 30,
      select: {
        role: true,
        joinedAt: true,
        tavern: {
          select: {
            id: true,
            name: true,
            updatedAt: true,
            _count: { select: { members: true, plays: true } }
          }
        }
      }
    }),
    prisma.tavernGroupInvitation.findMany({
      where: {
        targetUserId: userId,
        status: TavernInvitationStatus.PENDING,
        expiresAt: { gt: now }
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 30,
      select: {
        id: true,
        expiresAt: true,
        tavern: { select: { id: true, name: true, _count: { select: { members: true } } } },
        invitedByUser: {
          select: {
            id: true,
            displayName: true,
            profile: { select: { username: true, displayName: true } }
          }
        }
      }
    })
  ]);

  const ownedGameCounts = await ownedGameCountsByTavern(memberships.map(({ tavern }) => tavern.id));
  const taverns = memberships.map(({ tavern, role, joinedAt }) => ({
    id: tavern.id,
    name: tavern.name,
    role,
    joinedAt: joinedAt.toISOString(),
    updatedAt: tavern.updatedAt.toISOString(),
    memberCount: tavern._count.members,
    playCount: tavern._count.plays,
    uniqueGames: ownedGameCounts.get(tavern.id) || 0
  }));

  return {
    taverns,
    invitations: invitations.map((invitation) => ({
      id: invitation.id,
      expiresAt: invitation.expiresAt.toISOString(),
      tavern: {
        id: invitation.tavern.id,
        name: invitation.tavern.name,
        memberCount: invitation.tavern._count.members
      },
      invitedBy: invitation.invitedByUser ? publicUser(invitation.invitedByUser) : null
    }))
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

export async function getTavernGroupSummary(userId: string, tavernId: string) {
  const membership = await requireTavernMembership(userId, tavernId);
  const counts = await getTavernSummaryCounts(tavernId);

  return {
    id: membership.tavern.id,
    name: membership.tavern.name,
    role: membership.role,
    ...counts
  };
}

type TavernLibrarySqlRow = {
  gameId: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  copyCount: number;
  playCount: number;
  lastPlayedAt: Date | null;
};

export async function getTavernGroupLibrary(userId: string, tavernId: string, searchValue?: string | null) {
  await requireTavernMembership(userId, tavernId);
  const search = typeof searchValue === "string" ? searchValue.trim().replace(/\s+/g, " ").slice(0, 80) : "";
  const pattern = `%${search}%`;
  const rows = await prisma.$queryRaw<TavernLibrarySqlRow[]>(Prisma.sql`
    WITH copies AS (
      SELECT ulg."gameId", COUNT(*)::int AS "copyCount"
      FROM "TavernGroupMember" member
      JOIN "UserLibraryGame" ulg
        ON ulg."userId" = member."userId" AND ulg."owned" = true
      WHERE member."tavernId" = ${tavernId}
      GROUP BY ulg."gameId"
    ), plays AS (
      SELECT "gameId", COUNT(*)::int AS "playCount", MAX("playedAt") AS "lastPlayedAt"
      FROM "TavernGroupPlay"
      WHERE "tavernId" = ${tavernId} AND "gameId" IS NOT NULL
      GROUP BY "gameId"
    )
    SELECT
      game.id AS "gameId",
      COALESCE(NULLIF(game.title, ''), game.name) AS title,
      game.slug,
      game."coverImageUrl",
      copies."copyCount",
      COALESCE(plays."playCount", 0)::int AS "playCount",
      plays."lastPlayedAt"
    FROM copies
    JOIN "Game" game ON game.id = copies."gameId"
    LEFT JOIN plays ON plays."gameId" = copies."gameId"
    WHERE game.status = ${GameStatus.published}::"GameStatus"
      AND (${search} = '' OR game.title ILIKE ${pattern} OR game.name ILIKE ${pattern})
    ORDER BY lower(COALESCE(NULLIF(game.title, ''), game.name)) ASC, game.id ASC
    LIMIT ${MAX_TAVERN_LIBRARY_ITEMS}
  `);

  const gameIds = rows.map((row) => row.gameId);
  const ownerships = gameIds.length
    ? await prisma.userLibraryGame.findMany({
        where: {
          gameId: { in: gameIds },
          owned: true,
          user: { tavernGroupMemberships: { some: { tavernId } } }
        },
        select: {
          gameId: true,
          user: {
            select: {
              displayName: true,
              profile: { select: { username: true, displayName: true } }
            }
          }
        }
      })
    : [];
  const ownersByGame = new Map<string, Array<{ displayName: string }>>();
  for (const ownership of ownerships) {
    const owners = ownersByGame.get(ownership.gameId) || [];
    owners.push({ displayName: tavernDisplayName(ownership.user) });
    ownersByGame.set(ownership.gameId, owners);
  }

  return rows.map((row) => ({
    gameId: row.gameId,
    title: row.title,
    slug: row.slug,
    coverImageUrl: row.coverImageUrl,
    copyCount: row.copyCount,
    playCount: row.playCount,
    lastPlayedAt: row.lastPlayedAt?.toISOString().slice(0, 10) || null,
    owners: ownersByGame.get(row.gameId) || []
  }));
}

export async function getTavernGroupMembers(userId: string, tavernId: string) {
  const membership = await requireTavernMembership(userId, tavernId);
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
    membership.role === TavernMemberRole.ADMIN
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
    currentRole: membership.role,
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
    currentRole: membership.role,
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
        actorRole: membership.role,
        recordedByUserId: play.recordedByUserId
      }),
      participants: play.participants.map((participant) =>
        participant.user ? publicUser(participant.user) : { id: participant.id, username: "", displayName: "Usuario eliminado" }
      )
    }))
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
