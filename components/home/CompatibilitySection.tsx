"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Search, Plus, X, Sparkles, Users, BookOpen, Loader2, Play, Beer, Swords, Clock3 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface SearchGame {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  year: number | null;
  playersMin?: number | null;
  playersMax?: number | null;
  durationMax?: number | null;
  categories?: string[];
  mechanics?: string[];
}

interface MatchResult {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  score: number;
  confidence: "low" | "medium" | "high";
  sharedMechanics: string[];
  sharedCategories: string[];
  suggestedGames: Array<{
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    reason: string;
  }>;
}

interface FeaturedGame {
  slug: string;
  title: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  reviewSummary: string;
  playersLabel: string | null;
  playtime: string | null;
  complexity: string | null;
  ratingScore: number | null;
}

interface CompatibilitySectionProps {
  popularGames?: SearchGame[];
  featuredGames?: FeaturedGame[];
}

type PopularModeFilter = "cooperative" | "competitive";
type PopularPlayersFilter = "1" | "2" | "3plus";
type PopularDurationFilter = "30" | "60" | "long";

const MODE_FILTERS: Array<{ value: PopularModeFilter; label: string }> = [
  { value: "cooperative", label: "Cooperativo" },
  { value: "competitive", label: "Competitivo" }
];

const PLAYER_FILTERS: Array<{ value: PopularPlayersFilter; label: string }> = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3plus", label: "3+" }
];

const DURATION_FILTERS: Array<{ value: PopularDurationFilter; label: string }> = [
  { value: "30", label: "<30 min" },
  { value: "60", label: "<60 min" },
  { value: "long", label: "Largos" }
];

function stableGameShuffle(seed: string, gameId: string) {
  const value = `${seed}:${gameId}`;
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function CompatibilitySection({ popularGames = [], featuredGames = [] }: CompatibilitySectionProps) {
  const router = useRouter();
  const { user } = useAuth();

  // Onboarding States
  const [selectedGames, setSelectedGames] = useState<SearchGame[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchGame[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [popularModeFilter, setPopularModeFilter] = useState<PopularModeFilter>("competitive");
  const [popularPlayersFilter, setPopularPlayersFilter] = useState<PopularPlayersFilter>("2");
  const [popularDurationFilter, setPopularDurationFilter] = useState<PopularDurationFilter>("60");

  // Authenticated States
  const [authMatches, setAuthMatches] = useState<MatchResult[]>([]);
  const [authMatchesLoading, setAuthMatchesLoading] = useState(false);
  const [authLibraryEmpty, setAuthLibraryEmpty] = useState(false);
  const [addingGameId, setAddingGameId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setSearchResults([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch matches for logged-in user
  const fetchAuthMatches = async () => {
    setAuthMatchesLoading(true);
    try {
      const res = await fetch("/api/account/compatibility");
      if (res.ok) {
        const data = await res.json();
        if (data.empty) {
          setAuthLibraryEmpty(true);
        } else {
          setAuthMatches(data.matches || []);
          setAuthLibraryEmpty(false);
        }
      }
    } catch (err) {
      console.error("Error fetching compatibility matches:", err);
    } finally {
      setAuthMatchesLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAuthMatches();
    }
  }, [user]);

  // Search games
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/compatibility/game-search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          // Filter out already selected games
          const filtered = (data.games || []).filter(
            (g: SearchGame) => !selectedGames.some((sel) => sel.id === g.id)
          );
          setSearchResults(filtered);
        }
      } catch (err) {
        console.error("Error searching games:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedGames]);

  // Add game (Guest mode)
  const handleSelectGame = (game: SearchGame) => {
    if (selectedGames.length >= 3) return;
    setSelectedGames([...selectedGames, game]);
    setSearchQuery("");
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  // Remove game (Guest mode)
  const handleRemoveGame = (gameId: string) => {
    setSelectedGames(selectedGames.filter((g) => g.id !== gameId));
  };

  // Add game directly to library (Logged-in empty state)
  const handleAddGameToLibrary = async (game: SearchGame) => {
    setAddingGameId(game.id);
    try {
      const res = await fetch("/api/account/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: game.id, played: true })
      });
      if (res.ok) {
        setSearchQuery("");
        setSearchResults([]);
        // Re-fetch matches to see if we now have enough games
        await fetchAuthMatches();
      }
    } catch (err) {
      console.error("Error adding game to library:", err);
    } finally {
      setAddingGameId(null);
    }
  };

  // Calculate compatibility (Guest mode)
  const handleCalculate = async () => {
    if (selectedGames.length < 3) return;
    setCalculating(true);
    try {
      const gameIds = selectedGames.map((g) => g.id);
      const res = await fetch("/api/compatibility/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameIds })
      });
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches || []);
        setHasCalculated(true);
      }
    } catch (err) {
      console.error("Error calculating preview matches:", err);
    } finally {
      setCalculating(false);
    }
  };

  // Sign up CTA Click
  const handleSignupCta = () => {
    const gameIds = selectedGames.map((g) => g.id);
    sessionStorage.setItem("meepletavern_onboarding_games", JSON.stringify(gameIds));
    sessionStorage.setItem("meepletavern_onboarding_source", "compatibility_affinity");
    router.push("/auth?mode=register&next=%2F");
  };

  // Reset calculator
  const handleReset = () => {
    setSelectedGames([]);
    setMatches([]);
    setHasCalculated(false);
    setSearchQuery("");
  };

  const matchesPopularFilters = (game: SearchGame) => {
    const terms = [...(game.categories || []), ...(game.mechanics || [])].map((term) => term.toLocaleLowerCase("es-ES"));
    const isCooperative = terms.some((term) => term.includes("cooperativo") || term.includes("coop"));
    const matchesMode = popularModeFilter === "cooperative" ? isCooperative : !isCooperative;
    const minPlayers = game.playersMin || null;
    const maxPlayers = game.playersMax || null;
    const targetPlayers = popularPlayersFilter === "3plus" ? 3 : Number(popularPlayersFilter);
    const matchesPlayers = minPlayers && maxPlayers ? minPlayers <= targetPlayers && maxPlayers >= targetPlayers : false;
    const durationMax = game.durationMax || null;
    const matchesDuration =
      popularDurationFilter === "long"
        ? durationMax ? durationMax > 60 : false
        : durationMax ? durationMax <= Number(popularDurationFilter) : false;

    return matchesMode && matchesPlayers && matchesDuration;
  };

  const getFilteredPopularGames = () => {
    const seed = `${popularModeFilter}-${popularPlayersFilter}-${popularDurationFilter}`;
    const filteredGames = popularGames.filter(matchesPopularFilters);

    return [...filteredGames]
      .sort((a, b) => stableGameShuffle(seed, a.id) - stableGameShuffle(seed, b.id))
      .slice(0, 6);
  };

  const getVisibleSharedTags = (match: MatchResult) => {
    const seen = new Set<string>();
    const pickUnique = (tags: string[]) =>
      tags.filter((tag) => {
        const key = tag.trim().toLocaleLowerCase("es-ES");
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    return {
      categories: pickUnique(match.sharedCategories).slice(0, 3),
      mechanics: pickUnique(match.sharedMechanics).slice(0, 3)
    };
  };

  const getMatchExplanation = (match: MatchResult) => {
    const parts: string[] = [];
    if (match.sharedCategories.length > 0) {
      parts.push(`${match.sharedCategories.length} ${match.sharedCategories.length === 1 ? "categoría" : "categorías"}`);
    }
    if (match.sharedMechanics.length > 0) {
      parts.push(`${match.sharedMechanics.length} ${match.sharedMechanics.length === 1 ? "mecánica" : "mecánicas"}`);
    }
    if (match.suggestedGames.length > 0) {
      parts.push(`${match.suggestedGames.length} ${match.suggestedGames.length === 1 ? "juego sugerido" : "juegos sugeridos"}`);
    }

    return parts.length > 0 ? parts.slice(0, 2).join(" · ") : "Afinidad general de mesa";
  };

  // Render a match profile card
  const renderMatchCard = (match: MatchResult) => {
    const isMock = match.userId.startsWith("archetype-");
    const scoreColor = match.score >= 80 ? "text-emerald-700" : match.score >= 70 ? "text-amber-800" : "text-walnut/80";
    const visibleSharedTags = getVisibleSharedTags(match);
    const hasVisibleSharedTags = visibleSharedTags.categories.length > 0 || visibleSharedTags.mechanics.length > 0;

    return (
      <div
        key={match.userId}
        className="relative overflow-hidden rounded-xl border border-white/30 bg-white/95 backdrop-blur-md p-4 shadow-md flex flex-col justify-between z-10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:border-white/40"
      >
        <div>
          {/* Header */}
          <div className="flex items-center gap-3">
            {match.avatarUrl ? (
              <div className="relative h-9 w-9 overflow-hidden rounded-full border border-walnut/20 shadow-sm">
                <Image
                  src={match.avatarUrl}
                  alt={`Avatar de ${match.username}`}
                  fill
                  sizes="36px"
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#ebd5bf] to-[#c59e7a] text-xs font-black text-[#5c3c21] shadow-inner">
                {match.username[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="font-display truncate text-base font-extrabold text-wood">
                {match.username}
              </h4>
              <p className="truncate text-[11px] font-bold text-walnut/60">
                {getMatchExplanation(match)}
              </p>
              {isMock && (
                <p className="truncate text-[11px] font-black text-[#b45309]">
                  Perfil Recomendado
                </p>
              )}
            </div>
            <div className="flex flex-col items-center">
              <span className={`font-display text-xl font-black ${scoreColor}`}>
                {match.score}%
              </span>
              <span className="text-[10.5px] uppercase tracking-wider text-walnut/75 font-black">
                Afinidad
              </span>
            </div>
          </div>

          {/* Shared Interests */}
          <div className="mt-2.5">
            <p className="text-xs font-extrabold text-walnut/75 uppercase tracking-wider">Gustos en común</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {hasVisibleSharedTags ? (
                <>
                  {visibleSharedTags.categories.map((cat) => (
                    <span
                      key={cat}
                      title={cat}
                      className="rounded bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-black text-amber-900 border border-amber-500/15 block max-w-[120px] truncate"
                    >
                      {cat}
                    </span>
                  ))}
                  {visibleSharedTags.mechanics.map((mec) => (
                    <span
                      key={mec}
                      title={mec}
                      className="rounded bg-walnut/8 px-2 py-0.5 text-[10.5px] font-black text-walnut/80 border border-walnut/15 block max-w-[120px] truncate"
                    >
                      {mec}
                    </span>
                  ))}
                </>
              ) : (
                <span className="text-sm text-walnut/65 italic">Mesa variada</span>
              )}
            </div>
          </div>

          {/* Suggested Games */}
          {match.suggestedGames.length > 0 && (
            <div className="mt-3 border-t border-walnut/12 pt-2.5">
              <p className="text-xs font-extrabold text-walnut/75 uppercase tracking-wider flex items-center gap-1">
                <Play size={8} className="text-ember fill-ember" /> Para jugar juntos
              </p>
              <ul className="mt-1.5 space-y-1.5">
                {match.suggestedGames.slice(0, 2).map((sg) => (
                  <li key={sg.id} className="flex gap-2.5 items-center text-sm">
                    {sg.imageUrl ? (
                      <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded border border-walnut/15 bg-parchment shadow-inner">
                        <Image
                          src={sg.imageUrl}
                          alt={sg.name}
                          fill
                          sizes="32px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-walnut/8 text-xs font-black text-walnut/60">
                        M
                      </div>
                    )}
                    <div className="min-w-0 flex-1 leading-tight">
                      <Link
                        href={`/juegos/${sg.slug}`}
                        prefetch={false}
                        className="font-extrabold text-walnut hover:text-ember focus-visible:text-ember focus-visible:ring-1 focus-visible:ring-ember focus-visible:outline-none rounded hover:underline truncate block"
                      >
                        {sg.name}
                      </Link>
                      <span className="text-[11.5px] text-emerald-700 font-bold block truncate">
                        {sg.reason}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {user && !isMock && (
            <div className="mt-3">
              <Link
                href={`/u/${encodeURIComponent(match.username)}`}
                className="inline-flex min-h-8 items-center justify-center rounded-lg border border-walnut/15 bg-walnut/5 px-3 text-xs font-black text-walnut/80 hover:border-ember/35 hover:bg-amber-500/10 hover:text-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember transition-colors"
              >
                Ver perfil
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render the old-style recommended games list
  const renderFeaturedGames = (limit?: number) => {
    if (!featuredGames || featuredGames.length === 0) return null;
    
    const displayGames = limit ? featuredGames.slice(0, limit) : featuredGames;
    const firstGame = displayGames[0];
    const secondaryGames = displayGames.slice(1);

    return (
      <div className="mt-3 border-t border-white/15 pt-3 z-10 text-left space-y-2.5">
        <p className="text-xs font-extrabold text-[#fffaf0]/95 uppercase tracking-wider flex items-center gap-1.5">
          <Beer size={11} className="text-[#fef3c7]" aria-hidden="true" /> Recomendaciones de la barra
        </p>

        {/* Principal Featured Game */}
        {firstGame && (
          <div className="rounded-xl border border-white/30 bg-white/95 p-3 shadow-md flex flex-col gap-2 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:border-white/45">
            <div className="flex gap-3">
              {firstGame.coverImageUrl && (
                <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded border border-walnut/15 bg-parchment shadow-sm">
                  <Image
                    src={firstGame.coverImageUrl}
                    alt={firstGame.coverImageAlt || firstGame.title}
                    fill
                    sizes="56px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <div>
                  <span className="inline-block rounded bg-[#fef3c7] border border-[#f59e0b]/40 px-1.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-[#92400e] shadow-sm">
                    LA PINTA ESPECIAL
                  </span>
                  <Link
                    href={`/juegos/${firstGame.slug}`}
                    prefetch={false}
                    className="font-display block text-sm font-extrabold text-wood hover:text-ember focus-visible:text-ember focus-visible:ring-2 focus-visible:ring-ember focus-visible:outline-none rounded hover:underline truncate mt-0.5 leading-tight"
                  >
                    {firstGame.title}
                  </Link>
                </div>
                {firstGame.reviewSummary && (
                  <p className="line-clamp-2 text-xs font-semibold leading-relaxed text-walnut/80 mt-0.5">
                    {firstGame.reviewSummary}
                  </p>
                )}
              </div>
            </div>
            
            {/* Stats Tray */}
            <div className="grid grid-cols-3 gap-1 border-t border-walnut/12 pt-1.5 text-center text-[10px] font-black text-walnut/75 uppercase">
              <div>
                <p className="text-[9px] text-walnut/55 font-bold uppercase leading-none">Jugadores</p>
                <p className="text-xs font-extrabold text-wood mt-0.5 leading-none">{firstGame.playersLabel || "1-6"}</p>
              </div>
              <div>
                <p className="text-[9px] text-walnut/55 font-bold uppercase leading-none">Tiempo</p>
                <p className="text-xs font-extrabold text-wood mt-0.5 leading-none">{firstGame.playtime || "30-90 min"}</p>
              </div>
              <div>
                <p className="text-[9px] text-walnut/55 font-bold uppercase leading-none">Dificultad</p>
                <p className="text-xs font-extrabold text-wood mt-0.5 leading-none">{firstGame.complexity || "Media"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Secondary Games */}
        {secondaryGames.length > 0 && (
          <div className="grid gap-2">
            {secondaryGames.map((game, idx) => (
              <Link
                key={game.slug}
                href={`/juegos/${game.slug}`}
                prefetch={false}
                className="group flex items-center gap-2.5 rounded-lg border border-white/30 bg-white/90 p-2.5 shadow-md hover:bg-white/95 focus-visible:bg-white/95 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none transition-all text-left hover:-translate-y-0.5 hover:shadow-lg"
              >
                {game.coverImageUrl && (
                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded border border-walnut/15 bg-parchment shadow-sm">
                    <Image
                      src={game.coverImageUrl}
                      alt={game.coverImageAlt || game.title}
                      fill
                      sizes="40px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#92400e]">
                    {idx === 0 ? "🫧 MEDIA PINTA" : "🫧 DOBLE LÚPULO"}
                  </span>
                  <h4 className="font-display text-xs font-extrabold text-wood truncate group-hover:text-ember transition-colors leading-tight">
                    {game.title}
                  </h4>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  const filteredPopularGames = getFilteredPopularGames();

  return (
    <section className="relative flex h-full w-full flex-col overflow-hidden rounded-lg border border-[#92400e]/30 bg-gradient-to-b from-[#fbbf24] via-[#d97706] to-[#78350f] text-wood shadow-[0_16px_38px_rgba(120,53,15,0.25),inset_0_2px_8px_rgba(255,255,255,0.4)] min-h-[460px]">
      {/* Carbonation Bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-35 z-0">
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
      <div className="relative z-10 flex items-start justify-between gap-3 border-b border-[#ebd5bf]/60 bg-gradient-to-b from-[#ffffff] to-[#fffbf2] p-3 shadow-md">
        <div>
          <p className="tavern-eyebrow flex items-center gap-1.5">
            <Beer size={13} className="text-ember animate-pulse" strokeWidth={2.5} aria-hidden="true" />
            Grifo de afinidades
          </p>
          <h2 className="tavern-title mt-1.5 text-xl">
            ¿Con quién encajas para jugar?
          </h2>
          <p className="mt-0.5 text-sm font-semibold leading-relaxed text-walnut/90">
            {user ? "Matches reales basados en tu ludoteca." : "Elige 3 juegos y te decimos con quién encajas."}
          </p>
        </div>
      </div>

      {/* Interactive Beer Mug Body */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col justify-between p-4 z-10 overflow-hidden">
        
        {/* --- LOGGED-IN VIEW --- */}
        {user ? (
          authMatchesLoading ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center">
              <Loader2 className="h-9 w-9 animate-spin text-white" aria-hidden="true" />
              <p className="mt-3 text-sm font-bold text-white">
                Calculando afinidades...
              </p>
              <p className="mt-1 text-xs text-white/70">
                Comparando mecánicas y ludotecas en la taberna
              </p>
            </div>
          ) : authLibraryEmpty ? (
            <div className="flex flex-col justify-between flex-1 min-h-0">
              <div className="flex-1 overflow-x-hidden overflow-y-auto pr-1">
                <p className="text-sm font-bold text-white/95 leading-relaxed">
                  Tu ludoteca está vacía. Añade al menos 3 juegos que hayas jugado o te gusten para buscar perfiles afines.
                </p>

                {/* Autocomplete Input */}
                <div className="mt-4 relative" ref={dropdownRef}>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-walnut/60" aria-hidden="true" />
                    <input
                      ref={searchInputRef}
                      id="auth-library-game-search"
                      type="text"
                      placeholder="Busca y añade un juego..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Buscar y añadir un juego a tu ludoteca"
                      aria-autocomplete="list"
                      aria-controls="auth-search-results"
                      aria-expanded={searchResults.length > 0}
                      className="min-h-10 w-full rounded-lg border border-transparent bg-white/95 pl-9 pr-3 text-sm font-semibold text-wood placeholder:text-walnut/60 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78350f] focus-visible:ring-offset-2 transition-all"
                    />
                  </div>

                  {/* Dropdown */}
                  {searchResults.length > 0 && (
                    <div 
                      id="auth-search-results"
                      role="listbox"
                      aria-label="Sugerencias de juegos"
                      className="absolute left-0 right-0 z-30 mt-1 max-h-48 overflow-x-hidden overflow-y-auto rounded-lg border border-walnut/15 bg-white p-1 shadow-lg"
                    >
                      {searchResults.map((game) => (
                        <button
                          key={game.id}
                          role="option"
                          aria-selected="false"
                          onClick={() => handleAddGameToLibrary(game)}
                          disabled={addingGameId === game.id}
                          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-amber-500/5 focus-visible:bg-amber-500/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500/40 transition-colors"
                        >
                          {game.imageUrl ? (
                            <div className="relative h-7 w-7 overflow-hidden rounded border border-walnut/15 bg-parchment shadow-inner flex-shrink-0">
                              <Image
                                src={game.imageUrl}
                                alt={game.name}
                                fill
                                sizes="28px"
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded bg-walnut/8 text-xs font-black text-walnut/60 flex-shrink-0">
                              M
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-extrabold text-walnut truncate text-xs">{game.name}</p>
                            {game.year && (
                              <p className="text-xs text-walnut/65 font-bold">{game.year}</p>
                            )}
                          </div>
                          {addingGameId === game.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-ember" aria-hidden="true" />
                          ) : (
                            <Plus className="h-4 w-4 text-walnut/60 hover:text-ember" aria-hidden="true" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recommended game card inside the empty state */}
                {renderFeaturedGames(3)}
              </div>

              <div className="mt-4">
                <Link
                  href="/juegos"
                  prefetch={false}
                  className="flex w-full min-h-10 items-center justify-center rounded-lg bg-white/15 border border-white/25 text-white text-sm font-bold hover:bg-white/25 focus-visible:bg-white/25 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none transition-all shadow-sm"
                >
                  Explorar catálogo completo
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col justify-between flex-1 min-h-0">
              {/* Scrollable match results */}
              <div className="space-y-2.5 flex-1 overflow-x-hidden overflow-y-auto pr-1">
                {authMatches.slice(0, 3).map((match) => renderMatchCard(match))}
              </div>

              <div className="mt-3 pt-2.5 border-t border-white/15 flex items-center justify-between gap-3 text-xs text-white font-black">
                <Link href="/taberna" prefetch={false} className="hover:underline hover:text-[#fffaf0] focus-visible:underline focus-visible:text-[#fffaf0] focus-visible:ring-1 focus-visible:ring-white focus-visible:outline-none rounded flex items-center gap-1">
                  <Users size={12} aria-hidden="true" /> Ver taberna
                </Link>
                <Link href="/mi-perfil" className="hover:underline hover:text-[#fffaf0] focus-visible:underline focus-visible:text-[#fffaf0] focus-visible:ring-1 focus-visible:ring-white focus-visible:outline-none rounded flex items-center gap-1">
                  <BookOpen size={12} aria-hidden="true" /> Mi ludoteca
                </Link>
              </div>
            </div>
          )
        ) : (
          /* --- GUEST VIEW --- */
          hasCalculated ? (
            <div className="flex flex-col justify-between flex-1 min-h-0">
              {/* Scrollable guest results & selection summary */}
              <div className="space-y-3 flex-1 overflow-x-hidden overflow-y-auto pr-1">
                {matches.slice(0, 2).map((match) => renderMatchCard(match))}

                {/* Selected games summary */}
                <div className="relative overflow-hidden rounded-xl border border-white/25 bg-white/10 p-3 shadow-inner z-10">
                  <p className="text-xs font-bold text-[#ebd5bf] uppercase tracking-wider">
                    Tus juegos seleccionados
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {selectedGames.map((g) => (
                      <div
                        key={g.id}
                        title={g.name}
                        className="flex max-w-full items-center gap-1.5 rounded bg-white/15 px-2.5 py-1 border border-white/10 text-xs font-extrabold text-white"
                      >
                        <span className="min-w-0 line-clamp-2 text-left leading-tight">
                          {g.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pinned signup and reset CTAs */}
              <div className="mt-4 pt-3 border-t border-white/15">
                <button
                  onClick={handleSignupCta}
                  className="w-full min-h-10 text-sm rounded-lg bg-white text-wood font-black tracking-wide shadow-md hover:bg-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 transition-all flex items-center justify-center gap-1.5"
                >
                  Registrarme y guardar juegos
                </button>
                <button
                  onClick={handleReset}
                  className="w-full text-center text-xs font-bold text-white/80 hover:text-white hover:underline focus-visible:underline focus-visible:text-white focus-visible:outline-none rounded mt-2"
                >
                  Probar con otros juegos
                </button>
              </div>
            </div>
          ) : (
            /* --- GUEST GAME SELECTION --- */
            <div className="flex flex-col justify-between flex-1 min-h-0">
              <div className="flex-1 overflow-x-hidden overflow-y-auto pr-1">
                <p className="text-sm leading-relaxed text-[#fffaf0]/95 font-semibold">
                  Dinos 3 juegos que hayas disfrutado y te diremos con quién compartir mesa en la taberna.
                </p>

                {/* Slots */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((index) => {
                    const game = selectedGames[index];
                    return (
                      <div
                        key={index}
                        className={`relative aspect-[3/4] rounded-lg border-2 border-dashed flex flex-col items-center justify-center p-1 transition-all ${
                          game
                            ? "border-white/20 bg-white shadow-sm"
                            : "border-white/25 bg-white/5 hover:bg-white/10 cursor-pointer"
                        }`}
                        onClick={() => {
                          if (!game) searchInputRef.current?.focus();
                        }}
                      >
                        {game ? (
                          <>
                            {game.imageUrl ? (
                              <div className="relative w-full h-full rounded overflow-hidden shadow-inner">
                                <Image
                                  src={game.imageUrl}
                                  alt={game.name}
                                  fill
                                  sizes="80px"
                                  className="object-cover"
                                  unoptimized
                                />
                                <div className="absolute inset-0 bg-black/5" />
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-[10px] font-black text-walnut/80 text-center h-full leading-tight p-0.5">
                                {game.name}
                              </div>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveGame(game.id);
                              }}
                              aria-label={`Eliminar ${game.name} de la selección`}
                              className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border border-walnut/20 bg-white text-walnut/70 shadow-sm hover:bg-ember hover:text-white hover:border-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember transition-colors"
                            >
                              <X size={11} strokeWidth={3.5} aria-hidden="true" />
                            </button>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5 text-white/50">
                            <Plus size={16} strokeWidth={3} aria-hidden="true" />
                            <span className="text-[10.5px] font-black uppercase tracking-wider">Mesa</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Input Search */}
                <div className="mt-3.5 relative" ref={dropdownRef}>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-walnut/60" aria-hidden="true" />
                    <input
                      ref={searchInputRef}
                      id="guest-game-search"
                      type="text"
                      placeholder={
                        selectedGames.length >= 3
                          ? "¡Slots completos!"
                          : "Busca un juego (ej. Wingspan...)"
                      }
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      disabled={selectedGames.length >= 3}
                      aria-label="Buscar un juego de mesa para agregar a tu selección"
                      aria-autocomplete="list"
                      aria-controls="guest-search-results"
                      aria-expanded={searchResults.length > 0 && selectedGames.length < 3}
                      className="min-h-10 w-full rounded-lg border border-transparent bg-white/95 pl-9 pr-3 text-sm font-semibold text-wood placeholder:text-walnut/60 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78350f] focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    />
                  </div>

                  {/* Results Autocomplete */}
                  {searchResults.length > 0 && selectedGames.length < 3 && (
                    <div 
                      id="guest-search-results"
                      role="listbox"
                      aria-label="Sugerencias de juegos"
                      className="absolute left-0 right-0 z-30 mt-1 max-h-44 overflow-x-hidden overflow-y-auto rounded-lg border border-walnut/15 bg-white p-1 shadow-lg"
                    >
                      {searchResults.map((game) => (
                        <button
                          key={game.id}
                          role="option"
                          aria-selected="false"
                          onClick={() => handleSelectGame(game)}
                          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-amber-500/5 focus-visible:bg-amber-500/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500/40 transition-colors"
                        >
                          {game.imageUrl ? (
                            <div className="relative h-7 w-7 overflow-hidden rounded border border-walnut/15 bg-parchment shadow-inner flex-shrink-0">
                              <Image
                                src={game.imageUrl}
                                alt={game.name}
                                fill
                                sizes="28px"
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded bg-walnut/8 text-xs font-black text-walnut/60 flex-shrink-0">
                              M
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-extrabold text-walnut truncate text-xs">{game.name}</p>
                            {game.year && (
                              <p className="text-xs text-walnut/65 font-bold">{game.year}</p>
                            )}
                          </div>
                          <Plus className="h-4 w-4 text-walnut/60 hover:text-ember" aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Popular Games quick adds */}
                {popularGames.length > 0 && selectedGames.length < 3 && (
                  <div className="mt-4">
                    <p className="text-xs font-bold text-[#fffaf0]/95 uppercase tracking-wider">
                      ¿O añade un juego popular en un clic?
                    </p>

                    <div className="mt-2 space-y-2 rounded-lg border border-white/15 bg-white/10 p-2 shadow-inner backdrop-blur-sm">
                      <div className="flex items-center gap-1.5">
                        <Swords className="h-3.5 w-3.5 shrink-0 text-[#fffaf0]/80" aria-hidden="true" />
                        <div className="grid flex-1 grid-cols-2 gap-1 rounded-md bg-[#78350f]/30 p-1">
                          {MODE_FILTERS.map((option) => {
                            const active = popularModeFilter === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setPopularModeFilter(option.value)}
                                aria-pressed={active}
                                className={`min-h-7 rounded px-2 text-[10.5px] font-black transition-all ${
                                  active
                                    ? "bg-white text-wood shadow-sm"
                                    : "text-white/80 hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 shrink-0 text-[#fffaf0]/80" aria-hidden="true" />
                          <div className="grid flex-1 grid-cols-3 gap-1 rounded-md bg-[#78350f]/30 p-1">
                            {PLAYER_FILTERS.map((option) => {
                              const active = popularPlayersFilter === option.value;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => setPopularPlayersFilter(option.value)}
                                  aria-pressed={active}
                                  className={`min-h-7 rounded px-2 text-[10.5px] font-black transition-all ${
                                    active
                                      ? "bg-white text-wood shadow-sm"
                                      : "text-white/80 hover:bg-white/10 hover:text-white"
                                  }`}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5 shrink-0 text-[#fffaf0]/80" aria-hidden="true" />
                          <div className="grid flex-1 grid-cols-3 gap-1 rounded-md bg-[#78350f]/30 p-1">
                            {DURATION_FILTERS.map((option) => {
                              const active = popularDurationFilter === option.value;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => setPopularDurationFilter(option.value)}
                                  aria-pressed={active}
                                  className={`min-h-7 rounded px-1.5 text-[10px] font-black transition-all ${
                                    active
                                      ? "bg-white text-wood shadow-sm"
                                      : "text-white/80 hover:bg-white/10 hover:text-white"
                                  }`}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      {filteredPopularGames.map((game) => (
                        <button
                          key={game.id}
                          onClick={() => handleSelectGame(game)}
                          disabled={selectedGames.some(g => g.id === game.id)}
                          aria-label={`Añadir ${game.name}`}
                          className="flex flex-col items-center overflow-hidden rounded-lg border border-white/10 bg-white/10 p-1 text-center shadow-inner transition-all hover:bg-white/20 focus-visible:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40 group"
                        >
                          {game.imageUrl ? (
                            <div className="relative aspect-[4/3] w-full flex-shrink-0 overflow-hidden rounded border border-white/10 shadow-sm transition-transform group-hover:scale-105">
                              <Image
                                src={game.imageUrl}
                                alt={game.name}
                                fill
                                sizes="50px"
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="flex h-6 w-6 items-center justify-center rounded bg-white/15 text-[10px] font-bold text-white/60">
                              M
                            </div>
                          )}
                          <span className="mt-1.5 block w-full truncate text-xs font-extrabold leading-tight text-white/95">
                            {game.name}
                          </span>
                        </button>
                      ))}
                    </div>

                    {filteredPopularGames.length === 0 && (
                      <p className="mt-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-[#fffaf0]/90">
                        No hay juegos publicados con esta combinación.
                      </p>
                    )}
                  </div>
                )}

                {/* Re-inject the recommended game in empty spaces at the bottom of the picker screen only if there's a gap */}
                {(selectedGames.length === 3 || popularGames.length === 0) && renderFeaturedGames()}
              </div>

              <div className="mt-4">
                <button
                  onClick={handleCalculate}
                  disabled={selectedGames.length < 3 || calculating}
                  className="w-full min-h-10 text-sm rounded-lg bg-white text-wood font-black tracking-wide shadow-md hover:bg-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5"
                >
                  {calculating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      Calculando...
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} aria-hidden="true" />
                      Calcular mi afinidad
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
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
      `}} />
    </section>
  );
}
