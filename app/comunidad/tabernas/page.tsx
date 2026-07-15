import { redirect } from "next/navigation";
import { TavernDashboardClient } from "@/components/taverns/TavernDashboardClient";
import { getMyTavernDashboard } from "@/lib/tavernGroups";
import { requireCurrentAppUserForRsc } from "@/lib/tavernRequestCache";
import { buildUsernameOnboardingPath } from "@/lib/usernames";

export const dynamic = "force-dynamic";

export default async function MyTavernsPage() {
  let user: Awaited<ReturnType<typeof requireCurrentAppUserForRsc>>;
  try {
    user = await requireCurrentAppUserForRsc();
  } catch {
    redirect("/auth?mode=login&next=%2Fcomunidad%2Ftabernas");
  }
  if (user.profile?.usernameSetupRequired === true) {
    redirect(buildUsernameOnboardingPath("/comunidad/tabernas"));
  }
  const dashboard = await getMyTavernDashboard(user.id);
  return <TavernDashboardClient initialDashboard={dashboard} />;
}
