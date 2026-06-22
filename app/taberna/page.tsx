import { Metadata } from "next";
import Link from "next/link";
import { Activity, Search } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
import { PublicUserDirectory } from "@/components/taberna/PublicUserDirectory";
import { TavernActivityFeed } from "@/components/taberna/TavernActivityFeed";
import { TavernGameOverview } from "@/components/taberna/TavernGameOverview";
import { TavernNowSection } from "@/components/taberna/TavernNowSection";
import { getTavernActivityFeed } from "@/lib/activity/feed";
import { getPublicUsersPage } from "@/lib/publicProfiles";
import { normalizeTavernSearch, TAVERN_SEARCH_MAX_LENGTH, TAVERN_SEARCH_MIN_LENGTH } from "@/lib/tavernSearch";
import { getTavernOverview, type TavernActivityHighlights } from "@/lib/tavernOverview";
import { getTavernNowSummary } from "@/lib/tavernNow";

export const metadata: Metadata = {
  title: "La taberna - MeepleTavern",
  description:
    "Descubre a otros jugadores en la taberna de MeepleTavern y explora sus ludotecas públicas."
};

type TavernPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

export default async function TavernPage({ searchParams }: TavernPageProps) {
  const { q } = (await searchParams) || {};
  const query = normalizeTavernSearch(q);
  const overviewPromise = getTavernOverview();
  const [usersPage, activityFeed, overview, nowSummary] = await Promise.all([
    getPublicUsersPage({ query }),
    getTavernActivityFeed(),
    overviewPromise,
    getTavernNowSummary(overviewPromise)
  ]);

  return (
    <PublicShell>
      <main>
        <section className="page-hero">
          <div className="container-page grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
            <div>
              <p className="tavern-eyebrow">La taberna</p>
              <h1 className="page-hero-title">La Taberna</h1>
              <p className="page-hero-copy">
                Mira qué están jugando, probando y recomendando otros taberneros.
              </p>
              <form className="mt-7 flex max-w-xl flex-col gap-3 sm:flex-row">
                <label className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-walnut/45" size={18} />
                  <input
                    name="q"
                    defaultValue={query}
                    minLength={TAVERN_SEARCH_MIN_LENGTH}
                    maxLength={TAVERN_SEARCH_MAX_LENGTH}
                    placeholder="Nombre de tabernero"
                    className="field-input h-12 bg-white pl-10"
                  />
                </label>
                <button type="submit" className="button-primary h-12">
                  Buscar mesa
                </button>
              </form>
            </div>
            <TavernHighlights highlights={overview.highlights} />
          </div>
        </section>

        <TavernNowSection summary={nowSummary} />

        <div className="container-page grid gap-8 py-10 lg:grid-cols-[minmax(0,3fr)_minmax(380px,2fr)] lg:items-start lg:py-14">
          <TavernActivityFeed initialFeed={activityFeed} />
          <PublicUserDirectory key={query || "all"} initialPage={usersPage} query={query} />
          <TavernGameOverview overview={overview} />
        </div>
      </main>
    </PublicShell>
  );
}

function TavernHighlights({ highlights }: { highlights: TavernActivityHighlights }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/8 p-4 backdrop-blur">
      <div className="flex items-center gap-2 text-parchment/72">
        <Activity size={17} aria-hidden="true" />
        <p className="text-xs font-black uppercase tracking-[0.1em]">Esta semana en la taberna</p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <HighlightStat
          value={highlights.weeklyActivityCount}
          label={highlights.weeklyActivityCount === 1 ? "actividad esta semana" : "actividades esta semana"}
          href="#actividad"
        />
        <HighlightStat
          value={highlights.weeklyLibraryAdds}
          label={highlights.weeklyLibraryAdds === 1 ? "juego añadido" : "juegos añadidos"}
          href="#ultimos-juegos"
        />
        <HighlightStat
          value={highlights.topWantedGame?.count || 0}
          label={highlights.topWantedGame?.count === 1 ? "persona quiere jugar" : "personas quieren jugar"}
          href="#juegos-mas-queridos"
        />
      </div>
      {highlights.topWantedGame ? (
        <p className="mt-3 break-words text-xs font-semibold leading-5 text-parchment/65">
          El juego que más apetece: {" "}
          <Link href={`/juegos/${encodeURIComponent(highlights.topWantedGame.slug)}`} prefetch={false} className="font-black text-white hover:text-ember">
            {highlights.topWantedGame.title}
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function HighlightStat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="focus-ring group min-w-0 rounded-md border border-white/10 bg-black/12 p-2.5 text-center transition hover:-translate-y-0.5 hover:border-ember/60 hover:bg-white/10"
      aria-label={`${value} ${label}. Ir a esa sección`}
    >
      <p className="font-display text-2xl font-bold leading-none text-white">{value}</p>
      <p className="mt-2 text-[10px] font-black leading-4 text-parchment/62 transition group-hover:text-parchment/85">{label}</p>
    </Link>
  );
}
