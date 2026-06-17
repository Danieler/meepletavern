import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PublicShell } from "@/components/PublicShell";
import { getPublicUsers, type PublicUserCard } from "@/lib/publicProfiles";

export const metadata: Metadata = {
  title: "Directorio de usuarios - MeepleTavern",
  description: "Descubre a otros jugadores en MeepleTavern y explora sus colecciones públicas."
};

type UsersPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const { q } = (await searchParams) || {};
  const users = await getPublicUsers(q);

  return (
    <PublicShell>
      <main className="container-page py-10 lg:py-16">
        <header className="mb-10 lg:mb-14">
          <p className="tavern-eyebrow">Comunidad</p>
          <h1 className="text-3xl font-black text-ink lg:text-5xl">Explorar usuarios</h1>
          <p className="mt-4 max-w-2xl text-lg text-ink/60">
            Encuentra a otros jugadores, cotillea sus ludotecas y descubre qué están jugando.
          </p>
          
          <form className="mt-8 flex max-w-md gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por nombre o usuario..."
              className="focus-ring h-12 flex-1 rounded-md border border-ink/10 bg-white px-4 text-ink shadow-sm"
            />
            <button type="submit" className="button-primary h-12">Buscar</button>
          </form>
        </header>

        {users.length === 0 ? (
          <div className="rounded-md border border-ink/5 bg-parchment/30 py-20 text-center">
            <h2 className="text-xl font-bold text-ink">No se han encontrado usuarios.</h2>
            <p className="mt-2 text-ink/60">Prueba con otro nombre o vuelve más tarde.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {users.map((user) => (
              <UserCard key={user.username} user={user} />
            ))}
          </div>
        )}
      </main>
    </PublicShell>
  );
}

function UserCard({ user }: { user: PublicUserCard }) {
  return (
    <div className="tavern-card flex flex-col items-center p-6 text-center">
      <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-white bg-parchment shadow-sm">
        {user.avatarUrl ? (
          <Image src={user.avatarUrl} alt={user.displayName} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl font-black text-ink/20">
            {user.displayName[0].toUpperCase()}
          </div>
        )}
      </div>
      <h3 className="mt-4 text-lg font-black text-ink">{user.displayName}</h3>
      <p className="text-sm font-bold text-ink/40">@{user.username}</p>
      
      {user.stats ? (
        <div className="mt-6 grid w-full grid-cols-2 gap-y-3 border-t border-ink/5 pt-5 text-sm">
          <div>
            <p className="font-black text-ink">{user.stats.owned}</p>
            <p className="text-xs font-bold text-ink/40 uppercase">Juegos</p>
          </div>
          <div>
            <p className="font-black text-ink">{user.stats.played}</p>
            <p className="text-xs font-bold text-ink/40 uppercase">Jugados</p>
          </div>
          <div>
            <p className="font-black text-ink">{user.stats.wantToPlay}</p>
            <p className="text-xs font-bold text-ink/40 uppercase">Quiere jugar</p>
          </div>
          <div>
            <p className="font-black text-ink">{user.stats.wantToBuy}</p>
            <p className="text-xs font-bold text-ink/40 uppercase">Quiere comprar</p>
          </div>
        </div>
      ) : (
        <p className="mt-6 w-full border-t border-ink/5 pt-5 text-sm font-bold text-ink/45">
          Colección privada
        </p>
      )}

      <Link href={`/u/${user.username}`} className="button-secondary mt-8 w-full">
        Ver perfil
      </Link>
    </div>
  );
}
