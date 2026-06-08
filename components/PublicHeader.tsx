import Link from "next/link";
import { Beer, Search } from "lucide-react";
import { siteConfig } from "@/lib/site";

const navItems = [
  { href: "/juegos", label: "Juegos" },
  { href: "/rankings", label: "Rankings" },
  { href: "/resenas", label: "Reseñas" },
  { href: "/categorias", label: "Categorías" },
  { href: "/mecanicas", label: "Mecánicas" },
  { href: "/tematicas", label: "Taberna" }
];

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-[#fbfaf6]/92 backdrop-blur">
      <div className="container-page flex min-h-16 flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-ink text-ember">
              <Beer size={21} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-lg font-black leading-5 text-ink">{siteConfig.name}</span>
              <span className="block text-xs font-semibold text-ink/55">Catálogo y crónicas de mesa</span>
            </span>
          </Link>
          <Link className="button-secondary min-h-10 px-3 lg:hidden" href="/juegos">
            <Search size={17} aria-hidden="true" />
            Buscar
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto text-sm font-bold text-ink/70 lg:items-center lg:overflow-visible">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md px-3 py-2 transition hover:bg-ink/5 hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

