import { notFound, redirect } from "next/navigation";
import { TavernPlaysClient } from "@/components/taverns/TavernPlaysClient";
import { getTavernGroupPlaysPageData, TavernGroupError } from "@/lib/tavernGroups";
import { requireCurrentAppUserForRsc } from "@/lib/tavernRequestCache";

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
  let data: Awaited<ReturnType<typeof getTavernGroupPlaysPageData>>;
  try {
    data = await getTavernGroupPlaysPageData(user.id, tavernId, filters?.page);
  } catch (error) {
    if (error instanceof TavernGroupError && error.status === 404) notFound();
    throw error;
  }
  if (!data.items.length && data.page > 1) {
    const params = new URLSearchParams();
    if (initialGameId) params.set("gameId", initialGameId);
    const suffix = params.toString();
    redirect(`/comunidad/tabernas/${tavernId}/partidas${suffix ? `?${suffix}` : ""}`);
  }

  return (
    <TavernPlaysClient
      tavernId={tavernId}
      currentUserId={user.id}
      games={data.games}
      members={data.members}
      initialPlays={data.items}
      initialGameId={initialGameId}
      historyPage={data.page}
      hasNextHistory={data.hasNext}
    />
  );
}
