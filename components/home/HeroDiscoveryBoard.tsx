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

  function shuffleGames() {
    setSpinning(true);
    startTransition(() => {
      setSelection((current) => pickRandomGames(games, 3, current.map((game) => game.slug)));
    });
    window.setTimeout(() => setSpinning(false), 560);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-walnut/12 bg-[#f4ecde] p-4 text-wood shadow-[0_14px_34px_rgba(53,31,22,0.08)]">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-ember">
              La mesa del tabernero
            </p>
            <h2 className="font-display mt-2 text-2xl font-bold leading-tight text-wood">
              Tres recomendaciones al vuelo
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-walnut/72">
              Dale al dado y cambia la mesa en un toque.
            </p>
          </div>
          <button
            type="button"
            onClick={shuffleGames}
            aria-label="Barajar recomendaciones"
            className="group inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-ember/22 bg-white text-wood transition hover:border-ember/70 hover:bg-[#fff8ef]"
          >
            <span
              className="inline-flex"
              style={{
                animation: spinning
                   ? "heroDiceSpin 560ms cubic-bezier(0.22, 1, 0.36, 1)"
                   : "heroDiceFloat 4s ease-in-out infinite"
              }}
            >
              <BrandIcon name="dice" size={24} />
            </span>
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          {selection.map((game, index) => (
            <HeroGameRoute
              key={`${game.slug}-${index}`}
              game={game}
              label={HERO_GAME_LABELS[index] || "En la barra"}
              featured={index === 0}
            />
          ))}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-walnut/10 pt-3">
          <HeroMiniStat label="Jugadores" value={firstGame?.playersLabel || "1-6"} icon="users" />
          <HeroMiniStat label="Tiempo" value={firstGame?.playtime || "30-90 min"} icon="clock" />
          <HeroMiniStat label="Dificultad" value={firstGame?.complexity || "A elegir"} icon="gauge" />
        </div>
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
    </div>
  );
}

function HeroGameRoute({
  game,
  label,
  featured
}: {
  game: HeroGame;
  label: string;
  featured: boolean;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const coverUrl = game.coverImageUrl || siteConfig.markImage;
  const isOptimizable = Boolean(game.coverImageUrl && supabaseUrl && game.coverImageUrl.startsWith(supabaseUrl));

  return (
    <Link
      href={`/juegos/${game.slug}`}
      className={`group grid overflow-hidden rounded-md border border-walnut/12 bg-white transition hover:-translate-y-0.5 hover:border-ember/45 hover:shadow-soft ${
        featured ? "grid-cols-[92px_minmax(0,1fr)]" : "grid-cols-[64px_minmax(0,1fr)]"
      }`}
    >
      <div className={`relative ${featured ? "h-24" : "h-[78px]"}`}>
        <Image
          src={coverUrl}
          alt={game.coverImageAlt || game.title}
          fill
          sizes="(max-width: 640px) 90px, 120px"
          className="object-cover transition duration-300 group-hover:scale-105"
          unoptimized={!isOptimizable}
        />
      </div>
      <div className="min-w-0 p-3">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ember">{label}</p>
        <h3 className={`font-display mt-1 truncate font-bold text-wood ${featured ? "text-[1.65rem]" : "text-lg"}`}>
          {game.title}
        </h3>
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
    <div className="rounded-md border border-walnut/10 bg-white/72 p-2.5">
      <p className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.12em] text-walnut/52">
        <BrandIcon name={icon} size={12} />
        {label}
      </p>
      <p className="mt-1.5 truncate font-display text-base font-bold leading-none text-wood">{value}</p>
    </div>
  );
}

function pickRandomGames(games: HeroGame[], count: number, excludeSlugs: string[] = []) {
  const available = games.filter((game) => !excludeSlugs.includes(game.slug));
  const source = available.length >= count ? available : games;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
