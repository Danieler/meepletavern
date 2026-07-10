import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Edit3, EyeOff, Gamepad2, LibraryBig, ListChecks, ShoppingCart, Trophy } from "lucide-react";
import { ProfileVisibility } from "@prisma/client";
import { PublicShell } from "@/components/PublicShell";
import { GameCard } from "@/components/GameCard";
import { UserAvatar } from "@/components/account/UserAvatar";
import { PublicListsSection } from "@/components/lists/PublicListsSection";
import { getPublicUserLists } from "@/lib/gameLists";
import { getPublicProfileByUsername, getPublicUserCollection, type PublicCollectionEntry } from "@/lib/publicProfiles";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { siteConfig } from "@/lib/site";

type ProfilePageProps = {
  params: Promise<{ username: string }>;
};

const collectionSections = [
  { key: "owned", title: "En casa", label: "Juegos en su colección", icon: LibraryBig },
  { key: "wantToPlay", title: "Quiere probar", label: "Pendientes de mesa", icon: Gamepad2 },
  { key: "wantToBuy", title: "En la lista", label: "Le llaman la atención", icon: ShoppingCart },
  { key: "played", title: "Ya jugó", label: "Con partida hecha", icon: Trophy }
] as const;

type CollectionMap = Record<(typeof collectionSections)[number]["key"], PublicCollectionEntry[]>;

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfileByUsername(username);

  if (!profile || profile.profileVisibility !== ProfileVisibility.PUBLIC) {
    return { title: "Perfil privado - MeepleTavern", robots: { index: false, follow: false } };
  }

  const title = `@${profile.username} - MeepleTavern`;
  const description = profile.bio || `Perfil de @${profile.username} en MeepleTavern`;
  const profileUrl = `${siteConfig.url}/u/${profile.username}`;

  return {
    title,
    description,
    alternates: {
      canonical: profileUrl
    },
    openGraph: {
      title,
      description,
      type: "profile",
      username: profile.username,
      url: profileUrl,
      ...(profile.avatarUrl && {
        images: [{ url: profile.avatarUrl }]
      })
    }
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
    // Guest users can still see public profiles.
  }

  const isOwner = currentUser?.id === profile.userId;
  const isProfilePublic = profile.profileVisibility === ProfileVisibility.PUBLIC;
  const isCollectionPublic = profile.collectionVisibility === ProfileVisibility.PUBLIC;
  const canSeeCollection = isOwner || isCollectionPublic;

  if (!isProfilePublic && !isOwner) {
    return (
      <PublicShell>
        <main className="container-page py-20">
          <section className="tavern-panel mx-auto max-w-2xl p-8 text-center">
            <EyeOff className="mx-auto text-ruby" size={36} />
            <h1 className="font-display mt-5 text-3xl font-bold text-wood">Este perfil es privado</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-walnut/65">
              El usuario ha decidido mantener su perfil fuera del directorio público.
            </p>
            <Link href="/" className="button-secondary mt-6">
              Volver al inicio
            </Link>
          </section>
        </main>
      </PublicShell>
    );
  }

  const emptyCollection: CollectionMap = { owned: [], wantToPlay: [], wantToBuy: [], played: [] };
  const [collection, publicLists] = await Promise.all([
    canSeeCollection ? getPublicUserCollection(profile.userId) : Promise.resolve(emptyCollection),
    getPublicUserLists(profile.username)
  ]);
  const displayName = profile.username;
  const totalGames = new Set(Object.values(collection).flat().map((entry) => entry.gameId)).size;
  const featuredGames = Object.values(collection)
    .flat()
    .filter((entry, index, all) => all.findIndex((candidate) => candidate.gameId === entry.gameId) === index)
    .slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: profile.username,
    url: `${siteConfig.url}/u/${profile.username}`,
    mainEntity: {
      "@type": "Person",
      name: profile.username,
      identifier: profile.username,
      ...(profile.avatarUrl && { image: profile.avatarUrl }),
      description: profile.bio || undefined
    }
  };

  return (
    <PublicShell>
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <section className="relative overflow-hidden bg-wood text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(201,130,31,0.36),transparent_30rem),linear-gradient(135deg,rgba(54,32,22,0.98),rgba(31,31,31,0.96)_56%,rgba(47,79,111,0.46))]" />
          <div className="container-page relative grid gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
            <div className="flex min-w-0 flex-col gap-6 sm:flex-row sm:items-end">
              <UserAvatar src={profile.avatarUrl} name={displayName} size="xl" className="border-white/20 bg-paper" />
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-ember">Perfil</p>
                <h1 className="font-display mt-3 text-4xl font-bold leading-tight text-white sm:text-6xl">{displayName}</h1>
                <p className="mt-2 text-sm font-extrabold text-parchment/65">@{profile.username}</p>
                {profile.bio ? (
                  <p className="mt-5 max-w-3xl text-base font-medium leading-7 text-parchment/78 sm:text-lg">{profile.bio}</p>
                ) : (
                  <p className="mt-5 max-w-3xl text-base font-medium leading-7 text-parchment/58">
                    Aún no ha contado qué juegos le gustan.
                  </p>
                )}
                {isOwner ? (
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link href="/mi-perfil/ajustes" className="button-primary">
                      <Edit3 size={17} />
                      Editar perfil
                    </Link>
                    <Link href="/mi-perfil" className="button-secondary bg-white">
                      <LibraryBig size={17} />
                      Mi ludoteca
                    </Link>
                    <Link href="/mi-perfil/listas" className="button-secondary bg-white">
                      <ListChecks size={17} />
                      Mis listas
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 rounded-md border border-white/10 bg-white/8 p-4 backdrop-blur sm:grid-cols-2">
              <HeroStat label="Juegos únicos" value={canSeeCollection ? totalGames : null} />
              <HeroStat label="En casa" value={canSeeCollection ? collection.owned.length : null} />
              <HeroStat label="Quiere probar" value={canSeeCollection ? collection.wantToPlay.length : null} />
              <HeroStat label="Jugados" value={canSeeCollection ? collection.played.length : null} />
            </div>
          </div>
        </section>

        <PublicListsSection username={profile.username} displayName={displayName} lists={publicLists} />

        {!canSeeCollection ? (
          <section className="container-page py-16">
            <div className="tavern-panel mx-auto max-w-2xl p-8 text-center">
              <EyeOff className="mx-auto text-ruby" size={34} />
              <h2 className="font-display mt-4 text-3xl font-bold text-wood">Ludoteca privada</h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-walnut/65">
                El usuario ha decidido no mostrar sus juegos públicamente.
              </p>
            </div>
          </section>
        ) : totalGames === 0 ? (
          <section className="container-page py-16">
            <div className="tavern-panel p-8 text-center">
              <h2 className="font-display text-3xl font-bold text-wood">Sin juegos todavía</h2>
              <p className="mt-3 text-sm font-semibold text-walnut/65">
                Cuando este usuario añada juegos, su ludoteca aparecerá aquí.
              </p>
            </div>
          </section>
        ) : (
          <>
            {featuredGames.length ? (
              <section className="container-page py-10 lg:py-14">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="tavern-eyebrow">Selección</p>
                    <h2 className="font-display mt-2 text-3xl font-bold text-wood">Destacados de {displayName}</h2>
                  </div>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {featuredGames.map((entry) => (
                    <GameCard key={entry.id} game={entry.game} poster />
                  ))}
                </div>
              </section>
            ) : null}

            {collectionSections.map((section) => (
              <CollectionSection
                key={section.key}
                title={section.title}
                label={section.label}
                icon={section.icon}
                items={collection[section.key]}
              />
            ))}
          </>
        )}
      </main>
    </PublicShell>
  );
}

function HeroStat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/12 p-3">
      <p className="font-display text-3xl font-bold leading-none text-white">{value ?? "Privado"}</p>
      <p className="mt-2 text-xs font-black uppercase tracking-[0.1em] text-parchment/62">{label}</p>
    </div>
  );
}

function CollectionSection({
  title,
  label,
  icon: Icon,
  items
}: {
  title: string;
  label: string;
  icon: typeof LibraryBig;
  items: PublicCollectionEntry[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="container-page py-10 lg:py-14">
      <div className="mb-7 flex flex-wrap items-center gap-3 border-b border-walnut/10 pb-4">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-ember/20 bg-ember/10 text-wood">
          <Icon size={20} />
        </span>
        <div>
          <h2 className="font-display text-2xl font-bold text-wood sm:text-3xl">{title}</h2>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-walnut/50">
            {label} · {items.length}
          </p>
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((entry) => (
          <GameCard key={entry.id} game={entry.game} />
        ))}
      </div>
    </section>
  );
}
