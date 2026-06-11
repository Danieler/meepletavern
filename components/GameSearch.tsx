import { BrandIcon } from "@/components/BrandIcon";

type GameSearchProps = {
  query?: string;
  variant?: "hero" | "compact";
};

export function GameSearch({ query, variant = "compact" }: GameSearchProps) {
  const isHero = variant === "hero";

  return (
    <form action="/juegos" className={isHero ? "flex w-full flex-col gap-3 sm:flex-row" : "flex w-full gap-2"}>
      <label className="sr-only" htmlFor={isHero ? "hero-search" : "global-search"}>
        Buscar juegos
      </label>
      <div className="relative min-w-0 flex-1">
        <BrandIcon name="search" size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-70" />
        <input
          id={isHero ? "hero-search" : "global-search"}
          name="q"
          defaultValue={query}
          placeholder="Buscar juegos, mecánicas, categorías..."
          className={`${isHero ? "min-h-14 text-base" : "min-h-11 text-sm"} focus-ring w-full rounded-md border border-walnut/25 bg-[#fffaf0] pl-11 pr-3 font-semibold text-ink shadow-sm placeholder:text-walnut/45`}
        />
      </div>
      <button className={`button-primary ${isHero ? "min-h-14 px-6" : ""}`} type="submit">
        <BrandIcon name="search" size={20} />
        Buscar
      </button>
    </form>
  );
}
