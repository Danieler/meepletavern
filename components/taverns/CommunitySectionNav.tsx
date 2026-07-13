"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Landmark, UsersRound } from "lucide-react";

const items = [
  { href: "/comunidad", label: "La plaza", description: "Actividad pública", icon: Landmark, exact: true },
  { href: "/comunidad/tabernas", label: "Mis tabernas", description: "Ludoteca compartida", icon: UsersRound, exact: false }
] as const;

export function CommunitySectionNav() {
  const pathname = usePathname();

  return (
    <nav className="container-page pt-5" aria-label="Secciones de la comunidad">
      <div className="grid gap-2 rounded-md border border-walnut/12 bg-white/70 p-2 shadow-sm sm:inline-grid sm:grid-cols-2">
        {items.map(({ href, label, description, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`focus-ring grid min-h-14 grid-cols-[34px_minmax(0,1fr)] items-center gap-2.5 rounded-md px-3.5 py-2 text-left transition ${
                active ? "bg-wood text-white shadow-sm" : "text-walnut hover:bg-vanilla hover:text-wood"
              }`}
            >
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${active ? "bg-white/10 text-ember" : "bg-ember/10 text-ember"}`}>
                <Icon size={16} aria-hidden="true" />
              </span>
              <span>
                <strong className="block text-sm font-extrabold">{label}</strong>
                <small className={`mt-0.5 block text-[10px] font-bold uppercase tracking-[0.08em] ${active ? "text-white/58" : "text-walnut/45"}`}>{description}</small>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
