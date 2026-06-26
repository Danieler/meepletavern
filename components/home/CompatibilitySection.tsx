"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Search, Plus, X, Sparkles, Users, BookOpen, Loader2, Play, Beer } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface SearchGame {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  year: number | null;
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
    router.push("/auth?mode=register&next=%2F");
  };

  // Reset calculator
  const handleReset = () => {
    setSelectedGames([]);
    setMatches([]);
    setHasCalculated(false);
    setSearchQuery("");
  };

  // Render a match profile card
  const renderMatchCard = (match: MatchResult) => {
    const isMock = match.userId.startsWith("archetype-");
    const scoreColor = match.score >= 80 ? "text-emerald-600" : match.score >= 70 ? "text-amber-700" : "text-walnut/70";

    return (
      <div
        key={match.userId}
        className="relative overflow-hidden rounded-xl border border-white/20 bg-white/90 backdrop-blur-md p-3 shadow-md flex flex-col justify-between z-10"
      >
        <div>
          {/* Header */}
          <div className="flex items-center gap-2">
            {match.avatarUrl ? (
              <div className="relative h-8 w-8 overflow-hidden rounded-full border border-walnut/15 shadow-sm">
                <Image
                  src={match.avatarUrl}
                  alt={`Avatar de ${match.displayName || match.username}`}
                  fill
                  sizes="32px"
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#ebd5bf] to-[#c59e7a] text-[10px] font-black text-[#5c3c21] shadow-inner">
                {(match.displayName || match.username)[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="font-display truncate text-xs font-bold text-wood">
                {match.displayName || match.username}
              </h4>
              <p className="truncate text-[9px] font-bold text-[#b45309]">
                {isMock ? "Perfil Recomendado" : `@${match.username}`}
              </p>
            </div>
            <div className="flex flex-col items-center">
              <span className={`font-display text-sm font-black ${scoreColor}`}>
                {match.score}%
              </span>
              <span className="text-[8px] uppercase tracking-wider text-walnut/55 font-bold">
                Afinidad
              </span>
            </div>
          </div>

          {/* Shared Interests */}
          <div className="mt-2">
            <p className="text-[9px] font-bold text-walnut/55 uppercase tracking-wide">Gustos en común</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {match.sharedCategories.length > 0 || match.sharedMechanics.length > 0 ? (
                <>
                  {match.sharedCategories.slice(0, 2).map((cat) => (
                    <span
                      key={cat}
                      className="rounded bg-amber-500/8 px-1 py-0.5 text-[8px] font-black text-amber-800 border border-amber-500/10 block max-w-[80px] truncate"
                    >
                      {cat}
                    </span>
                  ))}
                  {match.sharedMechanics.slice(0, 2).map((mec) => (
                    <span
                      key={mec}
                      className="rounded bg-walnut/5 px-1 py-0.5 text-[8px] font-bold text-walnut/70 border border-walnut/10 block max-w-[80px] truncate"
                    >
                      {mec}
                    </span>
                  ))}
                </>
              ) : (
                <span className="text-[9px] text-walnut/40 italic">Mesa variada</span>
              )}
            </div>
          </div>

          {/* Suggested Games */}
          {match.suggestedGames.length > 0 && (
            <div className="mt-2.5 border-t border-walnut/8 pt-2">
              <p className="text-[9px] font-bold text-walnut/55 uppercase tracking-wide flex items-center gap-1">
                <Play size={7} className="text-ember fill-ember" /> Para jugar juntos
              </p>
              <ul className="mt-1 space-y-1">
                {match.suggestedGames.slice(0, 2).map((sg) => (
                  <li key={sg.id} className="flex gap-2 items-center text-[10px]">
                    {sg.imageUrl ? (
                      <div className="relative h-6 w-6 flex-shrink-0 overflow-hidden rounded border border-walnut/10 bg-parchment shadow-inner">
                        <Image
                          src={sg.imageUrl}
                          alt={sg.name}
                          fill
                          sizes="24px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-walnut/5 text-[8px] font-black text-walnut/40">
                        M
                      </div>
                    )}
                    <div className="min-w-0 flex-1 leading-tight">
                      <Link
                        href={`/juegos/${sg.slug}`}
                        className="font-bold text-walnut hover:text-ember hover:underline truncate block"
                      >
                        {sg.name}
                      </Link>
                      <span className="text-[8px] text-emerald-600 font-bold block truncate">
                        {sg.reason}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render the old-style recommended game card
  // Render the old-style recommended games list
  const renderFeaturedGames = (limit?: number) => {
    if (!featuredGames || featuredGames.length === 0) return null;
    
    const displayGames = limit ? featuredGames.slice(0, limit) : featuredGames;
    const firstGame = displayGames[0];
    const secondaryGames = displayGames.slice(1);

    return (
      <div className="mt-3 border-t border-white/10 pt-3 z-10 text-left space-y-2.5">
        <p className="text-[10px] font-bold text-[#fffaf0]/80 uppercase tracking-wide flex items-center gap-1.5">
          <Beer size={10} className="text-[#fef3c7]" /> Recomendaciones de la barra
        </p>

        {/* Principal Featured Game */}
        {firstGame && (
          <div className="rounded-xl border border-white/20 bg-white/95 p-3 shadow-md flex flex-col gap-2">
            <div className="flex gap-3">
              {firstGame.coverImageUrl && (
                <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded border border-walnut/10 bg-parchment shadow-sm">
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
                  <span className="inline-block rounded bg-[#fef3c7] border border-[#f59e0b]/40 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.1em] text-[#92400e] shadow-sm">
                    LA PINTA ESPECIAL
                  </span>
                  <Link
                    href={`/juegos/${firstGame.slug}`}
                    className="font-display block text-xs font-bold text-wood hover:text-ember hover:underline truncate mt-0.5 leading-tight"
                  >
                    {firstGame.title}
                  </Link>
                </div>
                {firstGame.reviewSummary && (
                  <p className="line-clamp-2 text-[10px] font-semibold leading-3.5 text-walnut/70 mt-0.5">
                    {firstGame.reviewSummary}
                  </p>
                )}
              </div>
            </div>
            
            {/* Stats Tray */}
            <div className="grid grid-cols-3 gap-1 border-t border-walnut/8 pt-1.5 text-center text-[8px] font-black text-walnut/60 uppercase">
              <div>
                <p className="text-[7px] text-walnut/40 font-bold uppercase leading-none">Jugadores</p>
                <p className="font-extrabold text-wood mt-0.5 leading-none">{firstGame.playersLabel || "1-6"}</p>
              </div>
              <div>
                <p className="text-[7px] text-walnut/40 font-bold uppercase leading-none">Tiempo</p>
                <p className="font-extrabold text-wood mt-0.5 leading-none">{firstGame.playtime || "30-90 min"}</p>
              </div>
              <div>
                <p className="text-[7px] text-walnut/40 font-bold uppercase leading-none">Dificultad</p>
                <p className="font-extrabold text-wood mt-0.5 leading-none">{firstGame.complexity || "Media"}</p>
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
                className="group flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/10 p-2 shadow-inner hover:bg-white/20 transition-all text-left"
              >
                {game.coverImageUrl && (
                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded border border-white/10 bg-parchment shadow-sm">
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
                  <span className="text-[7.5px] font-black uppercase tracking-[0.12em] text-[#fef3c7] opacity-90">
                    {idx === 0 ? "MEDIA PINTA" : "DOBLE LÚPULO"}
                  </span>
                  <h4 className="font-display text-xs font-bold text-wood truncate group-hover:text-ember transition-colors leading-tight">
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

  return (
    <section className="relative flex h-full w-full flex-col overflow-hidden rounded-lg border border-[#92400e]/30 bg-gradient-to-b from-[#fbbf24] via-[#d97706] to-[#78350f] text-wood shadow-[0_16px_38px_rgba(120,53,15,0.25),inset_0_2px_8px_rgba(255,255,255,0.4)] min-h-[460px]">
      {/* Carbonation Bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 z-0">
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
          <p className="tavern-eyebrow flex items-center gap-1.5">
            <Beer size={13} className="text-ember animate-pulse" strokeWidth={2.5} />
            Grifo de afinidades
          </p>
          <h2 className="tavern-title mt-1.5 text-xl">
            ¿Con quién encajas para jugar?
          </h2>
          <p className="mt-0.5 text-xs font-semibold leading-5 text-walnut/80">
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
              <Loader2 className="h-9 w-9 animate-spin text-white" />
              <p className="mt-3 text-sm font-bold text-white">
                Calculando afinidades...
              </p>
              <p className="mt-1 text-xs text-white/70">
                Comparando mecánicas y ludotecas en la taberna
              </p>
            </div>
          ) : authLibraryEmpty ? (
            <div className="flex flex-col justify-between flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto pr-1">
                <p className="text-xs font-bold text-white/90 leading-relaxed">
                  Tu ludoteca está vacía. Añade al menos 3 juegos que hayas jugado o te gusten para buscar perfiles afines.
                </p>

                {/* Autocomplete Input */}
                <div className="mt-4 relative" ref={dropdownRef}>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-walnut/40" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Busca y añade un juego..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="min-h-10 w-full rounded-lg border border-transparent bg-white/90 pl-9 pr-3 text-xs font-semibold text-wood placeholder:text-walnut/40 focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  {/* Dropdown */}
                  {searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto rounded-lg border border-walnut/15 bg-white p-1 shadow-lg">
                      {searchResults.map((game) => (
                        <button
                          key={game.id}
                          onClick={() => handleAddGameToLibrary(game)}
                          disabled={addingGameId === game.id}
                          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-amber-500/5 transition-colors"
                        >
                          {game.imageUrl ? (
                            <div className="relative h-7 w-7 overflow-hidden rounded border border-walnut/10 bg-parchment shadow-inner flex-shrink-0">
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
                            <div className="flex h-7 w-7 items-center justify-center rounded bg-walnut/5 text-[8px] font-black text-walnut/40 flex-shrink-0">
                              M
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-walnut truncate">{game.name}</p>
                            {game.year && (
                              <p className="text-[9px] text-walnut/40 font-bold">{game.year}</p>
                            )}
                          </div>
                          {addingGameId === game.id ? (
                            <Loader2 className="h-3 w-3 animate-spin text-ember" />
                          ) : (
                            <Plus className="h-3.5 w-3.5 text-walnut/40 hover:text-ember" />
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
                  className="flex w-full min-h-10 items-center justify-center rounded-lg bg-white/12 border border-white/20 text-white text-xs font-bold hover:bg-white/20 transition-all"
                >
                  Explorar catálogo completo
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col justify-between flex-1 min-h-0">
              {/* Scrollable match results & recommended game at the bottom */}
              <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
                {authMatches.slice(0, 3).map((match) => renderMatchCard(match))}
                
                {/* Re-inject the recommended game in empty spaces at the bottom of the list only if there's a gap */}
                {authMatches.length < 3 && renderFeaturedGames(3 - authMatches.length)}
              </div>

              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-3 text-[11px] text-white/95 font-bold">
                <Link href="/taberna" className="hover:underline flex items-center gap-1">
                  <Users size={11} /> Ver taberna
                </Link>
                <Link href="/mi-perfil" className="hover:underline flex items-center gap-1">
                  <BookOpen size={11} /> Mi ludoteca
                </Link>
              </div>
            </div>
          )
        ) : (
          /* --- GUEST VIEW --- */
          hasCalculated ? (
            <div className="flex flex-col justify-between flex-1 min-h-0">
              {/* Scrollable guest results & selection summary & recommended game */}
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {matches.slice(0, 2).map((match) => renderMatchCard(match))}

                {/* Selected games summary */}
                <div className="relative overflow-hidden rounded-xl border border-white/15 bg-white/10 p-3 shadow-inner z-10">
                  <p className="text-[10px] font-bold text-[#ebd5bf] uppercase tracking-wide">
                    Tus juegos seleccionados
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {selectedGames.map((g) => (
                      <div
                        key={g.id}
                        className="flex items-center gap-1.5 rounded bg-white/15 px-2 py-0.5 border border-white/5 text-[10px] font-bold text-white max-w-[120px] truncate"
                      >
                        {g.name}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended game card inside the results list only if there's a gap */}
                {matches.length < 2 && renderFeaturedGames(2 - matches.length)}
              </div>

              {/* Pinned signup and reset CTAs */}
              <div className="mt-4 pt-3 border-t border-white/15">
                <button
                  onClick={handleSignupCta}
                  className="w-full min-h-10 text-xs rounded-lg bg-white text-wood font-black tracking-wide shadow-md hover:bg-parchment transition-all flex items-center justify-center gap-1.5"
                >
                  Registrarme y guardar juegos
                </button>
                <button
                  onClick={handleReset}
                  className="w-full text-center text-[10px] font-bold text-white/70 hover:text-white hover:underline mt-2"
                >
                  Probar con otros juegos
                </button>
              </div>
            </div>
          ) : (
            /* --- GUEST GAME SELECTION --- */
            <div className="flex flex-col justify-between flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto pr-1">
                <p className="text-xs leading-relaxed text-[#fffaf0]/95 font-semibold">
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
                              <div className="flex flex-col items-center justify-center text-[8px] font-black text-walnut/70 text-center h-full leading-tight">
                                {game.name}
                              </div>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveGame(game.id);
                              }}
                              className="absolute -top-1.5 -right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border border-walnut/20 bg-white text-walnut/70 shadow-sm hover:bg-ember hover:text-white hover:border-ember transition-colors"
                            >
                              <X size={9} strokeWidth={3} />
                            </button>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5 text-white/50">
                            <Plus size={14} strokeWidth={3} />
                            <span className="text-[8px] font-black uppercase tracking-wider">Mesa</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Input Search */}
                <div className="mt-3.5 relative" ref={dropdownRef}>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-walnut/40" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder={
                        selectedGames.length >= 3
                          ? "¡Slots completos!"
                          : "Busca un juego (ej. Wingspan...)"
                      }
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      disabled={selectedGames.length >= 3}
                      className="min-h-10 w-full rounded-lg border border-transparent bg-white/90 pl-9 pr-3 text-xs font-semibold text-wood placeholder:text-walnut/40 focus:bg-white focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    />
                  </div>

                  {/* Results Autocomplete */}
                  {searchResults.length > 0 && selectedGames.length < 3 && (
                    <div className="absolute left-0 right-0 z-30 mt-1 max-h-44 overflow-y-auto rounded-lg border border-walnut/15 bg-white p-1 shadow-lg">
                      {searchResults.map((game) => (
                        <button
                          key={game.id}
                          onClick={() => handleSelectGame(game)}
                          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-amber-500/5 transition-colors"
                        >
                          {game.imageUrl ? (
                            <div className="relative h-7 w-7 overflow-hidden rounded border border-walnut/10 bg-parchment shadow-inner flex-shrink-0">
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
                            <div className="flex h-7 w-7 items-center justify-center rounded bg-walnut/5 text-[8px] font-black text-walnut/40 flex-shrink-0">
                              M
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-walnut truncate">{game.name}</p>
                            {game.year && (
                              <p className="text-[9px] text-walnut/40 font-bold">{game.year}</p>
                            )}
                          </div>
                          <Plus className="h-3.5 w-3.5 text-walnut/40 hover:text-ember" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Popular Games quick adds */}
                {popularGames.length > 0 && selectedGames.length < 3 && (
                  <div className="mt-4">
                    <p className="text-[10px] font-bold text-[#fffaf0]/80 uppercase tracking-wide">
                      ¿O añade un juego popular en un clic?
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {popularGames.map((game, index) => (
                        <button
                          key={game.id}
                          onClick={() => handleSelectGame(game)}
                          disabled={selectedGames.some(g => g.id === game.id)}
                          className={`flex flex-col items-center justify-between p-1.5 rounded-lg border border-white/10 bg-white/10 hover:bg-white/20 disabled:opacity-40 transition-all text-center aspect-[3/4] overflow-hidden group shadow-inner ${
                            index >= 3 ? "hidden lg:flex" : "flex"
                          }`}
                        >
                          {game.imageUrl ? (
                            <div className="relative w-full h-[60%] rounded overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
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
                            <div className="flex h-6 w-6 items-center justify-center rounded bg-white/10 text-[8px] font-black text-white/50">
                              M
                            </div>
                          )}
                          <span className="text-[9px] font-bold text-white/95 truncate w-full block mt-1">
                            {game.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Re-inject the recommended game in empty spaces at the bottom of the picker screen only if there's a gap */}
                {(selectedGames.length === 3 || popularGames.length === 0) && renderFeaturedGames()}
              </div>

              <div className="mt-4">
                <button
                  onClick={handleCalculate}
                  disabled={selectedGames.length < 3 || calculating}
                  className="w-full min-h-10 text-xs rounded-lg bg-white text-wood font-black tracking-wide shadow-md hover:bg-parchment disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5"
                >
                  {calculating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Calculando...
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} />
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
