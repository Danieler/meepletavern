"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BrandIcon } from "@/components/BrandIcon";
import { AuthCtaButton } from "@/components/auth-cta/AuthCtaButton";
import { PublicAuthControls } from "@/components/PublicAuthControls";
import { PublicDesktopNavigation, PublicMobileMenu } from "@/components/PublicNavigation";
import { useAuth } from "@/hooks/useAuth";
import { siteConfig } from "@/lib/site";

export function PublicHeader() {
  const pathname = usePathname();
  const isSearchPage = pathname === "/juegos";
  const { user, loading } = useAuth();

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
            {!isSearchPage && (
              <Link className="header-action w-10 px-0 sm:w-auto sm:px-3" href="/juegos" aria-label="Buscar juegos">
                <BrandIcon name="search" size={18} />
                <span className="hidden sm:inline">Buscar</span>
              </Link>
            )}
            {/* CTA visible en móvil solo para guest */}
            {!loading && !user && (
              <AuthCtaButton
                context="catalog"
                className="min-h-10 px-3 py-2 text-sm"
                aria-label="Crear mi ludoteca gratis"
              >
                Crear gratis
              </AuthCtaButton>
            )}
            <PublicMobileMenu />
          </div>
        </div>
        <PublicDesktopNavigation />
        <div className="hidden items-center justify-end lg:flex">
          <PublicAuthControls />
        </div>
      </div>
    </header>
  );
}
