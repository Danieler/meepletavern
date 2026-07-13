import { redirect } from "next/navigation";
import { TavernMembersClient } from "@/components/taverns/TavernMembersClient";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { getTavernGroupMembers } from "@/lib/tavernGroups";

export default async function TavernMembersPage({ params }: { params: Promise<{ tavernId: string }> }) {
  const { tavernId } = await params;
  let user: Awaited<ReturnType<typeof requireCurrentAppUser>>;
  try {
    user = await requireCurrentAppUser();
  } catch {
    redirect(`/auth?mode=login&next=${encodeURIComponent(`/comunidad/tabernas/${tavernId}/miembros`)}`);
  }
  const data = await getTavernGroupMembers(user.id, tavernId);
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
