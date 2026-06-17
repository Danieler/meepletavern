import Link from "next/link";
import Image from "next/image";
import type { UserProfile } from "@prisma/client";
import { getGameCommunityUsers } from "@/lib/publicProfiles";
import { requireCurrentAppUser } from "@/lib/accountLibrary";

type GameCommunitySectionProps = {
  gameId: string;
};

export async function GameCommunitySection({ gameId }: GameCommunitySectionProps) {
  const community = await getGameCommunityUsers(gameId);
  
  let currentUser = null;
  try {
    currentUser = await requireCurrentAppUser();
  } catch {
    // Guest
  }

  const hasAny = community.owned.length > 0 || community.wantToPlay.length > 0 || community.wantToBuy.length > 0 || community.played.length > 0;

  return (
    <section className="mt-12 lg:mt-16 border-t border-ink/5 pt-12">
      <h2 className="text-2xl font-black text-ink">En la comunidad</h2>
      
      {!hasAny ? (
        <p className="mt-6 text-ink/60 font-bold italic">Todavía nadie de la comunidad ha añadido este juego.</p>
      ) : (
        <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <CommunityGroup title="Lo tienen" countLabel="usuarios lo tienen" users={community.owned} />
          <CommunityGroup title="Quieren jugarlo" countLabel="usuarios quieren jugarlo" users={community.wantToPlay} />
          <CommunityGroup title="Quieren comprarlo" countLabel="usuarios quieren comprarlo" users={community.wantToBuy} />
          <CommunityGroup title="Lo han jugado" countLabel="usuarios lo han jugado" users={community.played} />
        </div>
      )}

      {!currentUser && (
        <div className="mt-12 rounded-md bg-parchment/50 border border-ink/5 p-6 text-center">
          <p className="text-ink/70 font-bold">Crea tu ludoteca para aparecer aquí y descubrir qué juegos interesan a otros jugadores.</p>
          <div className="mt-4">
            <Link href="/auth" className="button-primary">Iniciar sesión / Crear cuenta</Link>
          </div>
        </div>
      )}
    </section>
  );
}

function CommunityGroup({ title, countLabel, users }: { title: string; countLabel: string; users: UserProfile[] }) {
  if (users.length === 0) return null;

  const displayUsers = users.slice(0, 8);
  const remaining = users.length - displayUsers.length;

  return (
    <div>
      <h3 className="text-sm font-black text-ink/40 uppercase tracking-widest">{title}</h3>
      <p className="mt-1 text-sm font-bold text-ink/55">{users.length} {countLabel}</p>
      <ul className="mt-4 space-y-3">
        {displayUsers.map((user) => (
          <li key={user.username}>
            <Link href={`/u/${user.username}`} className="flex items-center gap-2 group">
              <div className="relative h-8 w-8 overflow-hidden rounded-full border border-white bg-parchment shadow-sm">
                {user.avatarUrl ? (
                  <Image src={user.avatarUrl} alt={user.displayName || user.username} fill className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-ink/20">
                    {(user.displayName || user.username)[0].toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-sm font-bold text-ink/70 group-hover:text-ink transition line-clamp-1">{user.displayName || user.username}</span>
            </Link>
          </li>
        ))}
      </ul>
      {remaining > 0 ? (
        <details className="mt-3 pl-10">
          <summary className="cursor-pointer text-xs font-bold text-ember">Ver todos</summary>
          <ul className="mt-3 space-y-3">
            {users.slice(8).map((user) => (
              <li key={user.username}>
                <Link href={`/u/${user.username}`} className="text-sm font-bold text-ink/65 transition hover:text-ink">
                  {user.displayName || user.username}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
