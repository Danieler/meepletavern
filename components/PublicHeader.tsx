"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BrandIcon } from "@/components/BrandIcon";
import { PublicAuthControls } from "@/components/PublicAuthControls";
import { PublicDesktopNavigation, PublicMobileMenu } from "@/components/PublicNavigation";
import { siteConfig } from "@/lib/site";

export function PublicHeader() {
  const pathname = usePathname();
  const isSearchPage = pathname === "/juegos";

  return (
    <header className="tavern-header sticky top-0 z-40 text-white">
      <div className="container-page flex min-h-16 items-center justify-between gap-3 py-1.5 lg:min-h-[76px] lg:gap-5 lg:py-2">
        <div className="flex min-w-0 shrink-0 items-center justify-between gap-3 lg:w-[224px] xl:w-[250px]">
          <Link href="/" prefetch={false} className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden sm:h-12 sm:w-12 lg:h-14 lg:w-14">
              <Image
                src={siteConfig.markImage}
                alt=""
                fill
                sizes="(min-width: 1024px) 56px, (min-width: 640px) 48px, 44px"
                className="object-contain"
                priority
              />
            </span>
            <span className="min-w-0">
              <span className="font-display block text-[22px] font-bold leading-[18px] text-white sm:text-2xl sm:leading-5">
                Meeple
              </span>
              <span className="font-display block text-[22px] font-bold leading-[18px] text-ember sm:text-2xl sm:leading-5">
                Tavern
              </span>
              <span className="mt-1 hidden whitespace-nowrap text-[9px] font-black uppercase tracking-[0.14em] text-parchment/70 xl:block">
                juegos · ludotecas · tabernas
              </span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2 lg:hidden">
            {!isSearchPage && (
              <Link className="header-action w-10 px-0 sm:w-auto sm:px-3" href="/juegos" prefetch={false} aria-label="Buscar juegos">
                <BrandIcon name="search" size={18} />
                <span className="hidden sm:inline">Buscar</span>
              </Link>
            )}
            <PublicMobileMenu />
          </div>
        </div>
        <PublicDesktopNavigation />
        <div className="hidden shrink-0 items-center justify-end lg:flex">
          <PublicAuthControls />
        </div>
      </div>
    </header>
  );
}
