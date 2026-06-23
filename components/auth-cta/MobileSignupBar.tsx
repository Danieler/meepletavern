"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AuthCtaButton } from "@/components/auth-cta/AuthCtaButton";
import { currentPathWithSearch } from "@/components/auth-cta/authCtaUrl";
import { useAuth } from "@/hooks/useAuth";

type MobileBarCopy = {
  text: string;
  button: string;
  intent?: string;
};

const hiddenPrefixes = ["/auth", "/admin", "/mi-perfil", "/api"];

export function MobileSignupBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    const onMenu = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setMenuOpen(detail?.open === true);
    };
    const onPrompt = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setAuthPromptOpen(detail?.open === true);
    };
    const onFilters = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setFiltersOpen(detail?.open === true);
    };
    const onSearch = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setSearchFocused(detail?.open === true);
    };

    window.addEventListener("meepletavern:mobile-menu", onMenu);
    window.addEventListener("meepletavern:auth-prompt", onPrompt);
    window.addEventListener("meepletavern:filters-panel", onFilters);
    window.addEventListener("meepletavern:search-focus", onSearch);
    return () => {
      window.removeEventListener("meepletavern:mobile-menu", onMenu);
      window.removeEventListener("meepletavern:auth-prompt", onPrompt);
      window.removeEventListener("meepletavern:filters-panel", onFilters);
      window.removeEventListener("meepletavern:search-focus", onSearch);
    };
  }, []);

  const copy = useMemo(() => getMobileBarCopy(pathname || "/"), [pathname]);
  const next = currentPathWithSearch(pathname, searchParams);
  const hidden =
    loading ||
    Boolean(user) ||
    menuOpen ||
    authPromptOpen ||
    filtersOpen ||
    searchFocused ||
    hiddenPrefixes.some((prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`)) ||
    !copy;

  if (hidden || !copy) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-lg border border-walnut/15 bg-[#2f1d16]/95 p-3 text-white shadow-2xl backdrop-blur">
        <p className="min-w-0 flex-1 text-sm font-extrabold leading-5">{copy.text}</p>
        <AuthCtaButton context="catalog" className="min-h-10 shrink-0 px-3 py-2 text-sm" next={next} intent={copy.intent}>
          {copy.button}
        </AuthCtaButton>
      </div>
    </div>
  );
}

function getMobileBarCopy(pathname: string): MobileBarCopy | null {
  if (pathname === "/") {
    return { text: "Crea tu ludoteca gratis", button: "Empezar" };
  }
  if (pathname === "/juegos") {
    return { text: "Guarda juegos mientras exploras", button: "Crear ludoteca" };
  }
  if (pathname.startsWith("/juegos/")) {
    return { text: "Guarda este juego en tu ludoteca", button: "Guardar gratis", intent: "save_game" };
  }
  if (pathname === "/taberna") {
    return { text: "Únete a la taberna", button: "Crear rincón" };
  }
  if (pathname === "/resenas") {
    return { text: "Comparte tus partidas", button: "Crear cuenta" };
  }
  if (pathname === "/rankings") {
    return { text: "Guarda tus favoritos", button: "Crear ludoteca" };
  }
  if (pathname === "/categorias" || pathname === "/mecanicas") {
    return { text: "Guarda juegos por tipo de mesa", button: "Crear ludoteca" };
  }

  return null;
}
