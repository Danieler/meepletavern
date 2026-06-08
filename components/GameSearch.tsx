import { Search } from "lucide-react";

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
        <Search
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/45"
          aria-hidden="true"
        />
        <input
          id={isHero ? "hero-search" : "global-search"}
          name="q"
          defaultValue={query}
          placeholder="Buscar juegos, mecánicas, categorías..."
          className="focus-ring min-h-11 w-full rounded-md border border-ink/15 bg-white pl-10 pr-3 text-sm font-semibold text-ink shadow-sm placeholder:text-ink/35"
        />
      </div>
      <button className="button-primary" type="submit">
        <Search size={18} aria-hidden="true" />
        Buscar
      </button>
    </form>
  );
}

