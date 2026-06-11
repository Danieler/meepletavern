import Image from "next/image";
import { BrandIcon } from "@/components/BrandIcon";
import { siteConfig } from "@/lib/site";

type TavernHeroProps = {
  query?: string;
};

export function TavernHero({ query }: TavernHeroProps) {
  return (
    <section className="relative min-h-[620px] overflow-hidden bg-ink text-white sm:min-h-[680px]">
      <Image
        src={siteConfig.heroImage}
        alt="Mesa de juegos de mesa preparada en una taberna acogedora"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(29,37,48,0.86),rgba(29,37,48,0.58)_42%,rgba(29,37,48,0.18))]" />
      <div className="container-page relative flex min-h-[620px] items-center py-16 sm:min-h-[680px]">
        <div className="max-w-2xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white backdrop-blur">
            <BrandIcon name="star" size={18} />
            Archivo de juegos en español
          </p>
          <h1 className="text-5xl font-black text-white sm:text-6xl lg:text-7xl">
            Meeple Tavern
          </h1>
          <p className="mt-5 text-2xl font-semibold text-parchment sm:text-3xl">
            {siteConfig.claim}
          </p>
          <p className="mt-4 max-w-xl text-base leading-7 text-white/80 sm:text-lg">
            {siteConfig.subclaim}
          </p>
          <form action="/" className="mt-8 flex w-full max-w-xl flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="search">
              Buscar juegos
            </label>
            <div className="relative flex-1">
              <BrandIcon name="search" size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-70" />
              <input
                id="search"
                name="q"
                defaultValue={query}
                placeholder="Busca Catan, Arkham Horror..."
                className="focus-ring min-h-12 w-full rounded-md border border-white/20 bg-white pl-10 pr-3 text-sm font-medium text-ink shadow-soft placeholder:text-ink/40"
              />
            </div>
            <button className="button-primary bg-ember text-ink hover:bg-parchment" type="submit">
              <BrandIcon name="search" size={20} />
              Buscar
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
