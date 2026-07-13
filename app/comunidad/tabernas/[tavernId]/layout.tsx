import { notFound, redirect } from "next/navigation";
import { TavernGroupHeader } from "@/components/taverns/TavernGroupHeader";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { getTavernGroupSummary, TavernGroupError } from "@/lib/tavernGroups";

export const dynamic = "force-dynamic";

export default async function TavernLayout({ children, params }: { children: React.ReactNode; params: Promise<{ tavernId: string }> }) {
  let user: Awaited<ReturnType<typeof requireCurrentAppUser>>;
  try {
    user = await requireCurrentAppUser();
  } catch {
    const { tavernId } = await params;
    redirect(`/auth?mode=login&next=${encodeURIComponent(`/comunidad/tabernas/${tavernId}`)}`);
  }
  const { tavernId } = await params;
  try {
    const tavern = await getTavernGroupSummary(user.id, tavernId);
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
