import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicShell";
import { CommunitySectionNav } from "@/components/taverns/CommunitySectionNav";

export const metadata: Metadata = {
  title: "Mis tabernas - MeepleTavern",
  robots: { index: false, follow: false }
};

export default function MyTavernsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PublicShell>
      <CommunitySectionNav />
      <main className="container-page py-8 lg:py-12">{children}</main>
    </PublicShell>
  );
}
