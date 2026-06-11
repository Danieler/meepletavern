import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, Compass, Dice5, Flame, Shield, Sparkles } from "lucide-react";
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

  return (
    <PublicShell>
      <main>
        <section className="relative overflow-hidden bg-ink text-white">
          <Image
            src={siteConfig.heroImage}
            alt="Mesa de juegos de mesa en una taberna acogedora"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(29,37,48,0.94),rgba(47,111,98,0.74)_48%,rgba(143,48,72,0.38))]" />
          <div className="container-page relative grid min-h-[620px] items-center gap-10 py-16 lg:grid-cols-[1fr_420px]">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-bold text-parchment">
                <Sparkles size={16} aria-hidden="true" />
                Taberna digital de juegos de mesa
              </p>
              <h1 className="mt-5 text-5xl font-black text-white sm:text-6xl lg:text-7xl">
                MeepleTavern
              </h1>
              <p className="mt-5 text-2xl font-bold text-parchment sm:text-3xl">
                Encuentra tu próxima partida
              </p>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/80 sm:text-lg">
                Catálogo, reseñas, rankings y recomendaciones de juegos de mesa en español, con
                alma de taberna y cabeza de archivo.
              </p>
              <div className="mt-8 max-w-2xl">
                <GameSearch variant="hero" />
              </div>
            </div>
            <aside className="rounded-md border border-white/12 bg-white/10 p-5 shadow-soft backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-ember text-ink">
                  <Dice5 size={24} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-parchment">Salón de la fama</p>
                  <h2 className="text-2xl font-black text-white">Top de la semana</h2>
                </div>
              </div>
              <ol className="mt-5 space-y-3">
                {topRanking.map((game, index) => (
                  <li key={game.slug}>
                    <Link
                      href={`/juegos/${game.slug}`}
                      className="grid grid-cols-[34px_1fr_auto] items-center gap-3 rounded-md bg-white/10 p-3 transition hover:bg-white/20"
                    >
                      <span className="font-black text-ember">{index + 1}</span>
                      <span className="font-bold text-white">{game.title}</span>
                      <span className="text-sm font-black text-parchment">{game.playersLabel || game.playtime || "Ficha"}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </section>

        <section className="container-page py-12 lg:py-16">
          <SectionHeader
            eyebrow="Juegos populares"
            title="Los títulos que más llenan mesas"
            description="Una primera selección de juegos con buena valoración, conversación y recorrido entre aficionados."
          />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {popularGames.map((game) => (
              <GameCard key={game.slug} game={game} />
            ))}
          </div>
        </section>

        {latestReviews.length ? (
          <section className="border-y border-ink/10 bg-white py-12 lg:py-16">
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

        <section className="border-t border-ink/10 bg-[#f5f7f4] py-12 lg:py-16">
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
            <QuickLink href="/juegos" title="Archivo de juegos" icon={Compass} />
            <QuickLink href="/rankings" title="Rankings" icon={Flame} />
            <QuickLink href="/resenas" title="Reseñas" icon={BookOpen} />
            <QuickLink href="/categorias" title="Categorías" icon={Shield} />
          </div>
        </section>
      </main>
    </PublicShell>
  );
}

function QuickLink({
  href,
  title,
  icon: Icon
}: {
  href: string;
  title: string;
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-md border border-ink/10 bg-white p-4 font-bold text-ink shadow-soft transition hover:border-moss/40 hover:text-moss"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-moss/10 text-moss">
        <Icon size={19} aria-hidden={true} />
      </span>
      {title}
    </Link>
  );
}
