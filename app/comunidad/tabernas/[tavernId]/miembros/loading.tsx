export default function TavernMembersLoading() {
  return (
    <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando miembros…</span>
      <section className="space-y-4" aria-hidden="true">
        <Pulse className="h-3 w-28 bg-ember/15" />
        <Pulse className="h-9 w-64 max-w-full" />
        {[0, 1, 2].map((item) => (
          <div key={item} className="tavern-card flex items-center gap-4 p-5">
            <Pulse className="h-11 w-11 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Pulse className="h-6 w-48 max-w-full" />
              <Pulse className="h-3 w-24" />
            </div>
          </div>
        ))}
      </section>
      <aside className="tavern-panel space-y-4 p-5" aria-hidden="true">
        <Pulse className="h-7 w-44" />
        <Pulse className="h-4 w-full" />
        <Pulse className="h-11 w-full" />
        <Pulse className="h-11 w-full bg-ember/15" />
      </aside>
    </div>
  );
}

function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-walnut/10 motion-reduce:animate-none ${className}`} />;
}
