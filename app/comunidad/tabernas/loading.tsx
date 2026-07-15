export default function MyTavernsLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando tus tabernas…</span>

      <header>
        <div className="h-3 w-36 animate-pulse rounded bg-ember/20 motion-reduce:animate-none" />
        <div className="mt-3 h-12 w-72 max-w-full animate-pulse rounded bg-walnut/10 motion-reduce:animate-none" />
        <div className="mt-4 h-4 w-full max-w-2xl animate-pulse rounded bg-walnut/10 motion-reduce:animate-none" />
        <div className="mt-2 h-4 w-3/5 max-w-xl animate-pulse rounded bg-walnut/10 motion-reduce:animate-none" />
      </header>

      <section aria-hidden="true">
        <div className="mb-5">
          <div className="h-3 w-24 animate-pulse rounded bg-ember/20 motion-reduce:animate-none" />
          <div className="mt-3 h-9 w-56 animate-pulse rounded bg-walnut/10 motion-reduce:animate-none" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <article key={item} className="tavern-card p-5">
              <div className="h-3 w-28 animate-pulse rounded bg-ember/15 motion-reduce:animate-none" />
              <div className="mt-4 h-8 w-3/4 animate-pulse rounded bg-walnut/10 motion-reduce:animate-none" />
              <div className="mt-6 grid grid-cols-3 gap-3 border-t border-walnut/10 pt-4">
                {[0, 1, 2].map((metric) => (
                  <div key={metric} className="space-y-2 text-center">
                    <div className="mx-auto h-4 w-4 animate-pulse rounded-full bg-walnut/10 motion-reduce:animate-none" />
                    <div className="mx-auto h-6 w-8 animate-pulse rounded bg-walnut/10 motion-reduce:animate-none" />
                    <div className="mx-auto h-2 w-12 animate-pulse rounded bg-walnut/10 motion-reduce:animate-none" />
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
