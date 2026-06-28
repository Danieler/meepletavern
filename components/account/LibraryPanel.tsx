"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Gamepad2, LibraryBig, Plus, Search, ShoppingCart, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type LibraryEntry = {
  id: string;
  gameId: string;
  owned: boolean;
  wantToPlay: boolean;
  wantToBuy: boolean;
  played: boolean;
  playCount: number;
  createdAt: string;
  game: {
    id: string;
    slug: string;
    title: string;
    coverImageUrl?: string | null;
  };
};

type LibraryPanelProps = {
  embedded?: boolean;
};

const tabs = [
  { key: "all", label: "Todo", icon: LibraryBig },
  { key: "owned", label: "En casa", icon: CheckCircle2 },
  { key: "wantToPlay", label: "Quiero probar", icon: Gamepad2 },
  { key: "wantToBuy", label: "En la lista", icon: ShoppingCart },
  { key: "played", label: "Jugados", icon: Trophy }
] as const;

type TabKey = (typeof tabs)[number]["key"];

export function LibraryPanel({ embedded = false }: LibraryPanelProps) {
  const { user, loading, warning, isConfigured } = useAuth();
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [fetching, setFetching] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!user) {
      setEntries([]);
      setFetching(false);
      return;
    }

    let active = true;
    setFetching(true);
    setFeedback(null);

    fetch("/api/account/library", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | {
              entries?: LibraryEntry[];
              error?: string;
            }
          | null;

        if (!active) return;

        if (!response.ok) {
          setFeedback(payload?.error || "No hemos podido cargar tu colección.");
          setEntries([]);
          return;
        }

        setEntries(payload?.entries || []);
      })
      .catch(() => {
        if (active) {
          setFeedback("No hemos podido cargar tu colección.");
          setEntries([]);
        }
      })
      .finally(() => {
        if (active) setFetching(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  if (!isConfigured) {
    return (
      <section className="tavern-card p-6">
        <h1 className="font-display text-3xl font-bold text-wood">Mi ludoteca</h1>
        <p className="mt-3 text-sm font-semibold text-ruby">
          La zona de cuenta no está configurada todavía, así que la ludoteca personal aún no está disponible.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="tavern-card p-6">
        <h1 className="font-display text-3xl font-bold text-wood">Mi ludoteca</h1>
        <p className="mt-3 text-sm font-semibold text-walnut/65">Cargando tu sesión...</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="tavern-card p-6">
        <h1 className="font-display text-3xl font-bold text-wood">Mi ludoteca</h1>
        <p className="mt-3 text-sm font-semibold text-walnut/65">
          Entra con tu cuenta para guardar los juegos que ya tienes.
        </p>
        <Link className="button-primary mt-5 inline-flex" href="/auth?mode=login&next=%2Fmi-perfil">
          Entrar
        </Link>
      </section>
    );
  }

  const stats = {
    all: entries.length,
    owned: entries.filter((entry) => entry.owned).length,
    wantToPlay: entries.filter((entry) => entry.wantToPlay).length,
    wantToBuy: entries.filter((entry) => entry.wantToBuy).length,
    played: entries.filter((entry) => entry.played).length
  };
  const normalizedQuery = query.trim().toLowerCase();
  const filteredEntries = entries
    .filter((entry) => (activeTab === "all" ? true : entry[activeTab]))
    .filter((entry) => (normalizedQuery ? entry.game.title.toLowerCase().includes(normalizedQuery) : true));

  return (
    <section className="space-y-5">
      <section className="tavern-card overflow-hidden">
        <div className="grid gap-5 border-b border-walnut/10 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="tavern-eyebrow">{embedded ? "Ludoteca" : "Cuenta"}</p>
            <h2 className="font-display mt-2 text-3xl font-bold text-wood sm:text-4xl">Mi ludoteca</h2>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-walnut/72">
              Organiza tus juegos por lo que tienes, lo que quieres probar y lo que ya ha pasado por mesa.
            </p>
          </div>
          <Link className="button-primary" href="/juegos">
            <Plus size={17} />
            Añadir juegos
          </Link>
        </div>

        <div className="grid gap-2 border-b border-walnut/10 p-4 sm:grid-cols-5">
          {tabs.map((tab) => (
            <MetricButton
              key={tab.key}
              label={tab.label}
              count={stats[tab.key]}
              active={activeTab === tab.key}
              icon={tab.icon}
              onClick={() => setActiveTab(tab.key)}
            />
          ))}
        </div>

        <div className="p-4 sm:p-5">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-walnut/45" size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filtrar mi ludoteca..."
              className="field-input h-11 pl-10"
            />
          </label>
        </div>
      </section>

      {warning ? (
        <section className="rounded-md border border-ruby/20 bg-ruby/5 px-4 py-3 text-sm font-semibold text-ruby">
          {warning}
        </section>
      ) : null}

      {feedback ? (
        <section className="rounded-md border border-ruby/20 bg-ruby/5 px-4 py-3 text-sm font-semibold text-ruby">
          {feedback}
        </section>
      ) : null}

      {fetching ? (
        <section className="tavern-card p-6">
          <p className="text-sm font-semibold text-walnut/65">Cargando tus juegos...</p>
        </section>
      ) : entries.length ? (
        filteredEntries.length ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredEntries.map((entry) => (
              <LibraryGameCard
                key={entry.id}
                entry={entry}
                onPlayCountChange={(nextCount) =>
                  setEntries((current) =>
                    current.map((currentEntry) =>
                      currentEntry.id === entry.id ? { ...currentEntry, playCount: nextCount } : currentEntry
                    )
                  )
                }
              />
            ))}
          </div>
        ) : (
          <EmptyLibraryState title="No hay juegos en este filtro" actionLabel="Ver toda la ludoteca" onAction={() => setActiveTab("all")} />
        )
      ) : (
        <section className="tavern-card grid gap-5 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div>
            <h3 className="font-display text-2xl font-bold text-wood">Tu ludoteca empieza con una ficha</h3>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-walnut/70">
              Abre cualquier juego y marca si lo tienes, quieres jugarlo, comprarlo o ya lo has jugado.
            </p>
          </div>
          <Link className="button-primary" href="/juegos">
            <Plus size={17} />
            Explorar juegos
          </Link>
        </section>
      )}
    </section>
  );
}

function MetricButton({
  label,
  count,
  active,
  icon: Icon,
  onClick
}: {
  label: string;
  count: number;
  active: boolean;
  icon: typeof LibraryBig;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-ring rounded-md border px-3 py-3 text-left transition ${
        active
          ? "border-ember/45 bg-ember/10 text-wood shadow-sm"
          : "border-walnut/10 bg-white/55 text-walnut hover:border-walnut/25 hover:bg-white"
      }`}
    >
      <span className="flex items-center justify-between gap-3">
        <Icon size={18} />
        <span className="font-display text-2xl font-bold leading-none">{count}</span>
      </span>
      <span className="mt-2 block text-xs font-black uppercase tracking-[0.1em]">{label}</span>
    </button>
  );
}

function LibraryGameCard({
  entry,
  onPlayCountChange
}: {
  entry: LibraryEntry;
  onPlayCountChange: (nextCount: number) => void;
}) {
  const badges = [
    entry.owned ? "En casa" : null,
    entry.wantToPlay ? "Quiero probar" : null,
    entry.wantToBuy ? "En la lista" : null,
    entry.played ? "Jugado" : null
  ].filter(Boolean);

  return (
    <article className="tavern-card overflow-hidden transition hover:-translate-y-0.5 hover:border-ember/45">
      <Link href={`/juegos/${entry.game.slug}`} className="block">
        <div className="aspect-[4/3] overflow-hidden bg-walnut/8">
          {entry.game.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={entry.game.coverImageUrl}
              alt={entry.game.title}
              className="h-full w-full object-cover transition duration-500 hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-walnut/20">
              <LibraryBig size={42} />
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span key={badge} className="tavern-pill">
                {badge}
              </span>
            ))}
          </div>
          <h3 className="font-display mt-3 line-clamp-2 text-xl font-bold leading-tight text-wood">{entry.game.title}</h3>
        </div>
      </Link>
      {entry.played ? (
        <div className="border-t border-walnut/10 px-4 pb-4 pt-3">
          <LibraryPlayCountControl
            gameId={entry.gameId}
            count={entry.playCount}
            onChange={onPlayCountChange}
          />
        </div>
      ) : null}
    </article>
  );
}

function LibraryPlayCountControl({
  gameId,
  count,
  onChange
}: {
  gameId: string;
  count: number;
  onChange: (nextCount: number) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function mutate(direction: "increment" | "decrement") {
    if (pending || (direction === "decrement" && count <= 0)) {
      return;
    }

    const prevCount = count;
    setPending(true);
    setError(null);

    // Optimistically update count
    const nextCount = direction === "decrement" ? Math.max(0, count - 1) : count + 1;
    onChange(nextCount);

    try {
      const response = await fetch("/api/account/play-count", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, direction })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; count?: number } | null;

      if (!response.ok || typeof payload?.count !== "number") {
        // Rollback
        onChange(prevCount);
        setError(payload?.error || "No se pudo guardar.");
        return;
      }

      onChange(payload.count);
    } catch {
      // Rollback
      onChange(prevCount);
      setError("No se pudo guardar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-ember">Partidas</p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void mutate("decrement")}
          disabled={pending || count <= 0}
          className="focus-ring flex h-8 w-8 items-center justify-center rounded-full border border-walnut/15 bg-cream text-base font-black text-wood transition hover:border-walnut/30 hover:bg-vanilla disabled:cursor-not-allowed disabled:opacity-45"
          aria-label="Restar una partida"
        >
          −
        </button>
        <span className="min-w-6 text-center text-sm font-black text-wood">{count}</span>
        <button
          type="button"
          onClick={() => void mutate("increment")}
          disabled={pending}
          className="focus-ring flex h-8 w-8 items-center justify-center rounded-full border border-walnut/15 bg-cream text-base font-black text-wood transition hover:border-walnut/30 hover:bg-vanilla disabled:cursor-not-allowed disabled:opacity-45"
          aria-label="Sumar una partida"
        >
          +
        </button>
      </div>
      {error ? <p className="mt-2 text-xs font-semibold text-ruby">{error}</p> : null}
    </div>
  );
}

function EmptyLibraryState({ title, actionLabel, onAction }: { title: string; actionLabel: string; onAction: () => void }) {
  return (
    <section className="tavern-card p-6 text-center">
      <h3 className="font-display text-2xl font-bold text-wood">{title}</h3>
      <button type="button" onClick={onAction} className="button-secondary mt-5">
        {actionLabel}
      </button>
    </section>
  );
}
