import { Metadata } from "next";
import Link from "next/link";
import { Search, UserRound } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
import { UserAvatar } from "@/components/account/UserAvatar";
import { getPublicUsers, type PublicUserCard } from "@/lib/publicProfiles";

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
  const users = await getPublicUsers(q);
  const publicCollections = users.filter((user) => user.hasPublicCollection).length;
  const totalOwned = users.reduce((sum, user) => sum + (user.stats?.owned || 0), 0);

  return (
    <PublicShell>
      <main>
        <section className="page-hero">
          <div className="container-page grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
            <div>
              <p className="tavern-eyebrow">La taberna</p>
              <h1 className="page-hero-title">Jugadores, ludotecas y mesas abiertas</h1>
              <p className="page-hero-copy">
                Entra en la sala común para descubrir perfiles públicos, encontrar gustos parecidos y
                llevarte ideas de otras ludotecas antes de montar la próxima partida.
              </p>
              <form className="mt-7 flex max-w-xl flex-col gap-3 sm:flex-row">
                <label className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-walnut/45" size={18} />
                  <input
                    name="q"
                    defaultValue={q}
                    placeholder="Buscar por nombre de tabernero..."
                    className="field-input h-12 bg-white pl-10"
                  />
                </label>
                <button type="submit" className="button-primary h-12">
                  Buscar mesa
                </button>
              </form>
            </div>
            <div className="grid grid-cols-3 gap-3 rounded-md border border-white/10 bg-white/8 p-4 backdrop-blur">
              <DirectoryStat label="Taberneros" value={users.length} />
              <DirectoryStat label="Ludotecas" value={publicCollections} />
              <DirectoryStat label="Juegos en casa" value={totalOwned} />
            </div>
          </div>
        </section>

        <section className="container-page py-10 lg:py-14">
          {users.length === 0 ? (
            <div className="tavern-panel py-16 text-center">
              <UserRound className="mx-auto text-walnut/35" size={40} />
              <h2 className="font-display mt-5 text-3xl font-bold text-wood">No hay nadie en la barra</h2>
              <p className="mt-2 text-sm font-semibold text-walnut/60">
                Prueba con otro nombre o vuelve cuando se sienten más jugadores.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {users.map((user) => (
                <UserCard key={user.username} user={user} />
              ))}
            </div>
          )}
        </section>
      </main>
    </PublicShell>
  );
}

function DirectoryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/12 p-3 text-center">
      <p className="font-display text-3xl font-bold leading-none text-white">{value}</p>
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.1em] text-parchment/62">{label}</p>
    </div>
  );
}

function UserCard({ user }: { user: PublicUserCard }) {
  return (
    <article className="tavern-card overflow-hidden transition hover:-translate-y-0.5 hover:border-ember/45">
      <Link href={`/u/${user.username}`} className="block p-5">
        <div className="flex items-start gap-4">
          <UserAvatar src={user.avatarUrl} name={user.displayName} size="md" />
          <div className="min-w-0 flex-1">
            <h3 className="font-display truncate text-2xl font-bold leading-tight text-wood">{user.displayName}</h3>
            <p className="mt-1 truncate text-sm font-extrabold text-walnut/50">@{user.username}</p>
          </div>
        </div>

        {user.stats ? (
          <div className="mt-6 grid grid-cols-2 gap-2 text-sm">
            <MiniStat label="En casa" value={user.stats.owned} />
            <MiniStat label="Jugados" value={user.stats.played} />
            <MiniStat label="Quiere probar" value={user.stats.wantToPlay} />
            <MiniStat label="En la lista" value={user.stats.wantToBuy} />
          </div>
        ) : (
          <div className="mt-6 rounded-md border border-walnut/10 bg-white/60 px-3 py-4 text-center text-sm font-extrabold text-walnut/55">
            Ludoteca privada
          </div>
        )}

        <span className="button-secondary mt-6 w-full">Ver rincón</span>
      </Link>
    </article>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-walnut/10 bg-white/65 p-3">
      <p className="font-display text-2xl font-bold leading-none text-wood">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-walnut/45">{label}</p>
    </div>
  );
}
