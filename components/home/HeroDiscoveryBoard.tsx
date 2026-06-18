"use client";

import Link from "next/link";
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
    <div className="relative overflow-hidden rounded-lg border border-white/20 bg-[#2a160f]/94 p-4 text-white shadow-[0_18px_52px_rgba(42,24,18,0.24)]">
      <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(251,246,236,0.08),rgba(192,117,26,0.18)_44%,rgba(42,22,15,0.12)_100%)]" />
      <div className="absolute inset-x-6 top-0 h-px bg-white/30" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-ember">
              Mesa de descubrimiento
            </p>
            <h2 className="font-display mt-2 max-w-[10ch] text-3xl font-bold leading-[0.95] text-white sm:max-w-none">
              Tres formas de pedir partida
            </h2>
          </div>
          <button
            type="button"
            onClick={shuffleGames}
            aria-label="Barajar recomendaciones"
            className="group inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/6 text-white transition hover:border-ember/70 hover:bg-white/10"
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

        <div className="mt-4 grid gap-2.5">
          {selection.map((game, index) => (
            <HeroGameRoute
              key={`${game.slug}-${index}`}
              game={game}
              label={HERO_GAME_LABELS[index] || "En la barra"}
              featured={index === 0}
            />
          ))}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
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
  return (
    <Link
      href={`/juegos/${game.slug}`}
      className={`group grid overflow-hidden rounded-md border border-white/12 bg-black/18 transition hover:-translate-y-0.5 hover:border-ember/60 hover:bg-black/24 ${
        featured ? "grid-cols-[104px_minmax(0,1fr)]" : "grid-cols-[72px_minmax(0,1fr)]"
      }`}
    >
      <div className={`relative ${featured ? "h-28" : "h-20"}`}>
        <img
          src={game.coverImageUrl || siteConfig.markImage}
          alt={game.coverImageAlt || game.title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      </div>
      <div className="min-w-0 p-3">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ember">{label}</p>
        <h3 className={`font-display mt-1 truncate font-bold text-white ${featured ? "text-[1.9rem]" : "text-lg"}`}>
          {game.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm font-semibold leading-6 text-white/84">
          {game.reviewSummary}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] font-extrabold text-white/82">
          {typeof game.ratingScore === "number" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
              <BrandIcon name="star" size={12} />
              {game.ratingScore.toFixed(1)}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
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
    <div className="rounded-md border border-white/10 bg-white/6 p-2.5">
      <p className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/56">
        <BrandIcon name={icon} size={12} />
        {label}
      </p>
      <p className="mt-1.5 truncate font-display text-base font-bold leading-none text-white">{value}</p>
    </div>
  );
}

function pickRandomGames(games: HeroGame[], count: number, excludeSlugs: string[] = []) {
  const available = games.filter((game) => !excludeSlugs.includes(game.slug));
  const source = available.length >= count ? available : games;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
