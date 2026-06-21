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

function PageHeroSkeleton({ split = false }: { split?: boolean }) {
  return (
    <section className="page-hero" aria-hidden="true">
      <div className={`container-page grid gap-8 ${split ? "lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end" : ""}`}>
        <div>
          <DarkBone className="h-3 w-28" />
          <DarkBone className="mt-4 h-11 w-full max-w-2xl sm:h-14" />
          <DarkBone className="mt-4 h-5 w-full max-w-xl" />
          <DarkBone className="mt-2 h-5 w-4/5 max-w-lg" />
          {split ? <DarkBone className="mt-7 h-12 w-full max-w-xl" /> : null}
        </div>
        {split ? (
          <div className="rounded-md border border-white/10 bg-white/5 p-4">
            <DarkBone className="h-3 w-40" />
            <div className="mt-4 grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }, (_, index) => <DarkBone key={index} className="h-16" />)}
            </div>
          </div>
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
      <PageHeroSkeleton split />
      <section className="container-page pt-8 sm:pt-10" aria-hidden="true">
        <div className="tavern-panel p-5 sm:p-6">
          <Bone className="h-4 w-32" />
          <Bone className="mt-3 h-9 w-72 max-w-full" />
          <Bone className="mt-3 h-4 w-80 max-w-full" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="rounded-md border border-walnut/10 bg-white/55 p-4">
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
        <section className="tavern-panel p-5 sm:p-6" aria-hidden="true">
          <Bone className="h-4 w-36" />
          <Bone className="mt-3 h-8 w-64" />
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="mt-5 flex gap-3 border-t border-walnut/10 pt-4 first:border-0">
              <Bone className="h-10 w-10 shrink-0 rounded-full" />
              <div className="flex-1"><Bone className="h-4 w-4/5" /><Bone className="mt-2 h-3 w-1/2" /></div>
            </div>
          ))}
        </section>
        <section aria-hidden="true">
          <Bone className="h-4 w-32" />
          <Bone className="mt-3 h-8 w-48" />
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="tavern-card mt-3 flex min-h-24 items-center gap-3 p-4">
              <Bone className="h-12 w-12 shrink-0 rounded-full" />
              <div className="flex-1"><Bone className="h-5 w-2/3" /><Bone className="mt-2 h-3 w-4/5" /></div>
            </div>
          ))}
        </section>
        <section className="tavern-panel p-5 sm:p-6 lg:col-span-2" aria-hidden="true">
          <Bone className="h-8 w-72 max-w-full" />
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.8fr_0.8fr]">
            <CardGridSkeleton count={4} />
            <RankingRowsSkeleton count={3} />
            <RankingRowsSkeleton count={3} />
          </div>
        </section>
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
    <LoadingShell label="Cargando ficha del juego">
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
