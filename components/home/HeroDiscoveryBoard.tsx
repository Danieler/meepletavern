"use client";

import Link from "next/link";
import Image from "next/image";
import { startTransition, useState } from "react";
import { BrandIcon } from "@/components/BrandIcon";
import { siteConfig } from "@/lib/site";
import { Beer } from "lucide-react";

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

const HERO_GAME_LABELS = ["🍺 La Pinta Especial", "🍺 Media Pinta", "🍺 Doble Lúpulo"] as const;

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
    <section className="relative flex h-full w-full flex-col overflow-hidden rounded-lg border border-[#92400e]/30 bg-gradient-to-b from-[#fbbf24] via-[#d97706] to-[#78350f] text-wood shadow-[0_16px_38px_rgba(120,53,15,0.25),inset_0_2px_8px_rgba(255,255,255,0.4)]">
      {/* Carbonation Bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="bubble x1"></div>
        <div className="bubble x2"></div>
        <div className="bubble x3"></div>
        <div className="bubble x4"></div>
        <div className="bubble x5"></div>
        <div className="bubble x6"></div>
        <div className="bubble x7"></div>
        <div className="bubble x8"></div>
      </div>

      {/* Foam Head (Espuma de Cerveza) */}
      <div className="relative z-10 flex items-start justify-between gap-3 border-b border-[#ebd5bf]/40 bg-gradient-to-b from-[#ffffff] to-[#fffbf2] p-3 shadow-md">
        <div>
          <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#d97706]">
            <Beer size={11} className="text-[#d97706] animate-pulse" />
            Directo del barril
          </p>
          <h2 className="font-display mt-1 text-xl font-bold leading-tight text-[#451a03]">
            Recomendaciones listas para servir
          </h2>
          <p className="mt-0.5 text-xs font-semibold leading-5 text-[#78350f]/80">
            Una selección fresca para decidir sin perderte en filtros.
          </p>
        </div>
        <button
          type="button"
          onClick={shuffleGames}
          aria-label="Barajar recomendaciones"
          className="group inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#d97706]/30 bg-white text-[#78350f] shadow-md transition hover:-translate-y-0.5 hover:border-[#d97706]/70 hover:bg-[#fffcf5]"
        >
          <span
            className="inline-flex"
            style={{
              animation: spinning
                ? "heroDiceSpin 560ms cubic-bezier(0.22, 1, 0.36, 1)"
                : "heroDiceFloat 4s ease-in-out infinite"
            }}
          >
            <BrandIcon name="dice" size={20} className="text-[#d97706]" />
          </span>
        </button>
      </div>

      {/* Beer Body Content */}
      <div className="relative z-10 grid flex-1 gap-2.5 p-3">
        <HeroFeaturedGame game={firstGame} />

        <div className="grid gap-2">
          {secondaryGames.map((game, index) => (
            <HeroGameRoute
              key={`${game.slug}-${index}`}
              game={game}
              label={HERO_GAME_LABELS[index + 1] || "🍺 En la barra"}
            />
          ))}
        </div>
      </div>

      {/* Stat Bar (Brass/Wooden Tray style) */}
      <div className="relative z-10 grid grid-cols-3 gap-2 border-t border-[#ebd5bf]/30 bg-[#fffdfa] p-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)]">
        <HeroMiniStat label="Jugadores" value={firstGame.playersLabel || "1-6"} icon="users" />
        <HeroMiniStat label="Tiempo" value={firstGame.playtime || "30-90 min"} icon="clock" />
        <HeroMiniStat label="Dificultad" value={firstGame.complexity || "A elegir"} icon="gauge" />
      </div>

      <style jsx global>{`
        @keyframes floatUp {
          0% {
            bottom: -10%;
            transform: translateX(0) scale(0.8);
            opacity: 0;
          }
          10% {
            opacity: 0.7;
          }
          90% {
            opacity: 0.7;
          }
          100% {
            bottom: 110%;
            transform: translateX(15px) scale(1.2);
            opacity: 0;
          }
        }

        .bubble {
          position: absolute;
          background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.15) 70%);
          border-radius: 50%;
          bottom: -20px;
          animation: floatUp 6s infinite linear;
        }

        .x1 { left: 8%; width: 5px; height: 5px; animation-duration: 7s; animation-delay: 0s; }
        .x2 { left: 28%; width: 4px; height: 4px; animation-duration: 5s; animation-delay: 1.2s; }
        .x3 { left: 48%; width: 7px; height: 7px; animation-duration: 8s; animation-delay: 0.3s; }
        .x4 { left: 72%; width: 5px; height: 5px; animation-duration: 6s; animation-delay: 2.2s; }
        .x5 { left: 18%; width: 6px; height: 6px; animation-duration: 7.5s; animation-delay: 3.5s; }
        .x6 { left: 58%; width: 4px; height: 4px; animation-duration: 5.5s; animation-delay: 2.7s; }
        .x7 { left: 88%; width: 8px; height: 8px; animation-duration: 9s; animation-delay: 0.8s; }
        .x8 { left: 40%; width: 5px; height: 5px; animation-duration: 6.5s; animation-delay: 4.5s; }

        @keyframes heroDiceFloat {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-3px) rotate(6deg);
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
      className="group flex min-h-0 flex-col overflow-hidden rounded-md border border-[#ebd5bf] bg-[#fffdfa] shadow-[0_4px_10px_rgba(120,53,15,0.08),inset_0_0_0_2px_rgba(218,170,120,0.1)] transition hover:-translate-y-0.5 hover:border-[#d97706] hover:shadow-[0_8px_20px_rgba(217,119,6,0.15)]"
    >
      <div className="relative h-36 sm:h-40 lg:h-auto lg:min-h-32 lg:flex-1">
        <Image
          src={coverUrl}
          alt={game.coverImageAlt || game.title}
          fill
          sizes="(max-width: 640px) 100vw, 400px"
          className="object-cover transition duration-300 group-hover:scale-103"
          unoptimized={!isOptimizable}
        />
        <div className="absolute left-3 top-3 rounded-full bg-[#fef3c7] border border-[#f59e0b]/40 px-3 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#92400e] shadow-sm">
          {HERO_GAME_LABELS[0]}
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-display break-words text-2xl font-bold leading-tight text-[#451a03]">{game.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-[#78350f]/80">
          {game.reviewSummary}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] font-extrabold text-[#78350f]">
          {typeof game.ratingScore === "number" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#fef3c7]/60 border border-[#f59e0b]/20 px-2 py-0.5">
              <BrandIcon name="star" size={11} className="text-[#d97706]" />
              {game.ratingScore.toFixed(1)}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f5ebd9] px-2 py-0.5">
            <BrandIcon name="users" size={11} className="text-[#92400e]/80" />
            {game.playersLabel || "Mesa flexible"}
          </span>
        </div>
        <p className="mt-2.5 text-xs font-black uppercase tracking-wider text-[#d97706] group-hover:text-[#b45309] transition-colors">
          Ver grifo de ficha →
        </p>
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
      className="group grid min-h-[84px] grid-cols-[68px_minmax(0,1fr)] overflow-hidden rounded-md border border-[#ebd5bf] bg-[#fffdfa] shadow-[0_2px_6px_rgba(120,53,15,0.06),inset_0_0_0_2px_rgba(218,170,120,0.1)] transition hover:-translate-y-0.5 hover:border-[#d97706] hover:shadow-[0_6px_15px_rgba(217,119,6,0.12)]"
    >
      <div className="relative h-full min-h-[84px]">
        <Image
          src={coverUrl}
          alt={game.coverImageAlt || game.title}
          fill
          sizes="90px"
          className="object-cover transition duration-300 group-hover:scale-103"
          unoptimized={!isOptimizable}
        />
      </div>
      <div className="min-w-0 p-2.5">
        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#d97706]">{label}</p>
        <h3 className="font-display mt-0.5 break-words text-base font-bold leading-tight text-[#451a03]">{game.title}</h3>
        <p className="mt-1 line-clamp-2 text-xs font-semibold leading-4 text-[#78350f]/80">
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
    <div className="min-w-0 rounded-md border border-[#ebd5bf]/60 bg-[#fffdfa] p-2 text-center shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <p className="flex min-w-0 flex-col items-center gap-0.5 text-[9px] font-black uppercase leading-tight tracking-[0.08em] text-[#92400e]/70 min-[380px]:text-[10px]">
        <BrandIcon name={icon} size={11} className="text-[#d97706]" />
        {label}
      </p>
      <p className="mt-0.5 break-words font-display text-xs font-bold leading-tight text-[#451a03] min-[380px]:text-sm">{value}</p>
    </div>
  );
}


function pickRandomGames(games: HeroGame[], count: number, excludeSlugs: string[] = []) {
  const available = games.filter((game) => !excludeSlugs.includes(game.slug));
  const source = available.length >= count ? available : games;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
