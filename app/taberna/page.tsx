import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Activity, ChevronRight, Dices, Flame, Gamepad2, Heart } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
import { GuestOnlyCta } from "@/components/auth-cta/GuestOnlyCta";
import { PublicUserDirectory } from "@/components/taberna/PublicUserDirectory";
import { TavernActivityFeed } from "@/components/taberna/TavernActivityFeed";
import { TavernGameOverview } from "@/components/taberna/TavernGameOverview";
import { TavernNowSection } from "@/components/taberna/TavernNowSection";
import { getTavernActivityFeed } from "@/lib/activity/feed";
import { getPublicUsersPage } from "@/lib/publicProfiles";
import { normalizeTavernSearch } from "@/lib/tavernSearch";
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
  
  return (
    <PublicShell>
      <main>
        <section className="page-hero !py-2 sm:!py-3">
          <div className="container-page grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center">
            <div>
              <p className="tavern-eyebrow">La taberna</p>
              <h1 className="page-hero-title !mt-1">La Taberna</h1>
              <p className="page-hero-copy !mt-2 max-w-xl text-sm sm:text-base">
                Mira qué están jugando, probando y recomendando otros taberneros.
              </p>
            </div>
            <div className="w-full">
              <Suspense fallback={<TavernHighlightsSkeleton />}>
                <TavernHighlightsWrapper />
              </Suspense>
            </div>
          </div>
        </section>

        <div className="container-page pt-7">
          <GuestOnlyCta
            title="Crea tu rincón en la taberna"
            description="Guarda tus juegos, crea listas y aparece en la actividad de la comunidad."
            buttonLabel="Unirme gratis"
            next="/taberna"
            context="tavern"
          />
        </div>

        <Suspense fallback={<TavernNowSectionSkeleton />}>
          <TavernNowSectionWrapper />
        </Suspense>

        <div className="container-page grid gap-8 py-10 lg:grid-cols-[minmax(0,3fr)_minmax(380px,2fr)] lg:items-start lg:py-14">
          <div className="w-full min-w-0 lg:col-start-2 lg:row-start-1">
            <Suspense fallback={<PublicUserDirectorySkeleton />}>
              <PublicUserDirectoryWrapper query={query} />
            </Suspense>
          </div>

          <div className="w-full min-w-0 lg:col-start-1 lg:row-start-1">
            <Suspense fallback={<TavernActivityFeedSkeleton />}>
              <TavernActivityFeedWrapper query={query} />
            </Suspense>
          </div>

          <div className="w-full min-w-0 lg:col-span-2">
            <Suspense fallback={<TavernGameOverviewSkeleton />}>
              <TavernGameOverviewWrapper />
            </Suspense>
          </div>
        </div>
      </main>
    </PublicShell>
  );
}

async function TavernHighlightsWrapper() {
  const overview = await getTavernOverview();
  return <TavernHighlights overview={overview} />;
}

async function TavernNowSectionWrapper() {
  const overviewPromise = getTavernOverview();
  const summary = await getTavernNowSummary(overviewPromise);
  return <TavernNowSection summary={summary} />;
}

async function TavernActivityFeedWrapper({ query }: { query: string }) {
  const feed = await getTavernActivityFeed({ query });
  return <TavernActivityFeed initialFeed={feed} />;
}

async function PublicUserDirectoryWrapper({ query }: { query: string }) {
  const usersPage = await getPublicUsersPage({ query });
  return <PublicUserDirectory key={query || "all"} initialPage={usersPage} query={query} />;
}

async function TavernGameOverviewWrapper() {
  const overview = await getTavernOverview();
  return <TavernGameOverview overview={overview} />;
}

// SKELETONS

function TavernHighlightsSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl animate-pulse w-full max-w-md lg:ml-auto">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4">
        <div className="h-8 w-8 rounded-full bg-white/10"></div>
        <div className="space-y-2">
          <div className="h-3 w-32 bg-white/10 rounded"></div>
          <div className="h-2 w-20 bg-white/5 rounded"></div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 h-20 bg-white/5 rounded-lg border border-white/5"></div>
        <div className="h-20 bg-white/5 rounded-lg border border-white/5"></div>
        <div className="h-20 bg-white/5 rounded-lg border border-white/5"></div>
      </div>
      <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
        <div className="h-32 w-28 bg-white/5 rounded-lg shrink-0 border border-white/5"></div>
        <div className="h-32 w-28 bg-white/5 rounded-lg shrink-0 border border-white/5"></div>
        <div className="h-32 w-28 bg-white/5 rounded-lg shrink-0 border border-white/5"></div>
      </div>
    </div>
  );
}

function TavernNowSectionSkeleton() {
  return (
    <section className="container-page pt-8 sm:pt-10">
      <div className="tavern-panel p-4 sm:p-6 animate-pulse">
        <div className="h-4 w-24 bg-walnut/10 rounded mb-2"></div>
        <div className="h-10 w-64 bg-walnut/10 rounded"></div>
        <div className="scrollbar-hide -mx-4 sm:-mx-6 mt-6 flex w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] max-w-[calc(100%+2rem)] sm:max-w-[calc(100%+3rem)] gap-3 overflow-hidden px-4 sm:px-6 pb-3 sm:mx-0 sm:grid sm:w-auto sm:max-w-none sm:grid-cols-2 xl:grid-cols-4 sm:px-0 sm:pb-0 sm:overflow-visible">
          <div className="h-52 w-[85vw] min-w-[270px] max-w-[320px] sm:w-auto shrink-0 bg-white/60 rounded-md border border-walnut/10"></div>
          <div className="h-52 w-[85vw] min-w-[270px] max-w-[320px] sm:w-auto shrink-0 bg-white/60 rounded-md border border-walnut/10"></div>
          <div className="h-52 w-[85vw] min-w-[270px] max-w-[320px] sm:w-auto shrink-0 bg-white/60 rounded-md border border-walnut/10"></div>
          <div className="h-52 w-[85vw] min-w-[270px] max-w-[320px] sm:w-auto shrink-0 bg-white/60 rounded-md border border-walnut/10"></div>
        </div>
      </div>
    </section>
  );
}

function TavernActivityFeedSkeleton() {
  return (
    <section className="tavern-panel p-4 sm:p-6 animate-pulse">
      <div className="h-4 w-24 bg-walnut/10 rounded mb-2"></div>
      <div className="h-8 w-64 bg-walnut/10 rounded mb-4"></div>
      <div className="h-11 w-full bg-walnut/10 rounded mb-8"></div>
      
      <div className="space-y-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="h-10 w-10 bg-walnut/10 rounded-full shrink-0"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-walnut/10 rounded w-3/4"></div>
              <div className="h-3 bg-walnut/10 rounded w-1/4"></div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PublicUserDirectorySkeleton() {
  return (
    <section className="animate-pulse w-full">
      {/* Mobile Stories Skeleton (< lg) */}
      <div className="lg:hidden mb-6">
        <div className="h-4 w-36 bg-walnut/10 rounded mb-3"></div>
        <div className="scrollbar-hide -mx-4 sm:-mx-6 flex w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] max-w-[calc(100%+2rem)] sm:max-w-[calc(100%+3rem)] gap-4 overflow-hidden px-4 sm:px-6 pb-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1 shrink-0">
              <div className="h-14 w-14 rounded-full bg-walnut/10"></div>
              <div className="h-3 w-12 bg-walnut/10 rounded mt-1"></div>
              <div className="h-2 w-8 bg-walnut/5 rounded mt-0.5"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop List Skeleton (>= lg) */}
      <div className="hidden lg:block">
        <div className="h-4 w-24 bg-walnut/10 rounded mb-2"></div>
        <div className="h-8 w-48 bg-walnut/10 rounded mb-6"></div>
        <div className="grid gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-walnut/5 rounded-md border border-walnut/10"></div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TavernGameOverviewSkeleton() {
  return (
    <section className="tavern-panel p-4 sm:p-6 lg:col-span-2 animate-pulse" aria-hidden="true">
      <div className="border-b border-walnut/10 pb-4">
        <div className="h-3 w-20 bg-walnut/10 rounded mb-2"></div>
        <div className="h-7 w-56 bg-walnut/10 rounded"></div>
      </div>

      {/* Mobile/Tablet Skeleton: Tabs + Active Tab Content (< lg) */}
      <div className="lg:hidden">
        {/* Segmented control track */}
        <div className="mt-4 flex gap-1 bg-walnut/5 p-1 rounded-lg">
          <div className="h-8 bg-white/70 rounded-md flex-1"></div>
          <div className="h-8 bg-walnut/5 rounded-md flex-1"></div>
          <div className="h-8 bg-walnut/5 rounded-md flex-1"></div>
        </div>
        {/* Content skeleton for first tab */}
        <div className="mt-4">
          <div className="h-4 w-44 bg-walnut/10 rounded mb-3"></div>
          <div className="grid gap-2 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[76px] bg-walnut/5 rounded-md border border-walnut/10"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Skeleton: 3 Columns (>= lg) */}
      <div className="hidden lg:grid lg:grid-cols-[1.4fr_0.8fr_0.8fr] lg:gap-6 lg:mt-6">
        <div>
          <div className="h-4 w-44 bg-walnut/10 rounded mb-3"></div>
          <div className="grid gap-2 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[76px] bg-walnut/5 rounded-md border border-walnut/10"></div>
            ))}
          </div>
        </div>
        <div>
          <div className="h-4 w-32 bg-walnut/10 rounded mb-3"></div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-[60px] bg-walnut/5 rounded-md border border-walnut/10"></div>
            ))}
          </div>
        </div>
        <div>
          <div className="h-4 w-32 bg-walnut/10 rounded mb-3"></div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-[60px] bg-walnut/5 rounded-md border border-walnut/10"></div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

import { TavernOverview } from "@/lib/tavernOverview";

function TavernHighlights({ overview }: { overview: TavernOverview }) {
  const { highlights, mostWanted } = overview;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/40 p-1 backdrop-blur-xl shadow-2xl lg:ml-auto w-full sm:max-w-[380px] transition-all duration-500 hover:bg-black/50 hover:border-white/20">
      {/* Animated glowing border effect */}
      <div className="absolute -inset-[100%] z-0 animate-[spin_10s_linear_infinite] bg-gradient-to-r from-transparent via-ember/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      
      <div className="relative z-10 rounded-lg bg-[#0a0a0a]/90 p-3 backdrop-blur-md border border-white/5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-ember/20 ring-1 ring-ember/30">
              <div className="absolute inset-0 rounded-full animate-ping bg-ember/30" />
              <Activity className="text-ember relative z-10" size={14} />
            </div>
            <div>
              <h2 className="font-display text-xs font-black uppercase tracking-[0.1em] text-parchment/90 leading-tight">
                El pulso de la taberna
              </h2>
              <p className="text-[10px] font-bold text-parchment/50 uppercase tracking-wider mt-0.5">Últimos 7 días</p>
            </div>
          </div>
        </div>

        {/* Bento Grid Stats */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {/* Big Stat */}
          <Link href="#actividad" className="relative overflow-hidden rounded-lg border border-white/5 bg-white/5 p-2 transition duration-300 hover:bg-white/10 hover:border-ember/30 group/stat">
            <div className="absolute -right-5 -bottom-5 opacity-[0.03] group-hover/stat:opacity-10 transition-opacity duration-500 group-hover/stat:scale-110">
              <Activity size={74} />
            </div>
            <div className="relative">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-parchment/50 mb-1">Movimientos</p>
                <p className="font-display text-3xl font-bold leading-none text-white">{highlights.weeklyActivityCount}</p>
              </div>
            </div>
          </Link>

          {/* Small Stats */}
          <Link href="#ultimos-juegos" className="relative overflow-hidden rounded-lg border border-white/5 bg-white/5 p-2 transition duration-300 hover:bg-white/10 hover:border-ember/30 group/stat">
            <Dices size={13} className="text-parchment/40 mb-1 group-hover/stat:text-parchment/80 transition-colors" />
            <p className="font-display text-xl font-bold leading-none text-white">{highlights.weeklyLibraryAdds}</p>
            <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-parchment/50">Añadidos</p>
          </Link>

          <Link href="#juegos-mas-queridos" className="relative overflow-hidden rounded-lg border border-white/5 bg-white/5 p-2 transition duration-300 hover:bg-white/10 hover:border-ember/30 group/stat">
            <Heart size={13} className="text-parchment/40 mb-1 group-hover/stat:text-ember transition-colors" />
            <p className="font-display text-xl font-bold leading-none text-white">{highlights.topWantedGame?.count || 0}</p>
            <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-parchment/50">Deseos</p>
          </Link>
        </div>

        {/* Feature: Mini Trending Games */}
        {mostWanted && mostWanted.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-parchment/60 flex items-center gap-1.5">
                <Flame size={12} className="text-ember" /> Tendencias actuales
              </p>
              <Link href="#juegos-mas-queridos" className="text-[10px] font-bold uppercase tracking-wider text-parchment/40 hover:text-ember transition-colors flex items-center gap-0.5">
                Ver todos <ChevronRight size={10} />
              </Link>
            </div>
            
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1 snap-x">
              {mostWanted.slice(0, 3).map((game) => (
                <Link 
                  key={game.gameId}
                  href={`/juegos/${encodeURIComponent(game.slug)}`}
                  className="group/game relative grid w-[112px] flex-none grid-cols-[38px_minmax(0,1fr)] items-center gap-2 rounded-md border border-white/5 bg-black/40 p-1.5 transition duration-300 hover:bg-white/10 hover:border-ember/30 snap-start"
                >
                  <div className="relative h-[38px] w-[38px] overflow-hidden rounded bg-white/5 shadow-inner">
                    {game.coverImageUrl ? (
                      <Image
                        src={game.coverImageUrl}
                        alt={game.coverImageAlt || game.title}
                        fill
                        sizes="100px"
                        className="object-cover transition duration-500 group-hover/game:scale-110"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-white/20">
                        <Gamepad2 size={16} />
                      </div>
                    )}
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover/game:opacity-100" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-[10px] font-bold leading-tight text-white group-hover/game:text-ember transition-colors">
                      {game.title}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-1 text-[9px] font-semibold text-parchment/60">
                      <Heart size={9} className="fill-ember text-ember" /> {game.count} {game.count === 1 ? 'deseo' : 'deseos'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
