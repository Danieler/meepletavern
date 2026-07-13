import { redirect } from "next/navigation";
import { TavernDashboardClient } from "@/components/taverns/TavernDashboardClient";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { getMyTavernDashboard } from "@/lib/tavernGroups";

export const dynamic = "force-dynamic";

export default async function MyTavernsPage() {
  let user: Awaited<ReturnType<typeof requireCurrentAppUser>>;
  try {
    user = await requireCurrentAppUser();
  } catch {
    redirect("/auth?mode=login&next=%2Fcomunidad%2Ftabernas");
  }
  const dashboard = await getMyTavernDashboard(user.id);
  return <TavernDashboardClient initialDashboard={dashboard} />;
}
