"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BrandIcon } from "@/components/BrandIcon";
import { siteConfig } from "@/lib/site";

export type HeroGame = {
  slug: string;
  title: string;
  playersLabel: string | null;
  playtime: string | null;
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
  reviewSummary?: string | null;
};

type MesaDescubrimientoProps = {
  gamesPool: HeroGame[];
};

const FALLBACK_GAMES: HeroGame[] = [
  {
    slug: "carcassonne",
    title: "Carcassonne",
    playersLabel: "2-5 jugadores",
    playtime: "35-45 min",
    coverImageUrl: null,
    coverImageAlt: null,
    reviewSummary: "Colocación de losetas sencilla, elegante y con una curva táctica sorprendente."
  },
  {
    slug: "catan",
    title: "Catan",
    playersLabel: "3-4 jugadores",
    playtime: "60-90 min",
    coverImageUrl: null,
    coverImageAlt: null,
    reviewSummary: "Un clásico de negociación, expansión y gestión de recursos."
  },
  {
    slug: "aventureros-al-tren",
    title: "Aventureros al Tren",
    playersLabel: "2-5 jugadores",
    playtime: "30-60 min",
    coverImageUrl: null,
    coverImageAlt: null,
    reviewSummary: "Una carrera ferroviaria familiar de reglas sencillas."
  }
];

export function MesaDescubrimiento({ gamesPool }: MesaDescubrimientoProps) {
  const router = useRouter();
  const [selectedPlayers, setSelectedPlayers] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const pool = gamesPool && gamesPool.length >= 3 ? gamesPool : FALLBACK_GAMES;

  // Initialize the carousel with 3 random games
  const [carouselGames, setCarouselGames] = useState<HeroGame[]>(() => {
    return pickRandomGames(pool, 3);
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [spinning, setSpinning] = useState(false);

  const playersOptions = ["2", "3-4", "5+", "Familia"];
  const durationOptions = ["15-30 min", "30-60 min", "60+ min"];
  const typeOptions = ["Familiar", "Cooperativo", "Party", "Estratégico", "Principiantes"];

  const playersMap: Record<string, { param: string; value: string }> = {
    "2": { param: "players", value: "2" },
    "3-4": { param: "players", value: "4" },
    "5+": { param: "players", value: "6" },
    "Familia": { param: "category", value: "Familiar" }
  };

  const durationMap: Record<string, { param: string; value: string }> = {
    "15-30 min": { param: "duration", value: "30" },
    "30-60 min": { param: "duration", value: "60" },
    "60+ min": { param: "duration", value: "long" }
  };

  const typeMap: Record<string, { param: string; value: string }> = {
    "Familiar": { param: "category", value: "Familiar" },
    "Cooperativo": { param: "category", value: "Cooperativo" },
    "Party": { param: "category", value: "Party" },
    "Estratégico": { param: "weight", value: "duro" },
    "Principiantes": { param: "weight", value: "ligero" }
  };

  function handleSearch() {
    const params = new URLSearchParams();

    if (selectedPlayers) {
      const mapped = playersMap[selectedPlayers];
      if (mapped) params.append(mapped.param, mapped.value);
    }

    if (selectedDuration) {
      const mapped = durationMap[selectedDuration];
      if (mapped) params.append(mapped.param, mapped.value);
    }

    if (selectedType) {
      const mapped = typeMap[selectedType];
      if (mapped) params.append(mapped.param, mapped.value);
    }

    const queryString = params.toString();
    const targetUrl = queryString ? `/juegos?${queryString}` : "/juegos";
    router.push(targetUrl);
  }

  function shuffleGames() {
    setSpinning(true);
    // Shuffle animation matches the 560ms duration
    window.setTimeout(() => {
      setCarouselGames(pickRandomGames(pool, 3, carouselGames.map((g) => g.slug)));
      setActiveIndex(0);
      setSpinning(false);
    }, 560);
  }

  function nextSlide() {
    setActiveIndex((prev) => (prev + 1) % carouselGames.length);
  }

  function prevSlide() {
    setActiveIndex((prev) => (prev - 1 + carouselGames.length) % carouselGames.length);
  }

  function pickRandomGames(games: HeroGame[], count: number, excludeSlugs: string[] = []): HeroGame[] {
    const available = games.filter((game) => !excludeSlugs.includes(game.slug));
    const source = available.length >= count ? available : games;
    const shuffled = [...source].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  const activeGame = carouselGames[activeIndex] || carouselGames[0] || pool[0];
  const coverUrl = activeGame.coverImageUrl || siteConfig.markImage;

  return (
    <div id="descubrimiento" className="tavern-card flex flex-col gap-5 bg-paper p-5 shadow-lg border border-border-subtle rounded-xl relative">
      <div>
        <p className="text-micro font-bold uppercase tracking-eyebrow text-accent">
          Mesa de descubrimiento
        </p>
        <h2 className="font-display mt-1.5 text-2xl font-bold leading-tight text-text-primary">
          Prepara tu mesa
        </h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-text-secondary">
          Elige rápido cómo es tu partida y te servimos una selección.
        </p>
      </div>

      {/* Group 1: Players */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-eyebrow text-text-tertiary mb-2">Jugadores</h3>
        <div className="flex flex-wrap gap-1.5">
          {playersOptions.map((opt) => {
            const isSelected = selectedPlayers === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setSelectedPlayers(isSelected ? null : opt)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition border ${
                  isSelected
                    ? "bg-action text-white border-action"
                    : "bg-surface-muted text-text-secondary hover:bg-border-default border-transparent"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Group 2: Duration */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-eyebrow text-text-tertiary mb-2">Duración</h3>
        <div className="flex flex-wrap gap-1.5">
          {durationOptions.map((opt) => {
            const isSelected = selectedDuration === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setSelectedDuration(isSelected ? null : opt)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition border ${
                  isSelected
                    ? "bg-action text-white border-action"
                    : "bg-surface-muted text-text-secondary hover:bg-border-default border-transparent"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Group 3: Type */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-eyebrow text-text-tertiary mb-2">Tipo de partida</h3>
        <div className="flex flex-wrap gap-1.5">
          {typeOptions.map((opt) => {
            const isSelected = selectedType === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setSelectedType(isSelected ? null : opt)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition border ${
                  isSelected
                    ? "bg-action text-white border-action"
                    : "bg-surface-muted text-text-secondary hover:bg-border-default border-transparent"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action CTA */}
      <button
        type="button"
        onClick={handleSearch}
        className="button-primary w-full py-3 justify-center text-center font-semibold tracking-ui"
      >
        Ver recomendaciones
      </button>

      {/* Selection of the house carousel block */}
      <div className="border-t border-border-subtle pt-4 mt-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-accent animate-pulse"></span>
            <span className="text-micro font-bold uppercase tracking-eyebrow text-accent">
              Selección de la casa
            </span>
          </div>

          <button
            type="button"
            onClick={shuffleGames}
            aria-label="Barajar recomendaciones"
            className="group flex h-8 w-8 items-center justify-center rounded-full border border-accent/20 bg-paper text-text-primary hover:border-accent transition shadow-sm hover:bg-surface-muted/30"
          >
            <span
              className="inline-flex"
              style={{
                animation: spinning
                  ? "heroDiceSpin 560ms cubic-bezier(0.22, 1, 0.36, 1)"
                  : "heroDiceFloat 4s ease-in-out infinite"
              }}
            >
              <BrandIcon name="dice" size={16} className="text-accent" />
            </span>
          </button>
        </div>

        <div className="rounded-lg border border-border-subtle bg-paper p-3 shadow-sm relative overflow-hidden transition-all duration-300">
          {/* Card body */}
          <Link
            href={`/juegos/${activeGame.slug}`}
            prefetch={false}
            className="group grid grid-cols-[68px_minmax(0,1fr)] gap-3 items-start"
          >
            <div className="relative h-[68px] w-[68px] rounded overflow-hidden border border-border-subtle bg-surface-muted/20 shrink-0">
              <Image
                src={coverUrl}
                alt={activeGame.coverImageAlt || activeGame.title}
                fill
                sizes="68px"
                className="object-cover transition duration-300 group-hover:scale-105"
                unoptimized
              />
            </div>
            <div className="min-w-0">
              <h4 className="font-display font-bold text-text-primary group-hover:text-action transition truncate text-base leading-snug">
                {activeGame.title}
              </h4>
              <p className="text-[11px] font-semibold text-text-tertiary truncate mt-0.5">
                {activeGame.playersLabel || "Mesa flexible"} · {activeGame.playtime || "Tiempo variable"}
              </p>
              {activeGame.reviewSummary && (
                <p className="text-[10px] leading-normal text-text-secondary line-clamp-2 mt-1">
                  {activeGame.reviewSummary}
                </p>
              )}
            </div>
          </Link>

          {/* Carousel indicators and navigation */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border-subtle">
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Juego anterior"
              className="p-1 text-text-secondary hover:text-action transition rounded hover:bg-surface-muted"
            >
              <BrandIcon name="chevron-left" size={14} />
            </button>

            {/* Dots */}
            <div className="flex gap-1.5">
              {carouselGames.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === activeIndex ? "bg-accent scale-125 w-3" : "bg-border-strong/50 hover:bg-border-strong"
                  }`}
                  aria-label={`Ir al juego ${idx + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={nextSlide}
              aria-label="Siguiente juego"
              className="p-1 text-text-secondary hover:text-action transition rounded hover:bg-surface-muted"
            >
              <BrandIcon name="chevron-right" size={14} />
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes heroDiceFloat {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-2px) rotate(6deg);
          }
        }

        @keyframes heroDiceSpin {
          from {
            transform: rotate(0deg) scale(1);
          }
          50% {
            transform: rotate(180deg) scale(1.1);
          }
          to {
            transform: rotate(360deg) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
