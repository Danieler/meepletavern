import Link from "next/link";
import Image from "next/image";
import { BrandIcon } from "@/components/BrandIcon";
import { PublicAuthControls } from "@/components/PublicAuthControls";
import { siteConfig } from "@/lib/site";

const navItems = [
  { href: "/resenas", label: "Reviews" },
  { href: "/rankings", label: "Ratings" },
  { href: "/juegos", label: "Browse games" },
  { href: "/categorias", label: "Top lists" },
  { href: "/mecanicas", label: "Articles" },
  { href: "/tematicas", label: "Community" }
];

export function PublicHeader() {
  return (
    <header className="wood-surface sticky top-0 z-40 border-b border-ember/30 text-white shadow-tavern">
      <div className="container-page flex min-h-[76px] flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden">
              <Image
                src={siteConfig.markImage}
                alt=""
                fill
                sizes="44px"
                className="object-contain"
                priority
              />
            </span>
            <span>
              <span className="font-display block text-3xl font-black leading-6 text-white">
                Meeple
              </span>
              <span className="font-display block text-3xl font-black leading-6 text-ember">
                Tavern
              </span>
              <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.18em] text-parchment/80">
                Reviews · ratings · discovery
              </span>
            </span>
          </Link>
          <Link className="button-secondary min-h-10 border-ember/40 bg-white/10 px-3 text-parchment lg:hidden" href="/juegos">
            <BrandIcon name="search" size={18} />
            Buscar
          </Link>
        </div>
        <nav className="scrollbar-hide flex gap-1 overflow-x-auto text-sm font-black uppercase tracking-wide text-parchment/80 lg:items-center lg:overflow-visible">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex whitespace-nowrap rounded-md px-3 py-2 transition hover:bg-white/10 hover:text-ember"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-end">
          <PublicAuthControls />
        </div>
      </div>
    </header>
  );
}
