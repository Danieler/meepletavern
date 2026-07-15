import { notFound, redirect } from "next/navigation";
import { TavernGroupHeader } from "@/components/taverns/TavernGroupHeader";
import { TavernGroupError } from "@/lib/tavernGroups";
import { getTavernGroupSummaryForRsc, requireCurrentAppUserForRsc } from "@/lib/tavernRequestCache";
import { buildUsernameOnboardingPath } from "@/lib/usernames";

export const dynamic = "force-dynamic";

export default async function TavernLayout({ children, params }: { children: React.ReactNode; params: Promise<{ tavernId: string }> }) {
  let user: Awaited<ReturnType<typeof requireCurrentAppUserForRsc>>;
  try {
    user = await requireCurrentAppUserForRsc();
  } catch {
    const { tavernId } = await params;
    redirect(`/auth?mode=login&next=${encodeURIComponent(`/comunidad/tabernas/${tavernId}`)}`);
  }
  const { tavernId } = await params;
  if (user.profile?.usernameSetupRequired === true) {
    redirect(buildUsernameOnboardingPath(`/comunidad/tabernas/${tavernId}`));
  }
  try {
    const tavern = await getTavernGroupSummaryForRsc(user.id, tavernId);
    return (
      <div className="space-y-7">
        <TavernGroupHeader tavern={tavern} />
        {children}
      </div>
    );
  } catch (error) {
    if (error instanceof TavernGroupError && error.status === 404) notFound();
    throw error;
  }
}
