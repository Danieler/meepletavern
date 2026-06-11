import { PublicShell } from "@/components/PublicShell";
import { ProfilePanel } from "@/components/auth/ProfilePanel";

export default function ProfilePage() {
  return (
    <PublicShell>
      <main className="container-page py-10 lg:py-16">
        <ProfilePanel />
      </main>
    </PublicShell>
  );
}
