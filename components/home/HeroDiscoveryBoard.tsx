"use client";

import Link from "next/link";
import Image from "next/image";
import { startTransition, useState } from "react";
import { BrandIcon } from "@/components/BrandIcon";
import { siteConfig } from "@/lib/site";

type HeroGame = {
  slug: string;
  title: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  reviewSummary: string;
  playersLabel: string | null;
  playtime: string | null;
  complexity: string | null;
  ratingScore: number | null;
};

const HERO_GAME_LABELS = ["Selección de la casa", "Para abrir mesa", "Recién servido"] as const;

export function HeroDiscoveryBoard({ games }: { games: HeroGame[] }) {
  const [selection, setSelection] = useState(() => games.slice(0, Math.min(3, games.length)));
  const [spinning, setSpinning] = useState(false);
  const firstGame = selection[0];
  const secondaryGames = selection.slice(1);

  function shuffleGames() {
    setSpinning(true);
    startTransition(() => {
      setSelection((current) => pickRandomGames(games, 3, current.map((game) => game.slug)));
    });
    window.setTimeout(() => setSpinning(false), 560);
  }

  if (!firstGame) {
    return null;
  }

  return (
    <section className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-walnut/12 bg-[#f4ecde] text-wood shadow-[0_16px_38px_rgba(53,31,22,0.1)]">
      <div className="flex items-start justify-between gap-3 border-b border-walnut/10 bg-[#fff8ec] p-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-ember">
            La mesa del tabernero
          </p>
          <h2 className="font-display mt-1.5 text-xl font-bold leading-tight text-wood">
            Recomendaciones listas para servir
          </h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-walnut/72">
            Una mesa rápida para decidir sin perderte en filtros.
          </p>
        </div>
        <button
          type="button"
          onClick={shuffleGames}
          aria-label="Barajar recomendaciones"
          className="group inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-ember/25 bg-white text-wood shadow-sm transition hover:-translate-y-0.5 hover:border-ember/70 hover:bg-[#fff8ef]"
        >
          <span
            className="inline-flex"
            style={{
              animation: spinning
                ? "heroDiceSpin 560ms cubic-bezier(0.22, 1, 0.36, 1)"
                : "heroDiceFloat 4s ease-in-out infinite"
            }}
          >
              <BrandIcon name="dice" size={22} />
          </span>
        </button>
      </div>

      <div className="grid flex-1 gap-2.5 p-3">
        <HeroFeaturedGame game={firstGame} />

        <div className="grid gap-2">
          {secondaryGames.map((game, index) => (
            <HeroGameRoute
              key={`${game.slug}-${index}`}
              game={game}
              label={HERO_GAME_LABELS[index + 1] || "En la barra"}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-walnut/10 bg-[#fff8ec] p-3">
        <HeroMiniStat label="Jugadores" value={firstGame.playersLabel || "1-6"} icon="users" />
        <HeroMiniStat label="Tiempo" value={firstGame.playtime || "30-90 min"} icon="clock" />
        <HeroMiniStat label="Dificultad" value={firstGame.complexity || "A elegir"} icon="gauge" />
      </div>

      <style jsx>{`
        @keyframes heroDiceFloat {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-4px) rotate(6deg);
          }
        }

        @keyframes heroDiceSpin {
          from {
            transform: rotate(0deg) scale(1);
          }
          50% {
            transform: rotate(140deg) scale(1.08);
          }
          to {
            transform: rotate(280deg) scale(1);
          }
        }
      `}</style>
    </section>
  );
}

function HeroFeaturedGame({ game }: { game: HeroGame }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const coverUrl = game.coverImageUrl || siteConfig.markImage;
  const isOptimizable = Boolean(game.coverImageUrl && supabaseUrl && game.coverImageUrl.startsWith(supabaseUrl));

  return (
    <Link
      href={`/juegos/${game.slug}`}
      className="group flex min-h-0 flex-col overflow-hidden rounded-md border border-walnut/12 bg-white transition hover:-translate-y-0.5 hover:border-ember/45 hover:shadow-soft"
    >
      <div className="relative h-36 sm:h-40 lg:h-auto lg:min-h-32 lg:flex-1">
        <Image
          src={coverUrl}
          alt={game.coverImageAlt || game.title}
          fill
          sizes="(max-width: 640px) 100vw, 400px"
          className="object-cover transition duration-300 group-hover:scale-105"
          unoptimized={!isOptimizable}
        />
        <div className="absolute left-3 top-3 rounded-full bg-[#fff8ec] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-ember shadow-sm">
          Selección de la casa
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-display break-words text-2xl font-bold leading-tight text-wood">{game.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-walnut/78">
          {game.reviewSummary}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-extrabold text-walnut/80">
          {typeof game.ratingScore === "number" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-parchment px-2 py-1">
              <BrandIcon name="star" size={12} />
              {game.ratingScore.toFixed(1)}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1 rounded-full bg-parchment px-2 py-1">
            <BrandIcon name="users" size={12} />
            {game.playersLabel || "Mesa flexible"}
          </span>
        </div>
        <p className="mt-2 text-sm font-extrabold text-ember">Ver ficha</p>
      </div>
    </Link>
  );
}

function HeroGameRoute({ game, label }: { game: HeroGame; label: string }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const coverUrl = game.coverImageUrl || siteConfig.markImage;
  const isOptimizable = Boolean(game.coverImageUrl && supabaseUrl && game.coverImageUrl.startsWith(supabaseUrl));

  return (
    <Link
      href={`/juegos/${game.slug}`}
      className="group grid min-h-[84px] grid-cols-[68px_minmax(0,1fr)] overflow-hidden rounded-md border border-walnut/12 bg-white transition hover:-translate-y-0.5 hover:border-ember/45 hover:shadow-soft"
    >
      <div className="relative h-full min-h-[84px]">
        <Image
          src={coverUrl}
          alt={game.coverImageAlt || game.title}
          fill
          sizes="90px"
          className="object-cover transition duration-300 group-hover:scale-105"
          unoptimized={!isOptimizable}
        />
      </div>
      <div className="min-w-0 p-2.5">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ember">{label}</p>
        <h3 className="font-display mt-1 break-words text-base font-bold leading-tight text-wood">{game.title}</h3>
        <p className="mt-1 line-clamp-2 text-xs font-semibold leading-4 text-walnut/74">
          {game.reviewSummary}
        </p>
      </div>
    </Link>
  );
}

function HeroMiniStat({
  label,
  value,
  icon
}: {
  label: string;
  value: string;
  icon: "users" | "clock" | "gauge";
}) {
  return (
    <div className="min-w-0 rounded-md border border-walnut/10 bg-white/72 p-2 text-center">
      <p className="flex min-w-0 flex-col items-center gap-0.5 text-[9px] font-black uppercase leading-tight tracking-[0.08em] text-walnut/52 min-[380px]:text-[10px]">
        <BrandIcon name={icon} size={12} />
        {label}
      </p>
      <p className="mt-1 break-words font-display text-xs font-bold leading-tight text-wood min-[380px]:text-sm">{value}</p>
    </div>
  );
}

function pickRandomGames(games: HeroGame[], count: number, excludeSlugs: string[] = []) {
  const available = games.filter((game) => !excludeSlugs.includes(game.slug));
  const source = available.length >= count ? available : games;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
