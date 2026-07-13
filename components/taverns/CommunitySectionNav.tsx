"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Landmark, UsersRound } from "lucide-react";

const items = [
  { href: "/comunidad", label: "La plaza", icon: Landmark, exact: true },
  { href: "/comunidad/tabernas", label: "Mis tabernas", icon: UsersRound, exact: false }
] as const;

export function CommunitySectionNav() {
  const pathname = usePathname();

  return (
    <nav className="container-page pt-5" aria-label="Secciones de la comunidad">
      <div className="grid gap-2 rounded-md border border-walnut/12 bg-white/70 p-2 shadow-sm sm:inline-grid sm:grid-cols-2">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-extrabold transition ${
                active ? "bg-wood text-white shadow-sm" : "text-walnut hover:bg-vanilla hover:text-wood"
              }`}
            >
              <Icon size={17} aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
