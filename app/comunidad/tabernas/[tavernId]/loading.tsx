import { Dices, LibraryBig, Search, UsersRound } from "lucide-react";

export default function TavernSectionLoading() {
  return (
    <div className="space-y-7" aria-busy="true" aria-live="polite">
      <section className="tavern-card grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
        <div>
          <div className="h-3 w-36 animate-pulse rounded bg-ember/20 motion-reduce:animate-none" />
          <div className="mt-3 h-10 w-64 max-w-full animate-pulse rounded bg-walnut/10 motion-reduce:animate-none" />
          <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded bg-walnut/10 motion-reduce:animate-none" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-walnut/10 motion-reduce:animate-none" />
        </div>
        <div className="relative h-11 animate-pulse rounded-md border border-walnut/10 bg-white/70 motion-reduce:animate-none">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-walnut/20" size={17} />
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <article key={item} className="tavern-card overflow-hidden">
            <div className="flex aspect-[4/3] animate-pulse items-center justify-center bg-walnut/8 text-walnut/15 motion-reduce:animate-none">
              <LibraryBig size={42} />
            </div>
            <div className="p-4">
              <div className="h-6 w-3/4 animate-pulse rounded bg-walnut/10 motion-reduce:animate-none" />
            </div>
            <div className="border-t border-walnut/10 p-4">
              <div className="grid grid-cols-2 gap-2">
                <MetricSkeleton icon={LibraryBig} />
                <MetricSkeleton icon={Dices} />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <UsersRound size={15} className="text-walnut/20" />
                <div className="h-3 w-32 animate-pulse rounded bg-walnut/10 motion-reduce:animate-none" />
              </div>
              <div className="mt-4 h-11 animate-pulse rounded-md bg-ember/15 motion-reduce:animate-none" />
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function MetricSkeleton({ icon: Icon }: { icon: typeof LibraryBig }) {
  return (
    <span className="rounded-md border border-walnut/10 bg-vanilla/60 p-3 text-center">
      <Icon className="mx-auto text-ember/25" size={17} />
      <span className="mx-auto mt-2 block h-6 w-8 animate-pulse rounded bg-walnut/10 motion-reduce:animate-none" />
      <span className="mx-auto mt-2 block h-2 w-12 animate-pulse rounded bg-walnut/10 motion-reduce:animate-none" />
    </span>
  );
}
