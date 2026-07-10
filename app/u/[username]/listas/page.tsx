import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProfileVisibility } from "@prisma/client";
import { PublicShell } from "@/components/PublicShell";
import { PublicListsSection } from "@/components/lists/PublicListsSection";
import { getPublicUserListsPage } from "@/lib/gameLists";
import { getPublicProfileByUsername } from "@/lib/publicProfiles";
import { siteConfig } from "@/lib/site";

type ListsPageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: ListsPageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfileByUsername(username);

  if (!profile || profile.profileVisibility !== ProfileVisibility.PUBLIC) {
    return { title: "Perfil privado - MeepleTavern", robots: { index: false, follow: false } };
  }

  const title = `Listas de juegos de @${profile.username} - MeepleTavern`;
  const description = `Explora las listas de juegos de mesa públicas creadas por @${profile.username} en MeepleTavern.`;
  const url = `${siteConfig.url}/u/${profile.username}/listas`;

  return {
    title,
    description,
    alternates: {
      canonical: url
    },
    openGraph: {
      title,
      description,
      type: "website",
      url
    }
  };
}

export default async function PublicUserListsPage({
  params,
  searchParams
}: {
  params: Promise<{ username: string }>;
  searchParams?: Promise<{ cursor?: string }>;
}) {
  const [{ username }, query] = await Promise.all([
    params,
    searchParams || Promise.resolve({} as { cursor?: string })
  ]);
  const profile = await getPublicProfileByUsername(username);
  if (!profile || profile.profileVisibility !== ProfileVisibility.PUBLIC) notFound();

  const rawCursor = query.cursor?.trim() || null;
  const cursor = rawCursor && rawCursor.length <= 64 && /^[a-zA-Z0-9_-]+$/.test(rawCursor) ? rawCursor : null;
  const page = await getPublicUserListsPage({ username: profile.username, cursor });
  const displayName = profile.username;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Listas de juegos de @${profile.username}`,
    description: `Explora las listas de juegos de mesa públicas creadas por @${profile.username} en MeepleTavern.`,
    url: `${siteConfig.url}/u/${profile.username}/listas`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: page.items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteConfig.url}/u/${profile.username}/listas/${item.slug}`
      }))
    }
  };

  return (
    <PublicShell>
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <section className="bg-wood text-white">
          <div className="container-page py-10 lg:py-14">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-ember">@{profile.username}</p>
            <h1 className="font-display mt-3 text-4xl font-bold">Listas de {displayName}</h1>
            <p className="mt-3 text-sm font-semibold text-parchment/70">Selecciones públicas creadas en MeepleTavern.</p>
          </div>
        </section>
        {page.items.length ? (
          <>
            <PublicListsSection username={profile.username} displayName={displayName} lists={page.items} showAllLink={false} />
            {page.nextCursor ? (
              <div className="container-page pb-12 text-center">
                <Link
                  href={`/u/${encodeURIComponent(profile.username)}/listas?cursor=${encodeURIComponent(page.nextCursor)}`}
                  className="button-secondary"
                >
                  Siguiente página
                </Link>
              </div>
            ) : null}
          </>
        ) : (
          <section className="container-page py-16">
            <div className="tavern-panel p-8 text-center">
              <h2 className="font-display text-3xl font-bold text-wood">Sin listas públicas todavía</h2>
              <p className="mt-3 text-sm font-semibold text-walnut/60">Cuando publique una lista, aparecerá aquí.</p>
            </div>
          </section>
        )}
      </main>
    </PublicShell>
  );
}
