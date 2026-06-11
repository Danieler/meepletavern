import { PublicShell } from "@/components/PublicShell";
import { LibraryPanel } from "@/components/account/LibraryPanel";

export default function LibraryPage() {
  return (
    <PublicShell>
      <main className="container-page py-10 lg:py-16">
        <LibraryPanel />
      </main>
    </PublicShell>
  );
}
