import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Admin",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f5f7f4]">
      <header className="border-b border-ink/10 bg-white">
        <div className="container-page flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/admin/games" className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-ink text-white">
              <ShieldCheck size={20} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink/55">Meeple Tavern</span>
              <span className="block text-xl font-black text-ink">Panel de administración</span>
            </span>
          </Link>
          <nav className="flex flex-wrap gap-2 text-sm font-semibold">
            <Link className="button-secondary min-h-10" href="/admin/games">
              Juegos
            </Link>
            <Link className="button-primary min-h-10" href="/admin/games/new-ai">
              Crear con IA
            </Link>
          </nav>
        </div>
      </header>
      <div className="container-page py-8">{children}</div>
    </main>
  );
}

