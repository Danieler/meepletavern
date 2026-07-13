import { redirect } from "next/navigation";
import { TavernSettingsClient } from "@/components/taverns/TavernSettingsClient";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { getTavernGroupSummary } from "@/lib/tavernGroups";

export default async function TavernSettingsPage({ params }: { params: Promise<{ tavernId: string }> }) {
  const { tavernId } = await params;
  let user: Awaited<ReturnType<typeof requireCurrentAppUser>>;
  try {
    user = await requireCurrentAppUser();
  } catch {
    redirect(`/auth?mode=login&next=${encodeURIComponent(`/comunidad/tabernas/${tavernId}/ajustes`)}`);
  }
  const tavern = await getTavernGroupSummary(user.id, tavernId);
  return <TavernSettingsClient tavernId={tavernId} name={tavern.name} role={tavern.role} />;
}
