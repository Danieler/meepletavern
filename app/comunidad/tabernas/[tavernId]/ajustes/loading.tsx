export default function TavernSettingsLoading() {
  return (
    <div className="grid gap-6 lg:grid-cols-2" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando ajustes…</span>
      {[0, 1].map((item) => (
        <section key={item} className="tavern-panel space-y-4 p-5 sm:p-6" aria-hidden="true">
          <Pulse className="h-3 w-28 bg-ember/15" />
          <Pulse className="h-9 w-52 max-w-full" />
          <Pulse className="h-4 w-full" />
          <Pulse className="h-11 w-full" />
          <Pulse className="h-11 w-36" />
        </section>
      ))}
    </div>
  );
}

function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-walnut/10 motion-reduce:animate-none ${className}`} />;
}
