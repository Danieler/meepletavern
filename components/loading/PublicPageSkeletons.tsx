import { PublicShell } from "@/components/PublicShell";

function Bone({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-walnut/10 ${className}`} />;
}

function DarkBone({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-white/12 ${className}`} />;
}

function LoadingShell({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <PublicShell>
      <main aria-busy="true" aria-label={label}>
        <span className="sr-only">{label}</span>
        {children}
      </main>
    </PublicShell>
  );
}

function PageHeroSkeleton({ split = false, compact = false }: { split?: boolean; compact?: boolean }) {
  return (
    <section className={`page-hero ${compact ? "!py-2 sm:!py-3" : ""}`} aria-hidden="true">
      <div className={`container-page grid ${compact ? "gap-6" : "gap-8"} ${split ? "lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center" : ""}`}>
        <div>
          <DarkBone className="h-3 w-28" />
          <DarkBone className={`${compact ? "mt-3 h-10 sm:h-12" : "mt-4 h-11 sm:h-14"} w-full max-w-2xl`} />
          <DarkBone className={`${compact ? "mt-3" : "mt-4"} h-5 w-full max-w-xl`} />
          {!compact ? <DarkBone className="mt-2 h-5 w-4/5 max-w-lg" /> : null}
          {split && !compact ? <DarkBone className="mt-7 h-12 w-full max-w-xl" /> : null}
        </div>
        {split ? (
          compact ? (
            <div className="rounded-xl border border-white/10 bg-black/40 p-1 backdrop-blur-xl w-full max-w-full sm:max-w-[380px] lg:ml-auto">
              <div className="rounded-lg bg-[#0a0a0a]/90 p-3 border border-white/5 overflow-hidden">
                <DarkBone className="mb-2 h-3.5 w-40" />
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {Array.from({ length: 3 }, (_, index) => <DarkBone key={index} className="h-14" />)}
                </div>
                <div className="mt-2 pt-2 border-t border-white/10 space-y-2">
                  <DarkBone className="h-2.5 w-24 mb-3" />
                  <div className="flex gap-2 overflow-hidden -mx-1 px-1">
                    {Array.from({ length: 3 }, (_, index) => (
                      <div key={index} className="h-[46px] w-[112px] shrink-0 bg-white/5 rounded-md border border-white/5 flex items-center gap-2 p-1">
                        <div className="h-[38px] w-[38px] bg-white/10 rounded shrink-0"></div>
                        <div className="flex-1 space-y-1">
                          <DarkBone className="h-2 w-10" />
                          <DarkBone className="h-1.5 w-6" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 w-full max-w-sm lg:ml-auto p-4">
              <DarkBone className="mb-4 h-3.5 w-40" />
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 3 }, (_, index) => <DarkBone key={index} className="h-16" />)}
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 flex gap-2 items-center">
                <DarkBone className="h-14 w-10 shrink-0" />
                <div className="flex-1 space-y-2 py-0.5">
                  <DarkBone className="h-2.5 w-16" />
                  <DarkBone className="h-3 w-3/4" />
                  <DarkBone className="h-2 w-1/2" />
                </div>
              </div>
            </div>
          )
        ) : null}
      </div>
    </section>
  );
}

function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="tavern-card overflow-hidden">
          <Bone className="aspect-[16/10] w-full rounded-none" />
          <div className="p-4">
            <Bone className="h-5 w-3/4" />
            <Bone className="mt-3 h-4 w-full" />
            <Bone className="mt-2 h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function RankingRowsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="tavern-card divide-y divide-walnut/10 overflow-hidden" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="grid grid-cols-[44px_58px_minmax(0,1fr)] items-center gap-3 p-4">
          <Bone className="h-11 w-11" />
          <Bone className="h-14 w-14" />
          <div>
            <Bone className="h-4 w-3/4" />
            <Bone className="mt-2 h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CatalogResultsSkeleton() {
  return (
    <section className="container-page grid gap-8 py-10 lg:grid-cols-[300px_1fr] lg:py-14" aria-label="Cargando juegos" aria-busy="true">
      <aside className="tavern-panel hidden p-5 lg:block" aria-hidden="true">
        <Bone className="h-6 w-28" />
        {Array.from({ length: 6 }, (_, index) => <Bone key={index} className="mt-4 h-10 w-full" />)}
      </aside>
      <div aria-hidden="true">
        <Bone className="mb-6 h-8 w-64" />
        <CardGridSkeleton />
      </div>
      <span className="sr-only">Cargando resultados del catálogo</span>
    </section>
  );
}

export function TavernPageSkeleton() {
  return (
    <LoadingShell label="Cargando la taberna">
      <PageHeroSkeleton split compact />
      <section className="container-page pt-8 sm:pt-10" aria-hidden="true">
        <div className="tavern-panel p-4 sm:p-6">
          <Bone className="h-4 w-32" />
          <Bone className="mt-3 h-9 w-72 max-w-full" />
          <Bone className="mt-3 h-4 w-80 max-w-full" />
          <div className="scrollbar-hide -mx-4 mt-6 flex w-[calc(100%+2rem)] max-w-[calc(100%+2rem)] snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:w-auto sm:max-w-none sm:snap-none sm:grid-cols-2 xl:grid-cols-4 sm:px-0 sm:pb-0 sm:overflow-visible">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="rounded-md border border-walnut/10 bg-white/55 p-4 w-[85vw] min-w-[270px] max-w-[320px] sm:w-auto shrink-0 snap-start">
                <Bone className="h-4 w-32" />
                <Bone className="mt-5 h-7 w-4/5" />
                <Bone className="mt-3 h-4 w-full" />
                <Bone className="mt-2 h-4 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[minmax(0,3fr)_minmax(380px,2fr)] lg:items-start lg:py-14">
        <div className="w-full lg:col-start-2 lg:row-start-1">
          <section aria-hidden="true" className="w-full">
            {/* Mobile Stories Skeleton (< lg) */}
            <div className="lg:hidden mb-6">
              <Bone className="h-4 w-36 mb-3" />
              <div className="scrollbar-hide -mx-4 flex w-[calc(100%+2rem)] max-w-[calc(100%+2rem)] gap-4 overflow-x-auto px-4 pb-2">
                {Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className="flex flex-col items-center gap-1 shrink-0">
                    <div className="h-14 w-14 rounded-full bg-walnut/10 animate-pulse" />
                    <Bone className="h-3 w-12 mt-1" />
                    <Bone className="h-2.5 w-8 opacity-60 mt-0.5" />
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop List Skeleton (>= lg) */}
            <div className="hidden lg:block">
              <Bone className="h-4 w-32" />
              <Bone className="mt-3 h-8 w-48" />
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="tavern-card mt-3 flex min-h-24 items-center gap-3 p-4">
                  <Bone className="h-12 w-12 shrink-0 rounded-full" />
                  <div className="flex-1">
                    <Bone className="h-5 w-2/3" />
                    <Bone className="mt-2 h-3 w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="w-full lg:col-start-1 lg:row-start-1">
          <section className="tavern-panel p-4 sm:p-6" aria-hidden="true">
            <Bone className="h-4 w-36" />
            <Bone className="mt-3 h-8 w-64" />
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="mt-5 flex gap-3 border-t border-walnut/10 pt-4 first:border-0">
                <Bone className="h-10 w-10 shrink-0 rounded-full" />
                <div className="flex-1"><Bone className="h-4 w-4/5" /><Bone className="mt-2 h-3 w-1/2" /></div>
              </div>
            ))}
          </section>
        </div>

        <div className="w-full lg:col-span-2">
          <section className="tavern-panel p-4 sm:p-6 lg:col-span-2" aria-hidden="true">
            <div className="border-b border-walnut/10 pb-4">
              <Bone className="h-3 w-20 mb-2" />
              <Bone className="h-7 w-56" />
            </div>

            {/* Mobile/Tablet Skeleton: Tabs + Active Tab Content (< lg) */}
            <div className="lg:hidden">
              <div className="mt-4 flex gap-1 bg-walnut/5 p-1 rounded-lg">
                <div className="h-8 bg-white/70 rounded-md flex-1 animate-pulse" />
                <div className="h-8 bg-walnut/5 rounded-md flex-1 animate-pulse" />
                <div className="h-8 bg-walnut/5 rounded-md flex-1 animate-pulse" />
              </div>
              <div className="mt-4">
                <Bone className="h-4 w-44 mb-3" />
                <div className="grid gap-2 sm:grid-cols-2">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="h-[76px] rounded-md border border-walnut/10 bg-walnut/5" />
                  ))}
                </div>
              </div>
            </div>

            {/* Desktop Skeleton: 3 Columns (>= lg) */}
            <div className="hidden lg:grid lg:grid-cols-[1.4fr_0.8fr_0.8fr] lg:gap-6 lg:mt-6">
              <div>
                <Bone className="h-4 w-44 mb-3" />
                <div className="grid gap-2 sm:grid-cols-2">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="h-[76px] rounded-md border border-walnut/10 bg-walnut/5" />
                  ))}
                </div>
              </div>
              <div>
                <Bone className="h-4 w-32 mb-3" />
                <div className="space-y-2">
                  {Array.from({ length: 3 }, (_, index) => (
                    <div key={index} className="h-[60px] rounded-md border border-walnut/10 bg-walnut/5" />
                  ))}
                </div>
              </div>
              <div>
                <Bone className="h-4 w-32 mb-3" />
                <div className="space-y-2">
                  {Array.from({ length: 3 }, (_, index) => (
                    <div key={index} className="h-[60px] rounded-md border border-walnut/10 bg-walnut/5" />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </LoadingShell>
  );
}

export function ReviewsResultsSkeleton() {
  return (
    <section className="container-page py-12" aria-label="Cargando reseñas" aria-busy="true">
      <Bone className="mb-6 h-8 w-56" />
      <div className="grid gap-5" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="tavern-card grid overflow-hidden md:grid-cols-[220px_minmax(0,1fr)]">
            <Bone className="min-h-48 rounded-none" />
            <div className="p-5"><Bone className="h-4 w-24" /><Bone className="mt-4 h-7 w-3/4" /><Bone className="mt-4 h-4 w-full" /><Bone className="mt-2 h-4 w-2/3" /></div>
          </div>
        ))}
      </div>
      <span className="sr-only">Cargando listado de reseñas</span>
    </section>
  );
}

export function RankingsResultsSkeleton() {
  return (
    <section className="container-page grid gap-8 py-12 lg:grid-cols-2" aria-label="Cargando rankings" aria-busy="true">
      {Array.from({ length: 4 }, (_, index) => (
        <article key={index} aria-hidden="true">
          <Bone className="h-7 w-3/5" />
          <Bone className="mt-3 h-4 w-4/5" />
          <div className="mt-5"><RankingRowsSkeleton /></div>
        </article>
      ))}
      <span className="sr-only">Cargando listados de rankings</span>
    </section>
  );
}

export function RankingDetailPageSkeleton() {
  return (
    <LoadingShell label="Cargando ranking">
      <PageHeroSkeleton />
      <section className="container-page py-12"><RankingRowsSkeleton count={8} /></section>
    </LoadingShell>
  );
}

export function TaxonomyPageSkeleton({ label = "Cargando categorías" }: { label?: string }) {
  return (
    <LoadingShell label={label}>
      <PageHeroSkeleton />
      <section className="container-page grid gap-4 py-12 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <div key={index} className="term-card"><Bone className="h-6 w-2/3" /><Bone className="mt-3 h-4 w-1/2" /></div>
        ))}
      </section>
    </LoadingShell>
  );
}

export function GameDetailPageSkeleton() {
  return (
    <LoadingShell label="Cargando...">
      <section className="tavern-breadcrumb-bar"><div className="container-page py-4"><DarkBone className="h-4 w-52" /></div></section>
      <section className="container-page -mt-2 pb-10 pt-1">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="grid gap-6">
            <section className="tavern-panel p-4 sm:p-6">
              <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
                <div aria-hidden="true"><Bone className="aspect-[3/4] w-full" /><Bone className="mt-5 h-24 w-full" /></div>
                <div aria-hidden="true"><Bone className="h-4 w-28" /><Bone className="mt-4 h-12 w-4/5" /><Bone className="mt-5 h-5 w-full" /><Bone className="mt-2 h-5 w-11/12" /><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Bone key={index} className="h-20" />)}</div><Bone className="mt-6 h-28 w-full" /></div>
              </div>
            </section>
            <section className="tavern-panel p-6" aria-hidden="true"><Bone className="h-7 w-52" /><Bone className="mt-5 h-4 w-full" /><Bone className="mt-2 h-4 w-4/5" /><Bone className="mt-6 h-28 w-full" /></section>
          </div>
          <aside className="grid gap-5" aria-hidden="true">
            <section className="tavern-panel p-6"><Bone className="h-7 w-40" /><Bone className="mx-auto mt-5 h-28 w-28 rounded-full" /><Bone className="mt-5 h-11 w-full" /></section>
            <section className="tavern-panel p-6"><Bone className="h-7 w-44" /><div className="mt-5 grid grid-cols-3 gap-2">{Array.from({ length: 3 }, (_, index) => <Bone key={index} className="h-20" />)}</div><Bone className="mt-5 h-12 w-full" /></section>
          </aside>
        </div>
      </section>
    </LoadingShell>
  );
}

export function ReviewDetailPageSkeleton() {
  return (
    <LoadingShell label="Cargando reseña">
      <section className="page-hero">
        <div className="container-page grid gap-8 py-12 lg:grid-cols-[1fr_360px] lg:items-center" aria-hidden="true">
          <div><DarkBone className="h-4 w-32" /><DarkBone className="mt-4 h-12 w-4/5" /><DarkBone className="mt-5 h-5 w-full" /><DarkBone className="mt-2 h-5 w-3/4" /></div>
          <DarkBone className="aspect-[4/3] w-full" />
        </div>
      </section>
      <section className="container-page max-w-5xl py-12" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => <Bone key={index} className={`mt-4 h-5 ${index % 3 === 2 ? "w-3/4" : "w-full"}`} />)}
      </section>
    </LoadingShell>
  );
}
