"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { useAuth } from "@/hooks/useAuth";
import type { AuthContext } from "@/components/auth-cta/authCtaUrl";
import { executePendingAction } from "@/lib/pendingActions";
import { Search, Plus, X, Loader2, Sparkles } from "lucide-react";
import Image from "next/image";

interface SearchGame {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  year: number | null;
}

type AuthPageClientProps = {
  nextPath: string;
  initialMode: "login" | "register";
  authContext?: AuthContext;
};

export function AuthPageClient({ nextPath, initialMode, authContext }: AuthPageClientProps) {
  const router = useRouter();
  const {
    user,
    loading,
    isConfigured,
    signIn,
    signInWithGoogle,
    signInWithDiscord,
    signInWithGoogleIdToken,
    signUp
  } = useAuth();

  const isRegister = initialMode === "register";

  // Onboarding game selection states
  const [showSignupForm, setShowSignupForm] = useState(!isRegister);
  const [resolvedMode, setResolvedMode] = useState<"login" | "register">(initialMode);
  const [selectedGames, setSelectedGames] = useState<SearchGame[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchGame[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Check if they already chose games on the home page
  useEffect(() => {
    if (!isRegister) return;
    try {
      const stored = sessionStorage.getItem("meepletavern_onboarding_games");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          setShowSignupForm(true);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [isRegister]);

  // Sync session storage on authentication
  useEffect(() => {
    if (!loading && user) {
      const syncOnboardingGames = async () => {
        try {
          const onboardingGamesStr = sessionStorage.getItem("meepletavern_onboarding_games");
          if (onboardingGamesStr) {
            const gameIds = JSON.parse(onboardingGamesStr);
            if (Array.isArray(gameIds) && gameIds.length > 0) {
              const source = sessionStorage.getItem("meepletavern_onboarding_source") || "auth_onboarding";
              await fetch("/api/account/onboarding/games", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ gameIds, source })
              });
            }
            sessionStorage.removeItem("meepletavern_onboarding_games");
            sessionStorage.removeItem("meepletavern_onboarding_source");
          }
        } catch (err) {
          console.error("Error syncing onboarding games:", err);
        }
      };

      syncOnboardingGames()
        .then(() => executePendingAction())
        .then(() => {
          router.replace(nextPath);
        });
    }
  }, [loading, nextPath, router, user]);

  // Search autocomplete hook
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
          const filtered = (data.games || []).filter(
            (g: SearchGame) => !selectedGames.some((sel) => sel.id === g.id)
          );
          setSearchResults(filtered);
        }
      } catch (err) {
        console.error("Error searching games in onboarding:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedGames]);

  // Dropdown click outside listener
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

  const handleSelectGame = (game: SearchGame) => {
    setSelectedGames([...selectedGames, game]);
    setSearchQuery("");
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  const handleRemoveGame = (gameId: string) => {
    setSelectedGames(selectedGames.filter((g) => g.id !== gameId));
  };

  const handleContinue = () => {
    if (selectedGames.length < 2) return;
    sessionStorage.setItem("meepletavern_onboarding_games", JSON.stringify(selectedGames.map(g => g.id)));
    sessionStorage.setItem("meepletavern_onboarding_source", "auth_onboarding");
    setShowSignupForm(true);
  };

  const getOAuthNextPath = () => {
    if (typeof window === "undefined") return nextPath;
    const hasOnboardingGames = Boolean(sessionStorage.getItem("meepletavern_onboarding_games"));
    if (!hasOnboardingGames || nextPath.startsWith("/auth")) return nextPath;

    return `/auth?mode=${resolvedMode}&next=${encodeURIComponent(nextPath)}`;
  };

  // Render onboarding mandatory game selection
  if (!showSignupForm && resolvedMode === "register") {
    return (
      <div className="mx-auto max-w-md px-4 py-8 sm:py-16">
        <div className="rounded-2xl border border-walnut/12 bg-white p-6 shadow-md md:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center rounded-lg bg-amber-500/10 p-2 text-ember">
                <Sparkles size={20} className="animate-pulse" />
              </span>
              <h2 className="font-display text-xl font-black text-wood leading-tight">
                Elige tus gustos
              </h2>
            </div>
            
            <p className="mt-3 text-sm leading-relaxed text-walnut/80 font-medium">
              Antes de unirte a la taberna, indícanos <strong>al menos 2 juegos</strong> de mesa que te gusten o hayas jugado para poder recomendarte partidas e inicializar tu ludoteca gratis.
            </p>

            {/* Selected slots */}
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((idx) => {
                const game = selectedGames[idx];
                return (
                  <div
                    key={idx}
                    className={`relative aspect-[3/4] rounded-lg border-2 border-dashed flex flex-col items-center justify-center p-1 transition-all ${
                      game
                        ? "border-walnut/15 bg-white shadow-sm"
                        : "border-walnut/15 bg-white/40 hover:bg-white/60 cursor-pointer"
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
                      <div className="flex flex-col items-center gap-0.5 text-walnut/40">
                        <Plus size={14} strokeWidth={3} />
                        <span className="text-[8px] font-black uppercase tracking-wider">Juego</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Input Search */}
            <div className="mt-4 relative" ref={dropdownRef}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-walnut/40" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Busca un juego..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="focus-ring min-h-[40px] w-full rounded-md border border-walnut/20 bg-white pl-9 pr-3 text-sm text-ink shadow-sm transition hover:border-walnut/35"
                />
              </div>

              {/* Autocomplete Dropdown */}
              {searchResults.length > 0 && (
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
          </div>

          <div className="mt-6 pt-4 border-t border-walnut/8 space-y-3">
            <button
              onClick={handleContinue}
              disabled={selectedGames.length < 2}
              className="w-full min-h-[44px] px-5 text-sm rounded-md bg-gradient-to-br from-[#d97706] to-[#b45309] border border-[#78350f]/30 text-white font-black tracking-wide shadow-sm hover:scale-[1.01] transition-transform disabled:from-walnut/20 disabled:to-walnut/25 disabled:border-walnut/10 disabled:text-walnut/45 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              Continuar al registro
            </button>
            <p className="text-center text-xs font-semibold text-walnut/60">
              ¿Ya tienes cuenta?{" "}
              <button
                type="button"
                onClick={() => {
                  setResolvedMode("login");
                  setShowSignupForm(true);
                }}
                className="text-ember hover:text-amber-strong transition font-bold underline"
              >
                Entra aquí
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthScreen
      initialMode={resolvedMode}
      authContext={authContext}
      isConfigured={isConfigured}
      onSignIn={async (email, password) => {
        return signIn(email, password);
      }}
      onSignUp={async (email, password, name) => {
        return signUp(email, password, name);
      }}
      onGoogleIdTokenSignIn={async (credential) => {
        return signInWithGoogleIdToken(credential);
      }}
      onGoogleSignIn={async () => signInWithGoogle(getOAuthNextPath())}
      onDiscordSignIn={async () => signInWithDiscord(getOAuthNextPath())}
    />
  );
}
