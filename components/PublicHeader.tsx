import Link from "next/link";
import Image from "next/image";
import { BrandIcon } from "@/components/BrandIcon";
import { PublicAuthControls } from "@/components/PublicAuthControls";
import { siteConfig } from "@/lib/site";

const navItems = [
  { href: "/resenas", label: "Reseñas" },
  { href: "/rankings", label: "Rankings" },
  { href: "/juegos", label: "Juegos" },
  { href: "/usuarios", label: "Usuarios" },
  { href: "/categorias", label: "Categorías" },
  { href: "/mecanicas", label: "Mecánicas" },
  { href: "/tematicas", label: "Temáticas" }
];

export function PublicHeader() {
  return (
    <header className="tavern-header sticky top-0 z-40 text-white">
      <div className="container-page flex min-h-[72px] flex-col gap-2 py-2 lg:flex-row lg:items-center lg:justify-between lg:gap-3 lg:py-2.5">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden sm:h-16 sm:w-16 lg:h-[72px] lg:w-[72px]">
              <Image
                src={siteConfig.markImage}
                alt=""
                fill
                sizes="(min-width: 1024px) 72px, (min-width: 640px) 64px, 56px"
                className="object-contain"
                priority
              />
            </span>
            <span className="min-w-0">
              <span className="font-display block text-2xl font-bold leading-5 text-white sm:text-3xl sm:leading-6">
                Meeple
              </span>
              <span className="font-display block text-2xl font-bold leading-5 text-ember sm:text-3xl sm:leading-6">
                Tavern
              </span>
              <span className="mt-1 hidden text-[10px] font-black uppercase tracking-[0.18em] text-parchment/80 sm:block">
                reseñas · rankings · descubrimientos
              </span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2 lg:hidden">
            <Link className="header-action w-10 px-0 sm:w-auto sm:px-3" href="/juegos" aria-label="Buscar juegos">
              <BrandIcon name="search" size={18} />
              <span className="hidden sm:inline">Buscar</span>
            </Link>
            <PublicAuthControls />
          </div>
        </div>
        <nav className="header-nav-shell grid grid-cols-3 gap-1 text-center text-[11px] font-black uppercase tracking-wide sm:flex sm:overflow-x-auto sm:text-sm lg:items-center lg:overflow-visible">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="header-nav-link"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center justify-end lg:flex">
          <PublicAuthControls />
        </div>
      </div>
    </header>
  );
}
