import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BrandIcon, type BrandIconName } from "@/components/BrandIcon";
import { GameCard } from "@/components/GameCard";
import { GameSearch } from "@/components/GameSearch";
import { PublicShell } from "@/components/PublicShell";
import { RankingList } from "@/components/RankingList";
import { ReviewCard } from "@/components/ReviewCard";
import { SectionHeader } from "@/components/SectionHeader";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import {
  getBeginnerGames,
  getNewGames,
  getPopularGames,
  getReviews
} from "@/lib/catalog";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "MeepleTavern: juegos de mesa, reseñas y rankings",
  description:
    "Catálogo moderno de juegos de mesa en español con reseñas, rankings, categorías, mecánicas y recomendaciones para encontrar tu próxima partida."
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const [popularGames, reviews, beginnerGames, newGames] = await Promise.all([
    getPopularGames(6),
    getReviews(),
    getBeginnerGames(5),
    getNewGames(4)
  ]);
  const latestReviews = reviews.slice(0, 3);
  const topRanking = popularGames.slice(0, 5);
  const editorsPick = popularGames[0];

  return (
    <PublicShell>
      <main>
        <section className="container-page pt-5">
          <div className="tavern-panel relative grid min-h-[360px] overflow-hidden p-5 sm:p-8 lg:grid-cols-[minmax(430px,1fr)_minmax(300px,0.72fr)_320px] lg:items-stretch">
            <div className="relative z-10 flex flex-col justify-center py-6 lg:py-10">
              <h1 className="font-display max-w-3xl text-5xl font-black leading-[0.95] text-wood sm:text-6xl">
                Discover. Play. Love.
              </h1>
              <p className="font-display mt-2 text-3xl font-black leading-tight text-wood sm:text-4xl">
                Find your next favorite game.
              </p>
              <p className="mt-5 max-w-xl text-lg leading-7 text-walnut">
                In-depth reviews, honest ratings, and expert recommendations to help you choose
                better games and play more.
              </p>
              <div className="mt-6 max-w-2xl">
                <GameSearch variant="hero" />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-black text-walnut">
                <span>Popular Searches:</span>
                {["Deck Building", "Worker Placement", "Cooperative", "2 Player", "Party Games"].map((term) => (
                  <Link key={term} href={`/juegos?q=${encodeURIComponent(term)}`} className="tavern-pill">
                    {term}
                  </Link>
                ))}
              </div>
            </div>

            <div className="relative mt-6 min-h-[260px] overflow-hidden border-y border-walnut/20 lg:mt-0 lg:border-x lg:border-y-0">
              <Image
                src={siteConfig.heroImage}
                alt="Mesa de juegos de mesa en una taberna acogedora"
                fill
                priority
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(247,241,230,0.92),transparent_24%,transparent_76%,rgba(247,241,230,0.86))]" />
            </div>

            <aside className="relative z-10 mt-6 self-center lg:-ml-10 lg:mt-0">
              {editorsPick ? (
                <Link href={`/juegos/${editorsPick.slug}`} className="tavern-card block overflow-hidden transition hover:-translate-y-0.5">
                  <div className="relative h-11 bg-ember text-center font-display text-lg font-black uppercase leading-11 text-white">
                    Editor's Pick
                  </div>
                  <div className="relative h-28">
                    <Image
                      src={editorsPick.coverImageUrl || siteConfig.heroImage}
                      alt={editorsPick.coverImageAlt || editorsPick.title}
                      fill
                      sizes="360px"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-5">
                    <h2 className="font-display text-2xl font-black text-wood">{editorsPick.title}</h2>
                    <p className="mt-2 flex items-center gap-2 text-lg font-black text-ember">
                      <BrandIcon name="star" size={20} />
                      {editorsPick.ratings.external?.score?.toFixed(1) || "MT"}
                      <span className="text-sm text-walnut">{editorsPick.ratings.external?.label || "Recomendado"}</span>
                    </p>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-walnut/80">{editorsPick.reviewSummary}</p>
                    <div className="mt-5 flex flex-wrap gap-3 text-xs font-bold text-walnut">
                      <span className="inline-flex items-center gap-1"><BrandIcon name="users" size={15} />{editorsPick.playersLabel || "Jugadores"}</span>
                      <span className="inline-flex items-center gap-1"><BrandIcon name="clock" size={15} />{editorsPick.playtime || "Duración"}</span>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="tavern-card p-6">
                  <div className="flex items-start gap-4">
                    <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-ember/40 bg-ember/10">
                      <BrandIcon name="meeple" size={34} />
                    </span>
                    <div>
                      <p className="font-display text-xl font-black text-wood">Our Mission</p>
                      <p className="mt-2 text-sm leading-6 text-walnut/80">
                        Help gamers discover great board games through honest reviews, community
                        ratings, and thoughtful discussion.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </section>

        <section className="container-page grid gap-5 py-5 lg:grid-cols-[1.15fr_0.75fr_0.8fr]">
          <HomePanel title="Top Rated Games" icon="star" href="/rankings">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
              {popularGames.slice(0, 5).map((game) => (
                <GameCard key={game.slug} game={game} poster />
              ))}
            </div>
          </HomePanel>

          <HomePanel title="Latest Reviews" icon="star" href="/resenas">
            <div className="grid gap-3">
              {latestReviews.map((review) => (
                <ReviewCard key={review.slug} review={review} list />
              ))}
            </div>
          </HomePanel>

          <HomePanel title="Trending This Week" icon="star" href="/rankings">
            <ol className="divide-y divide-walnut/15">
              {topRanking.map((game, index) => (
                <li key={game.slug}>
                  <Link href={`/juegos/${game.slug}`} className="grid grid-cols-[34px_54px_1fr_auto] items-center gap-3 py-3 text-sm transition hover:text-ember">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-walnut font-black text-white">{index + 1}</span>
                    <span className="relative h-9 overflow-hidden rounded-md border border-walnut/20">
                      <Image src={game.coverImageUrl || siteConfig.markImage} alt="" fill sizes="54px" className="object-cover" />
                    </span>
                    <span className="min-w-0 truncate font-bold text-wood">{game.title}</span>
                    <span className="inline-flex items-center gap-1 font-black text-ember">
                      <BrandIcon name="star" size={14} />
                      {game.ratings.external?.score?.toFixed(1) || ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </HomePanel>
        </section>

        <section className="container-page grid gap-5 pb-6 lg:grid-cols-[1.1fr_1fr_260px]">
          <HomePanel title="Best By Category" icon="trophy" href="/categorias">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
              {beginnerGames.slice(0, 5).map((game) => (
                <GameCard key={game.slug} game={game} poster />
              ))}
            </div>
          </HomePanel>

          <HomePanel title="Recently Added Games" icon="star" href="/juegos">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {newGames.map((game) => (
                <GameCard key={game.slug} game={game} poster />
              ))}
            </div>
          </HomePanel>

          <HomePanel title="Browse By" icon="grid">
            <div className="grid gap-1">
              <QuickLink href="/mecanicas" title="Mechanics" icon="settings" compact />
              <QuickLink href="/tematicas" title="Themes" icon="tag" compact />
              <QuickLink href="/categorias" title="Categories" icon="crown" compact />
              <QuickLink href="/rankings" title="Top lists" icon="flame" compact />
              <QuickLink href="/juegos" title="Player Count" icon="users" compact />
            </div>
          </HomePanel>
        </section>

        <section className="container-page py-8 lg:py-12">
          <SectionHeader
            eyebrow="Juegos populares"
            title="Games worth your table"
            description="Una primera selección de juegos con buena valoración, conversación y recorrido entre aficionados."
          />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {popularGames.map((game) => (
              <GameCard key={game.slug} game={game} />
            ))}
          </div>
        </section>

        {latestReviews.length ? (
          <section className="border-y border-walnut/15 bg-[#fffaf0]/70 py-12 lg:py-16">
            <div className="container-page">
              <SectionHeader
                eyebrow="Últimas reseñas"
                title="Crónicas recién servidas"
                description="Artículos preparados para resolver dudas antes de comprar, sacar a mesa o enseñar un juego."
              />
              <div className="grid gap-5 lg:grid-cols-3">
                {latestReviews.map((review) => (
                  <ReviewCard key={review.slug} review={review} compact />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="container-page grid gap-8 py-12 lg:grid-cols-2 lg:py-16">
          <div>
            <SectionHeader
              eyebrow="Mejores para empezar"
              title="Puertas de entrada al hobby"
              description="Juegos con reglas claras, buena mesa y suficiente personalidad para abrir una colección sin perderse."
            />
            <RankingList games={beginnerGames} />
          </div>
          <div>
            <SectionHeader
              eyebrow="Nuevos en la taberna"
              title="Últimas fichas añadidas"
              description="Nuevas entradas del archivo para seguir ampliando rutas de exploración."
            />
            <div className="grid gap-4">
              {newGames.map((game) => (
                <GameCard key={game.slug} game={game} compact />
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-walnut/15 bg-parchment py-12 lg:py-16">
          <div className="container-page grid gap-5 lg:grid-cols-3">
            <SEOTextBlock title="Catálogo de juegos de mesa">
              <p>
                MeepleTavern organiza juegos por jugadores, duración, dificultad, categorías,
                mecánicas y temáticas para que encontrar una recomendación sea más rápido que
                rebuscar en una estantería llena.
              </p>
            </SEOTextBlock>
            <SEOTextBlock title="Reseñas y rankings en español">
              <p>
                Cada ficha está pensada para búsquedas reales: opinión, duración, número de
                jugadores, juegos parecidos, mejores juegos familiares, cooperativos o para dos.
              </p>
            </SEOTextBlock>
            <SEOTextBlock title="Una comunidad preparada para crecer">
              <p>
                La estructura deja espacio para colección, listas de deseos, reseñas de usuarios,
                enlaces de compra y futuras crónicas generadas o asistidas por IA.
              </p>
            </SEOTextBlock>
          </div>
        </section>

        <section className="container-page py-12 lg:py-16">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <QuickLink href="/juegos" title="Archivo de juegos" icon="grid" />
            <QuickLink href="/rankings" title="Rankings" icon="flame" />
            <QuickLink href="/resenas" title="Reseñas" icon="book" />
            <QuickLink href="/categorias" title="Categorías" icon="crown" />
          </div>
        </section>
      </main>
    </PublicShell>
  );
}

function QuickLink({
  href,
  title,
  icon,
  compact = false
}: {
  href: string;
  title: string;
  icon: BrandIconName;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-md border border-walnut/15 bg-[#fffaf0]/75 font-bold text-walnut shadow-sm transition hover:border-ember hover:text-wood ${compact ? "p-2.5" : "p-4"}`}
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-ember/10">
        <BrandIcon name={icon} size={compact ? 20 : 24} />
      </span>
      {title}
    </Link>
  );
}

function HomePanel({
  title,
  icon,
  href,
  children
}: {
  title: string;
  icon: BrandIconName;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="tavern-card p-4">
      <div className="mb-4 flex items-center justify-between gap-4 border-b border-walnut/15 pb-3">
        <h2 className="font-display flex items-center gap-2 text-lg font-black uppercase text-wood">
          <BrandIcon name={icon} size={20} />
          {title}
        </h2>
        {href ? (
          <Link href={href} className="text-xs font-black text-ember transition hover:text-wood">
            View all
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
