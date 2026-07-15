import { redirect } from "next/navigation";
import { TavernSettingsClient } from "@/components/taverns/TavernSettingsClient";
import { getTavernGroupSummaryForRsc, requireCurrentAppUserForRsc } from "@/lib/tavernRequestCache";

export default async function TavernSettingsPage({ params }: { params: Promise<{ tavernId: string }> }) {
  const { tavernId } = await params;
  let user: Awaited<ReturnType<typeof requireCurrentAppUserForRsc>>;
  try {
    user = await requireCurrentAppUserForRsc();
  } catch {
    redirect(`/auth?mode=login&next=${encodeURIComponent(`/comunidad/tabernas/${tavernId}/ajustes`)}`);
  }
  const tavern = await getTavernGroupSummaryForRsc(user.id, tavernId);
  return <TavernSettingsClient tavernId={tavernId} name={tavern.name} role={tavern.role} />;
}
