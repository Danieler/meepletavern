import { redirect } from "next/navigation";
import { TavernPlaysClient } from "@/components/taverns/TavernPlaysClient";
import { getTavernGroupGameOptionsForMember, getTavernGroupMembersForMember, getTavernGroupPlaysForMember } from "@/lib/tavernGroups";
import { getTavernGroupSummaryForRsc, requireCurrentAppUserForRsc } from "@/lib/tavernRequestCache";

type Props = { params: Promise<{ tavernId: string }>; searchParams?: Promise<{ gameId?: string }> };

export default async function TavernPlaysPage({ params, searchParams }: Props) {
  const { tavernId } = await params;
  let user: Awaited<ReturnType<typeof requireCurrentAppUserForRsc>>;
  try {
    user = await requireCurrentAppUserForRsc();
  } catch {
    redirect(`/auth?mode=login&next=${encodeURIComponent(`/comunidad/tabernas/${tavernId}/partidas`)}`);
  }
  const initialGameId = (await searchParams)?.gameId;
  const tavern = await getTavernGroupSummaryForRsc(user.id, tavernId);
  const [games, memberData, plays] = await Promise.all([
    getTavernGroupGameOptionsForMember(tavernId),
    getTavernGroupMembersForMember(tavernId, tavern.role, { includeInvitations: false }),
    getTavernGroupPlaysForMember(user.id, tavernId, tavern.role)
  ]);

  return (
    <TavernPlaysClient
      tavernId={tavernId}
      currentUserId={user.id}
      games={games.map((game) => ({ gameId: game.gameId, title: game.title, slug: game.slug, copyCount: game.copyCount }))}
      members={memberData.members.map((member) => ({ user: member.user }))}
      initialPlays={plays.items}
      initialGameId={initialGameId}
    />
  );
}
