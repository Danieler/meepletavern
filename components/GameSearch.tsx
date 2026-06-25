"use client";

import { BrandIcon } from "@/components/BrandIcon";

type GameSearchProps = {
  query?: string;
  variant?: "hero" | "compact";
  submitLabel?: string;
  placeholder?: string;
};

export function GameSearch({
  query,
  variant = "compact",
  submitLabel,
  placeholder
}: GameSearchProps) {
  const isHero = variant === "hero";
  const resolvedSubmitLabel = submitLabel || (isHero ? "Buscar juegos" : "Buscar");
  const resolvedPlaceholder = placeholder || (isHero ? "Título, categoría o mecánica" : "Buscar...");

  const inputClass = isHero
    ? "min-h-14 text-base w-full rounded-lg border border-[#ebd5bf] bg-[#fffdfa] pl-11 pr-3 font-semibold text-[#451a03] shadow-[inset_0_2px_4px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] placeholder:text-sm placeholder:text-[#78350f]/60 hover:border-[#cfb088] focus:outline-none focus:border-[#d97706] focus:ring-2 focus:ring-[#d97706]/20 transition-all duration-300"
    : "min-h-11 text-sm focus-ring w-full rounded-md border border-walnut/25 bg-[#fffaf0] pl-11 pr-3 font-semibold text-ink shadow-sm placeholder:text-sm placeholder:text-walnut/45";

  const iconClass = isHero
    ? "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#b45309]/75 transition-colors"
    : "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-70";

  const buttonClass = isHero
    ? "min-h-14 px-7 text-base rounded-lg bg-gradient-to-br from-[#d97706] to-[#b45309] border border-[#78350f]/30 text-[#fffdfa] font-black tracking-wide shadow-[0_2px_5px_rgba(217,119,6,0.15)] hover:from-[#b45309] hover:to-[#92400e] hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#d97706] focus:ring-offset-2 transition-all duration-300 flex items-center justify-center gap-2"
    : "button-primary";

  return (
    <form action="/juegos" className={isHero ? "flex w-full flex-col gap-3 sm:flex-row" : "flex w-full flex-col gap-2 sm:flex-row"}>
      <label className="sr-only" htmlFor={isHero ? "hero-search" : "global-search"}>
        Buscar juegos
      </label>
      <div className="relative min-w-0 flex-1">
        <BrandIcon name="search" size={20} className={iconClass} />
        <input
          id={isHero ? "hero-search" : "global-search"}
          name="q"
          defaultValue={query}
          placeholder={resolvedPlaceholder}
          className={inputClass}
          onFocus={() => window.dispatchEvent(new CustomEvent("meepletavern:search-focus", { detail: { open: true } }))}
          onBlur={() => window.dispatchEvent(new CustomEvent("meepletavern:search-focus", { detail: { open: false } }))}
        />
      </div>
      <button className={buttonClass} type="submit">
        {resolvedSubmitLabel}
      </button>
    </form>
  );
}
