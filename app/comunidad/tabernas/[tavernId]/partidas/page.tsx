import { redirect } from "next/navigation";
import { TavernPlaysClient } from "@/components/taverns/TavernPlaysClient";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { getTavernGroupLibrary, getTavernGroupMembers, getTavernGroupPlays } from "@/lib/tavernGroups";

type Props = { params: Promise<{ tavernId: string }>; searchParams?: Promise<{ gameId?: string }> };

export default async function TavernPlaysPage({ params, searchParams }: Props) {
  const { tavernId } = await params;
  let user: Awaited<ReturnType<typeof requireCurrentAppUser>>;
  try {
    user = await requireCurrentAppUser();
  } catch {
    redirect(`/auth?mode=login&next=${encodeURIComponent(`/comunidad/tabernas/${tavernId}/partidas`)}`);
  }
  const initialGameId = (await searchParams)?.gameId;
  const [games, memberData, plays] = await Promise.all([
    getTavernGroupLibrary(user.id, tavernId),
    getTavernGroupMembers(user.id, tavernId),
    getTavernGroupPlays(user.id, tavernId)
  ]);

  return (
    <TavernPlaysClient
      tavernId={tavernId}
      currentUserId={user.id}
      games={games.map((game) => ({ gameId: game.gameId, title: game.title, copyCount: game.copyCount }))}
      members={memberData.members.map((member) => ({ user: member.user }))}
      initialPlays={plays.items}
      initialGameId={initialGameId}
    />
  );
}
