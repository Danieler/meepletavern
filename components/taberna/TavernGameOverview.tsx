import Link from "next/link";
import { Flame, Gamepad2, Heart } from "lucide-react";
import { ListGameThumbnail } from "@/components/lists/ListGameThumbnail";
import type { TavernOverview, TavernRankedGame, TavernRecentGame } from "@/lib/tavernOverview";

export function TavernGameOverview({ overview }: { overview: TavernOverview }) {
  const hasAny = overview.recentGames.length || overview.mostWanted.length || overview.mostPlayed.length;

  return (
    <section className="tavern-panel p-5 sm:p-6 lg:col-span-2" aria-labelledby="tavern-overview-title">
      <div className="border-b border-walnut/10 pb-4">
        <p className="tavern-eyebrow">En las mesas</p>
        <h2 id="tavern-overview-title" className="font-display mt-2 text-3xl font-bold text-wood">
          Lo último de la comunidad
        </h2>
      </div>

      {hasAny ? (
        <div className="mt-5 grid gap-6 lg:grid-cols-[1.4fr_0.8fr_0.8fr]">
          <div>
            <SectionTitle icon={Flame}>Últimos juegos añadidos</SectionTitle>
            {overview.recentGames.length ? (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {overview.recentGames.map((game) => <RecentGameRow key={game.gameId} game={game} />)}
              </ul>
            ) : (
              <EmptyState>La taberna acaba de abrir. Añade juegos a tu ludoteca para que aparezcan aquí.</EmptyState>
            )}
          </div>

          <Ranking title="Juegos más queridos" icon={Heart} games={overview.mostWanted} label={(count) => `${count} ${count === 1 ? "quiere" : "quieren"} probarlo`} />
          <Ranking title="Más jugados" icon={Gamepad2} games={overview.mostPlayed} label={(count) => `${count} ${count === 1 ? "lo ha" : "lo han"} jugado`} />
        </div>
      ) : (
        <EmptyState>Aún no hay suficientes movimientos en la taberna.</EmptyState>
      )}
    </section>
  );
}

function RecentGameRow({ game }: { game: TavernRecentGame }) {
  return (
    <li className="flex min-w-0 items-center gap-3 rounded-md border border-walnut/10 bg-white/65 p-3">
      <Link href={`/juegos/${game.slug}`} className="shrink-0">
        <ListGameThumbnail {...game} size={52} />
      </Link>
      <div className="min-w-0">
        <Link href={`/juegos/${game.slug}`} className="block truncate text-sm font-black text-wood hover:text-ember">
          {game.title}
        </Link>
        <p className="mt-1 line-clamp-2 text-xs font-semibold leading-4 text-walnut/55">
          {game.actorName} {game.context}
        </p>
      </div>
    </li>
  );
}

function Ranking({
  title,
  icon: Icon,
  games,
  label
}: {
  title: string;
  icon: typeof Heart;
  games: TavernRankedGame[];
  label: (count: number) => string;
}) {
  return (
    <div>
      <SectionTitle icon={Icon}>{title}</SectionTitle>
      {games.length ? (
        <ol className="mt-3 space-y-2">
          {games.map((game, index) => (
            <li key={game.gameId}>
              <Link href={`/juegos/${game.slug}`} className="group flex items-center gap-2 rounded-md border border-walnut/10 bg-white/65 px-3 py-2.5 hover:border-ember/35">
                <span className="font-display w-5 shrink-0 text-center text-lg font-bold text-ember">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black text-wood group-hover:text-ember">{game.title}</span>
                  <span className="mt-0.5 block text-[11px] font-semibold text-walnut/50">{label(game.count)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState>Aún no hay suficientes movimientos en la taberna.</EmptyState>
      )}
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: typeof Heart; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.08em] text-wood">
      <Icon size={17} className="text-ember" aria-hidden="true" />
      {children}
    </h3>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 rounded-md border border-walnut/10 bg-white/55 p-4 text-sm font-semibold leading-6 text-walnut/55">{children}</p>;
}
