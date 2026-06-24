"use client";

import { useEffect, useState } from "react";
import { AuthPromptModal } from "@/components/auth-cta/AuthPromptModal";
import { useAuth } from "@/hooks/useAuth";

type UserGamePlayCountProps = {
  gameId: string;
  gameSlug: string;
  initialCount?: number;
  isAuthenticated?: boolean;
};

export function UserGamePlayCount({
  gameId,
  gameSlug,
  initialCount = 0,
  isAuthenticated: serverIsAuthenticated
}: UserGamePlayCountProps) {
  const { user, loading: authLoading } = useAuth();
  const isAuthenticated = serverIsAuthenticated ?? Boolean(user);

  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);
  const [fetchingCount, setFetchingCount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (serverIsAuthenticated === undefined && user) {
      setFetchingCount(true);
      fetch(`/api/account/play-count?gameId=${encodeURIComponent(gameId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (typeof data.count === "number") {
            setCount(data.count);
          }
        })
        .catch(() => {})
        .finally(() => setFetchingCount(false));
    }
  }, [gameId, user, serverIsAuthenticated]);

  async function mutate(direction: "increment" | "decrement") {
    if (!isAuthenticated) {
      setAuthOpen(true);
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/account/play-count", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, direction })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; count?: number } | null;

      if (!response.ok || typeof payload?.count !== "number") {
        setError(payload?.error || "No se pudo guardar.");
        return;
      }

      setCount(payload.count);
    } catch {
      setError("No se pudo guardar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-ember">Partidas jugadas</p>
      <div className="mt-4 flex items-center gap-3">
        <button
          className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-walnut/15 bg-cream text-lg font-black text-wood transition hover:border-walnut/30 hover:bg-vanilla disabled:cursor-not-allowed disabled:opacity-45"
          type="button"
          onClick={() => void mutate("decrement")}
          disabled={pending || count <= 0}
          aria-label="Restar una partida"
        >
          −
        </button>
        <p className="min-w-10 text-center text-2xl font-black text-wood">{isAuthenticated ? count : "—"}</p>
        <button
          className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-walnut/15 bg-cream text-lg font-black text-wood transition hover:border-walnut/30 hover:bg-vanilla disabled:cursor-not-allowed disabled:opacity-45"
          type="button"
          onClick={() => void mutate("increment")}
          disabled={pending}
          aria-label="Sumar una partida"
        >
          +
        </button>
      </div>
      <p className="mt-2 text-xs font-semibold text-walnut/60">
        {isAuthenticated
          ? `Tu contador actual para este juego es ${count}.`
          : "Inicia sesión para guardar cuántas veces lo has jugado."}
      </p>
      {error ? <p className="mt-2 text-xs font-bold text-ruby">{error}</p> : null}
      <AuthPromptModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        next={`/juegos/${gameSlug}`}
        intent="played_game"
      />
    </section>
  );
}
