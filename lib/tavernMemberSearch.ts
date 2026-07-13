import { Prisma, TavernInvitationStatus, TavernMemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TavernGroupError } from "@/lib/tavernGroupError";
import {
  MIN_TAVERN_MEMBER_QUERY_LENGTH,
  normalizeTavernMemberSearch
} from "@/lib/tavernMemberSearchQuery";

const MAX_SUGGESTIONS = 8;

export async function searchTavernInviteCandidates(actorUserId: string, tavernId: string, value: unknown) {
  const actor = await prisma.tavernGroupMember.findUnique({
    where: { tavernId_userId: { tavernId, userId: actorUserId } },
    select: { role: true }
  });
  if (!actor) throw new TavernGroupError("La taberna no existe.", 404, "TAVERN_NOT_FOUND");
  if (actor.role !== TavernMemberRole.ADMIN) {
    throw new TavernGroupError("No tienes permiso para realizar esta acción.", 403, "ADMIN_REQUIRED");
  }

  const query = normalizeTavernMemberSearch(value);
  if (query.length < MIN_TAVERN_MEMBER_QUERY_LENGTH) return [];

  const matches = query.length === MIN_TAVERN_MEMBER_QUERY_LENGTH
    ? [{ username: { startsWith: query } }]
    : [
        { username: { contains: query, mode: Prisma.QueryMode.insensitive } },
        { displayName: { contains: query, mode: Prisma.QueryMode.insensitive } }
      ];
  const candidates = await prisma.userProfile.findMany({
    where: {
      userId: { not: actorUserId },
      OR: matches,
      user: {
        tavernGroupMemberships: { none: { tavernId } },
        receivedTavernGroupInvitations: {
          none: {
            tavernId,
            status: TavernInvitationStatus.PENDING,
            expiresAt: { gt: new Date() }
          }
        }
      }
    },
    orderBy: [{ username: "asc" }, { id: "asc" }],
    take: MAX_SUGGESTIONS,
    select: { userId: true, username: true, displayName: true }
  });

  return candidates.map((candidate) => ({
    id: candidate.userId,
    username: candidate.username,
    displayName: candidate.displayName?.trim() || candidate.username
  }));
}
