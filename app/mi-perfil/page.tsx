import { redirect } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { ProfilePanel } from "@/components/auth/ProfilePanel";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { buildUsernameOnboardingPath } from "@/lib/usernames";

export default async function ProfilePage() {
  let account: Awaited<ReturnType<typeof requireCurrentAppUser>>;
  try {
    account = await requireCurrentAppUser();
  } catch {
    redirect("/auth?mode=login&next=%2Fmi-perfil");
  }
  if (account.profile?.usernameSetupRequired === true) {
    redirect(buildUsernameOnboardingPath("/mi-perfil"));
  }

  return (
    <PublicShell>
      <main className="container-page py-10 lg:py-16">
        <ProfilePanel />
      </main>
    </PublicShell>
  );
}
