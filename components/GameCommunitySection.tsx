import Link from "next/link";
import Image from "next/image";
import { getGameTavernSummary, type GameTavernSampleUser } from "@/lib/gameTavernSummary";

type GameCommunitySectionProps = {
  gameId: string;
};

export async function GameCommunitySection({ gameId }: GameCommunitySectionProps) {
  const summary = await getGameTavernSummary(gameId);
  const hasAny = summary.ownedCount > 0 || summary.wantToPlayCount > 0 || summary.playedCount > 0 || summary.ratingCount > 0;

  return (
    <section className="tavern-panel p-5 sm:p-6" aria-labelledby="game-tavern-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="tavern-eyebrow">Comunidad</p>
          <h2 id="game-tavern-title" className="font-display mt-2 text-2xl font-bold text-wood sm:text-3xl">
            En la taberna
          </h2>
        </div>
        {hasAny ? <p className="text-xs font-bold text-walnut/50">Última actividad pública</p> : null}
      </div>

      <dl className={`mt-5 grid ${summary.communityRating === null ? "grid-cols-3" : "grid-cols-2"} gap-2`}>
        <TavernCount value={summary.ownedCount} label="lo tienen" />
        <TavernCount value={summary.wantToPlayCount} label="quieren jugarlo" />
        <TavernCount value={summary.playedCount} label="lo han jugado" />
        {summary.communityRating !== null ? <TavernCount value={summary.communityRating.toFixed(1)} label="nota comunidad" /> : null}
      </dl>

      {summary.sampleUsers.length ? (
        <ul className="mt-5 divide-y divide-walnut/10">
          {summary.sampleUsers.map((user) => (
            <TavernUser key={user.id} user={user} />
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-sm font-semibold text-walnut/60">Sé el primero en añadirlo a tu ludoteca.</p>
      )}
    </section>
  );
}

export function GameCommunitySectionSkeleton() {
  return (
    <section className="tavern-panel p-5 sm:p-6" aria-label="Cargando comunidad" aria-busy="true">
      <div className="h-4 w-24 animate-pulse rounded-md bg-walnut/10" />
      <div className="mt-3 h-8 w-44 animate-pulse rounded-md bg-walnut/10" />
      <div className="mt-5 grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-md bg-walnut/10" />
        ))}
      </div>
      <span className="sr-only">Cargando información de la comunidad</span>
    </section>
  );
}

function TavernCount({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="min-w-0 rounded-md border border-walnut/10 bg-white/65 px-2 py-3 text-center sm:px-4">
      <dd className="font-display text-2xl font-bold leading-none text-wood">{value}</dd>
      <dt className="mt-2 text-[11px] font-bold leading-4 text-walnut/55 sm:text-xs">{label}</dt>
    </div>
  );
}

function TavernUser({ user }: { user: GameTavernSampleUser }) {
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <Link
        href={`/u/${user.username}`}
        prefetch={false}
        className="group flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
        aria-label={`Ver el perfil público de ${user.name}`}
      >
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-walnut/15 bg-parchment text-xs font-black text-walnut/35">
          {user.avatarUrl ? (
            <Image src={user.avatarUrl} alt="" fill sizes="40px" className="object-cover" />
          ) : (
            user.name[0]?.toUpperCase() || "U"
          )}
        </span>
        <span className="min-w-0">
          <span className="block break-words text-sm font-black leading-5 text-ink/75 transition group-hover:text-ember">{user.name}</span>
          <span className="mt-0.5 block text-xs font-semibold text-walnut/55">{getInteractionLabel(user)}</span>
        </span>
      </Link>
    </li>
  );
}

function getInteractionLabel(user: GameTavernSampleUser) {
  if (user.status === "PLAYED") {
    return user.rating !== undefined ? `Lo ha jugado y le dio ${user.rating}/10` : "Lo ha jugado";
  }

  if (user.status === "OWNED") return "Lo tiene en casa";
  return "Quiere jugarlo";
}
