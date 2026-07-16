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
      <div className="container-page public-header-layout">
        <div className="public-header-brand">
          <Link href="/" prefetch={false} className="flex min-w-0 items-center gap-2.5">
            <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden sm:h-11 sm:w-11 min-[1120px]:h-12 min-[1120px]:w-12">
              <Image
                src={siteConfig.markImage}
                alt=""
                fill
                sizes="(min-width: 1120px) 48px, (min-width: 640px) 44px, 40px"
                className="object-contain"
                priority
              />
            </span>
            <span className="min-w-0">
              <span className="font-display block text-[21px] font-bold leading-[17px] text-white sm:text-[23px] sm:leading-[19px]">
                Meeple
              </span>
              <span className="font-display block text-[21px] font-bold leading-[17px] text-accent sm:text-[23px] sm:leading-[19px]">
                Tavern
              </span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2 min-[1120px]:hidden">
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
        <div className="public-header-utilities hidden min-[1120px]:flex">
          {!isSearchPage && (
            <Link
              className="header-search-button"
              href="/juegos"
              prefetch={false}
              aria-label="Buscar juegos"
              title="Buscar juegos"
            >
              <BrandIcon name="search" size={18} />
            </Link>
          )}
          <PublicAuthControls />
        </div>
      </div>
    </header>
  );
}
