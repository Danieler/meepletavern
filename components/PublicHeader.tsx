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
      <div className="container-page flex min-h-16 flex-col gap-2 py-1.5 lg:flex-row lg:items-center lg:gap-4 lg:py-2">
        <div className="flex min-w-0 items-center justify-between gap-3 lg:flex-[0_1_310px]">
          <Link href="/" prefetch={false} className="flex min-w-0 items-center gap-2.5 sm:gap-3 lg:max-w-[310px]">
            <span className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden sm:h-14 sm:w-14 lg:h-16 lg:w-16">
              <Image
                src={siteConfig.markImage}
                alt=""
                fill
                sizes="(min-width: 1024px) 64px, (min-width: 640px) 56px, 48px"
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
        <div className="hidden min-w-[86px] shrink-0 items-center justify-end lg:flex">
          <PublicAuthControls />
        </div>
      </div>
    </header>
  );
}
