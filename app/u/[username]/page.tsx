import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ProfileVisibility } from "@prisma/client";
import { PublicShell } from "@/components/PublicShell";
import { SectionHeader } from "@/components/SectionHeader";
import { GameCard } from "@/components/GameCard";
import { getPublicProfileByUsername, getPublicUserCollection } from "@/lib/publicProfiles";
import { requireCurrentAppUser } from "@/lib/accountLibrary";

type ProfilePageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfileByUsername(username);

  if (!profile) {
    return { title: "Usuario no encontrado" };
  }

  return {
    title: `${profile.displayName || profile.username} (@${profile.username}) - MeepleTavern`,
    description: profile.bio || `Perfil de ${profile.displayName || profile.username} en MeepleTavern`
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const profile = await getPublicProfileByUsername(username);

  if (!profile) {
    notFound();
  }

  let currentUser = null;
  try {
    currentUser = await requireCurrentAppUser();
  } catch {
    // Guest
  }

  const isOwner = currentUser?.id === profile.userId;
  const isProfilePublic = profile.profileVisibility === ProfileVisibility.PUBLIC;
  const isCollectionPublic = profile.collectionVisibility === ProfileVisibility.PUBLIC;

  if (!isProfilePublic && !isOwner) {
    return (
      <PublicShell>
        <main className="container-page py-20 text-center">
          <h1 className="text-2xl font-bold text-ink">Este perfil es privado.</h1>
          <p className="mt-4 text-ink/60">El usuario ha decidido mantener su perfil en privado.</p>
          <div className="mt-8">
            <Link href="/" className="button-secondary">Volver al inicio</Link>
          </div>
        </main>
      </PublicShell>
    );
  }

  const collection = await getPublicUserCollection(profile.userId);

  return (
    <PublicShell>
      <main>
        <section className="bg-parchment/30 border-b border-ink/5 py-12 lg:py-16">
          <div className="container-page flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
            <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full border-4 border-white shadow-soft bg-white flex items-center justify-center">
              {profile.avatarUrl ? (
                <Image src={profile.avatarUrl} alt={profile.displayName || profile.username} fill className="object-cover" />
              ) : (
                <span className="text-4xl font-black text-ink/20">{(profile.displayName || profile.username)[0].toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-black text-ink lg:text-4xl">{profile.displayName || profile.username}</h1>
                {isOwner && (
                  <Link href="/mi-perfil/ajustes" className="rounded-md border border-ink/10 bg-white px-3 py-1 text-xs font-bold text-ink transition hover:bg-parchment">
                    Editar perfil
                  </Link>
                )}
              </div>
              <p className="mt-1 text-lg font-bold text-ink/40">@{profile.username}</p>
              {profile.bio && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink/70">{profile.bio}</p>}
              
              <div className="mt-8 flex flex-wrap justify-center gap-4 sm:justify-start">
                <Stat label="Lo tengo" count={collection.owned.length} />
                <Stat label="Quiero jugarlo" count={collection.wantToPlay.length} />
                <Stat label="Quiero comprarlo" count={collection.wantToBuy.length} />
                <Stat label="Jugados" count={collection.played.length} />
              </div>
            </div>
            {isOwner && (
               <div className="shrink-0 pt-2">
                  <Link href="/mi-perfil" className="button-primary">Ver mi ludoteca</Link>
               </div>
            )}
          </div>
        </section>

        {!isCollectionPublic && !isOwner ? (
          <section className="container-page py-20 text-center">
            <h2 className="text-xl font-bold text-ink">Esta colección es privada.</h2>
            <p className="mt-2 text-ink/60">El usuario ha decidido no mostrar sus juegos públicamente.</p>
          </section>
        ) : (
          <>
            <CollectionSection title="Lo tengo" items={collection.owned} />
            <CollectionSection title="Quiero jugarlo" items={collection.wantToPlay} />
            <CollectionSection title="Quiero comprarlo" items={collection.wantToBuy} />
            <CollectionSection title="Lo he jugado" items={collection.played} />
          </>
        )}
      </main>
    </PublicShell>
  );
}

function Stat({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xl font-black text-ink">{count}</span>
      <span className="text-xs font-bold uppercase tracking-wide text-ink/40">{label}</span>
    </div>
  );
}

function CollectionSection({ title, items }: { title: string; items: any[] }) {
  if (items.length === 0) return null;

  return (
    <section className="container-page py-10 lg:py-14">
      <SectionHeader title={title} count={items.length} />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((entry) => (
          <GameCard key={entry.id} game={entry.game} />
        ))}
      </div>
    </section>
  );
}
