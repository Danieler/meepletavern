import { redirect } from "next/navigation";
import { TavernPlaysClient } from "@/components/taverns/TavernPlaysClient";
import {
  getTavernGroupPlayFormOptionsForMember,
  getTavernGroupPlayHistoryForMember
} from "@/lib/tavernGroups";
import { getTavernGroupSummaryForRsc, requireCurrentAppUserForRsc } from "@/lib/tavernRequestCache";

type Props = { params: Promise<{ tavernId: string }>; searchParams?: Promise<{ gameId?: string; page?: string }> };

export default async function TavernPlaysPage({ params, searchParams }: Props) {
  const { tavernId } = await params;
  let user: Awaited<ReturnType<typeof requireCurrentAppUserForRsc>>;
  try {
    user = await requireCurrentAppUserForRsc();
  } catch {
    redirect(`/auth?mode=login&next=${encodeURIComponent(`/comunidad/tabernas/${tavernId}/partidas`)}`);
  }
  const filters = await searchParams;
  const initialGameId = filters?.gameId;
  const tavern = await getTavernGroupSummaryForRsc(user.id, tavernId);
  const [options, plays] = await Promise.all([
    getTavernGroupPlayFormOptionsForMember(tavernId),
    getTavernGroupPlayHistoryForMember(user.id, tavernId, tavern.role, filters?.page)
  ]);
  if (!plays.items.length && plays.page > 1) {
    const params = new URLSearchParams();
    if (initialGameId) params.set("gameId", initialGameId);
    const suffix = params.toString();
    redirect(`/comunidad/tabernas/${tavernId}/partidas${suffix ? `?${suffix}` : ""}`);
  }

  return (
    <TavernPlaysClient
      tavernId={tavernId}
      currentUserId={user.id}
      games={options.games}
      members={options.members}
      initialPlays={plays.items}
      initialGameId={initialGameId}
      historyPage={plays.page}
      hasNextHistory={plays.hasNext}
    />
  );
}
