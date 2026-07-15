"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Dices, LibraryBig, LoaderCircle, Settings, UsersRound } from "lucide-react";

export function TavernGroupNav({ tavernId, isAdmin }: { tavernId: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const base = `/comunidad/tabernas/${tavernId}`;
  const items = [
    { href: base, label: "Ludoteca", icon: LibraryBig, exact: true },
    { href: `${base}/partidas`, label: "Partidas", icon: Dices, exact: false },
    { href: `${base}/miembros`, label: "Miembros", icon: UsersRound, exact: false },
    { href: `${base}/ajustes`, label: isAdmin ? "Ajustes" : "Salir", icon: Settings, exact: false }
  ];

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  return (
    <nav className="mt-4 overflow-x-auto rounded-md border border-walnut/12 bg-white/75 p-2" aria-label={`Navegación de ${tavernId}`}>
      <div className="flex min-w-max gap-1 sm:grid sm:min-w-0 sm:grid-cols-4">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          const visuallyActive = pendingHref ? pendingHref === href : active;
          const pending = pendingHref === href;
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              scroll={false}
              onPointerDown={(event) => {
                if (!active && event.button === 0) router.prefetch(href);
              }}
              onClick={(event) => {
                if (!active && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                  setPendingHref(href);
                }
              }}
              aria-current={active ? "page" : undefined}
              aria-busy={pending || undefined}
              className={`focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-extrabold transition ${
                visuallyActive ? "bg-ember/12 text-wood" : "text-walnut/70 hover:bg-vanilla hover:text-wood"
              }`}
            >
              {pending ? <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Icon size={16} aria-hidden="true" />}
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
