import { PublicShell } from "@/components/PublicShell";
import { SettingsPageClient } from "@/components/account/SettingsPageClient";

export default function SettingsPage() {
  return (
    <PublicShell>
      <main className="container-page py-10 lg:py-16">
        <SettingsPageClient />
      </main>
    </PublicShell>
  );
}
