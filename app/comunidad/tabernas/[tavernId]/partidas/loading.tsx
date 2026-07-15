export default function TavernPlaysLoading() {
  return (
    <div className="grid gap-7 xl:grid-cols-[380px_minmax(0,1fr)] xl:items-start" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando partidas…</span>
      <section className="tavern-panel space-y-4 p-5 sm:p-6" aria-hidden="true">
        <Pulse className="h-3 w-32" />
        <Pulse className="h-9 w-56" />
        <Pulse className="h-4 w-full" />
        <Pulse className="h-11 w-full" />
        <Pulse className="h-11 w-full" />
        <Pulse className="h-40 w-full" />
        <Pulse className="h-11 w-full bg-ember/15" />
      </section>
      <section className="space-y-4" aria-hidden="true">
        <Pulse className="h-3 w-32 bg-ember/15" />
        <Pulse className="h-9 w-72 max-w-full" />
        {[0, 1, 2].map((item) => (
          <div key={item} className="tavern-card space-y-4 p-5">
            <Pulse className="h-7 w-2/3" />
            <Pulse className="h-4 w-36" />
            <Pulse className="h-4 w-full" />
          </div>
        ))}
      </section>
    </div>
  );
}

function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-walnut/10 motion-reduce:animate-none ${className}`} />;
}
