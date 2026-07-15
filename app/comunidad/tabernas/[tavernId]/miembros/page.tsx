import { notFound, redirect } from "next/navigation";
import { TavernMembersClient } from "@/components/taverns/TavernMembersClient";
import { getTavernGroupMembersPageData, TavernGroupError } from "@/lib/tavernGroups";
import { requireCurrentAppUserForRsc } from "@/lib/tavernRequestCache";

export default async function TavernMembersPage({ params }: { params: Promise<{ tavernId: string }> }) {
  const { tavernId } = await params;
  let user: Awaited<ReturnType<typeof requireCurrentAppUserForRsc>>;
  try {
    user = await requireCurrentAppUserForRsc();
  } catch {
    redirect(`/auth?mode=login&next=${encodeURIComponent(`/comunidad/tabernas/${tavernId}/miembros`)}`);
  }
  let data: Awaited<ReturnType<typeof getTavernGroupMembersPageData>>;
  try {
    data = await getTavernGroupMembersPageData(user.id, tavernId);
  } catch (error) {
    if (error instanceof TavernGroupError && error.status === 404) notFound();
    throw error;
  }
  return (
    <TavernMembersClient
      tavernId={tavernId}
      currentUserId={user.id}
      currentRole={data.currentRole}
      initialMembers={data.members}
      initialInvitations={data.invitations}
    />
  );
}
