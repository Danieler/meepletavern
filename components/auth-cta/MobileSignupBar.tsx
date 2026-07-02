"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AuthCtaButton } from "@/components/auth-cta/AuthCtaButton";
import { useAuth } from "@/hooks/useAuth";

type MobileBarCopy = {
  text: string;
  button: string;
  intent?: string;
};

const hiddenPrefixes = ["/auth", "/admin", "/mi-perfil", "/api"];

export function MobileSignupBar() {
  const pathname = usePathname();
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
  const next = pathname || "/";
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
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-xl border border-ember/25 bg-[#251610]/95 p-3.5 text-white shadow-2xl backdrop-blur-md">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ember/20 text-ember text-sm leading-none">
          ✨
        </div>
        <p className="min-w-0 flex-1 text-sm font-extrabold leading-snug">{copy.text}</p>
        <AuthCtaButton
          context="catalog"
          className="min-h-10 shrink-0 px-4 py-2 text-xs font-black bg-ember border-none hover:bg-ember-strong text-white rounded-md shadow-md transition-all active:scale-[0.98]"
          next={copy.intent ? next : undefined}
          intent={copy.intent}
        >
          {copy.button}
        </AuthCtaButton>
      </div>
    </div>
  );
}

function getMobileBarCopy(pathname: string): MobileBarCopy | null {
  if (pathname === "/") {
    return { text: "No pierdas tu próximo juego.", button: "Guardar" };
  }
  if (pathname === "/juegos") {
    return { text: "Guarda juegos mientras exploras.", button: "Guardar" };
  }
  if (pathname.startsWith("/juegos/")) {
    return { text: "Déjalo en tu ludoteca para después.", button: "Guardar", intent: "save_game" };
  }
  if (pathname === "/taberna") {
    return { text: "Guarda tu rincón en la taberna.", button: "Entrar" };
  }
  if (pathname === "/resenas" || pathname.startsWith("/resenas/")) {
    return null;
  }
  if (pathname === "/rankings") {
    return { text: "No pierdas tus favoritos.", button: "Guardar" };
  }
  if (pathname === "/categorias" || pathname === "/mecanicas") {
    return { text: "Guarda ideas por tipo de mesa.", button: "Guardar" };
  }

  return null;
}
