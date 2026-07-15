import { redirect } from "next/navigation";
import { TavernMembersClient } from "@/components/taverns/TavernMembersClient";
import { getTavernGroupMembersForMember } from "@/lib/tavernGroups";
import { getTavernGroupSummaryForRsc, requireCurrentAppUserForRsc } from "@/lib/tavernRequestCache";

export default async function TavernMembersPage({ params }: { params: Promise<{ tavernId: string }> }) {
  const { tavernId } = await params;
  let user: Awaited<ReturnType<typeof requireCurrentAppUserForRsc>>;
  try {
    user = await requireCurrentAppUserForRsc();
  } catch {
    redirect(`/auth?mode=login&next=${encodeURIComponent(`/comunidad/tabernas/${tavernId}/miembros`)}`);
  }
  const tavern = await getTavernGroupSummaryForRsc(user.id, tavernId);
  const data = await getTavernGroupMembersForMember(tavernId, tavern.role, { includeInvitations: true });
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
