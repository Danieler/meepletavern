import Link from "next/link";
import { ArrowRight, Heart, LibraryBig, ListPlus, Star } from "lucide-react";
import { ScrollCarousel } from "@/components/ui/ScrollCarousel";
import type { TavernNowSummary } from "@/lib/tavernNow";

export function TavernNowSection({ summary }: { summary: TavernNowSummary }) {
  const hasAny = Boolean(summary.mostWanted || summary.mostOwned || summary.latestRating || summary.latestList);

  return (
    <section className="container-page pt-8 sm:pt-10" aria-labelledby="tavern-now-title">
      <div className="tavern-panel p-4 sm:p-6">
        <div>
          <p className="tavern-eyebrow">La sala común</p>
          <h2 id="tavern-now-title" className="font-display mt-2 text-3xl font-bold text-wood sm:text-4xl">
            Ahora en la taberna
          </h2>
          <p className="mt-2 text-sm font-semibold text-walnut/60">
            Lo que más se está moviendo entre los taberneros.
          </p>
        </div>

        {hasAny ? (
          <ScrollCarousel
            containerClassName="-mx-4 mt-6 w-[calc(100%+2rem)] max-w-[calc(100%+2rem)] sm:mx-0 sm:w-auto sm:max-w-none"
            listClassName="flex gap-3 px-4 pb-3 scroll-px-4 sm:px-0 sm:pb-0 sm:grid sm:grid-cols-2 xl:grid-cols-4 sm:overflow-visible sm:snap-none"
          >
            <GameSignalCard
              icon={Heart}
              label="Más quieren probar"
              signal={summary.mostWanted}
              countLabel={(count) => `${count} ${count === 1 ? "tabernero quiere" : "taberneros quieren"} probarlo`}
              empty="Aún nadie ha marcado juegos para probar."
            />
            <GameSignalCard
              icon={LibraryBig}
              label="Más gente lo tiene"
              signal={summary.mostOwned}
              countLabel={(count) => `${count} ${count === 1 ? "tabernero lo tiene" : "taberneros lo tienen"} en casa`}
              empty="Aún no hay ludotecas públicas suficientes."
            />
            <RatingCard rating={summary.latestRating} />
            <ListCard list={summary.latestList} />
          </ScrollCarousel>
        ) : (
          <p className="mt-6 rounded-md border border-walnut/10 bg-white/60 p-5 text-sm font-semibold text-walnut/60">
            La taberna acaba de abrir. Añade juegos a tu ludoteca para empezar a moverla.
          </p>
        )}
      </div>
    </section>
  );
}

function GameSignalCard({
  icon: Icon,
  label,
  signal,
  countLabel,
  empty
}: {
  icon: typeof Heart;
  label: string;
  signal: TavernNowSummary["mostWanted"];
  countLabel: (count: number) => string;
  empty: string;
}) {
  return (
    <article className="group relative flex min-h-52 flex-col overflow-hidden rounded-md border border-walnut/12 bg-white/65 p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:bg-white/80 hover:shadow-md w-[85vw] min-w-[270px] max-w-[320px] sm:w-auto shrink-0 snap-start">
      <CardLabel icon={Icon}>{label}</CardLabel>
      {signal ? (
        <>
          <h3 className="font-display mt-4 text-2xl font-bold leading-tight text-wood">{signal.gameTitle}</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-walnut/70">{countLabel(signal.count)}</p>
          <p className="mt-2 text-sm leading-6 text-walnut/55">{signal.tagline}</p>
          <CardAction href={`/juegos/${encodeURIComponent(signal.gameSlug)}`}>Ver juego</CardAction>
        </>
      ) : <EmptyCard>{empty}</EmptyCard>}
    </article>
  );
}

function RatingCard({ rating }: { rating: TavernNowSummary["latestRating"] }) {
  return (
    <article className="group relative flex min-h-52 flex-col overflow-hidden rounded-md border border-walnut/12 bg-white/65 p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:bg-white/80 hover:shadow-md w-[85vw] min-w-[270px] max-w-[320px] sm:w-auto shrink-0 snap-start">
      <CardLabel icon={Star}>Última puntuación</CardLabel>
      {rating ? (
        <>
          <h3 className="font-display mt-4 text-2xl font-bold leading-tight text-wood">{rating.gameTitle}</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-walnut/70">
            <Link href={`/u/${encodeURIComponent(rating.userSlug)}`} prefetch={false} className="text-ember hover:text-wood hover:underline">
              {rating.userName}
            </Link>{" "}
            le ha puesto un {rating.rating}
          </p>
          <p className="mt-2 text-sm leading-6 text-walnut/55">Una nueva nota de la comunidad.</p>
          <CardAction href={`/juegos/${encodeURIComponent(rating.gameSlug)}`}>Ver juego</CardAction>
        </>
      ) : <EmptyCard>Todavía no hay puntuaciones públicas.</EmptyCard>}
    </article>
  );
}

function ListCard({ list }: { list: TavernNowSummary["latestList"] }) {
  return (
    <article className="group relative flex min-h-52 flex-col overflow-hidden rounded-md border border-walnut/12 bg-white/65 p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:bg-white/80 hover:shadow-md w-[85vw] min-w-[270px] max-w-[320px] sm:w-auto shrink-0 snap-start">
      <CardLabel icon={ListPlus}>Última lista creada</CardLabel>
      {list ? (
        <>
          <h3 className="font-display mt-4 text-2xl font-bold leading-tight text-wood">{list.listTitle}</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-walnut/70">
            Lista creada por{" "}
            <Link href={`/u/${encodeURIComponent(list.userSlug)}`} prefetch={false} className="text-ember hover:text-wood hover:underline">
              {list.userName}
            </Link>
          </p>
          <p className="mt-2 text-sm leading-6 text-walnut/55">
            {list.gameCount} {list.gameCount === 1 ? "juego añadido" : "juegos añadidos"}
          </p>
          <CardAction href={`/u/${encodeURIComponent(list.userSlug)}/listas/${encodeURIComponent(list.listSlug)}`}>Abrir lista</CardAction>
        </>
      ) : <EmptyCard>Aún no hay listas públicas creadas.</EmptyCard>}
    </article>
  );
}

function CardLabel({ icon: Icon, children }: { icon: typeof Heart; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-ember">
      <Icon size={16} aria-hidden="true" />
      {children}
    </p>
  );
}

function CardAction({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} prefetch={false} className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs font-black uppercase tracking-[0.1em] text-wood hover:text-ember">
      {children}
      <ArrowRight size={14} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

function EmptyCard({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-sm font-semibold leading-6 text-walnut/55">{children}</p>;
}
