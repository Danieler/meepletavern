"use client";

import { useEffect, useState } from "react";
import { AuthPromptModal } from "@/components/auth-cta/AuthPromptModal";
import { useAuth } from "@/hooks/useAuth";
import { useGameInteraction } from "@/components/GameInteractionProvider";

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
  const { user } = useAuth();
  const isAuthenticated = serverIsAuthenticated ?? Boolean(user);

  const { playCount: count, setPlayCount: setCount } = useGameInteraction();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  async function mutate(direction: "increment" | "decrement") {
    if (!isAuthenticated) {
      setAuthOpen(true);
      return;
    }

    const prevCount = count;
    setError(null);
    setPending(true);

    // Optimistically update the count
    setCount((current) => {
      if (direction === "decrement") {
        return Math.max(0, current - 1);
      }
      return current + 1;
    });

    try {
      const response = await fetch("/api/account/play-count", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, direction })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; count?: number } | null;

      if (!response.ok || typeof payload?.count !== "number") {
        // Rollback
        setCount(prevCount);
        setError(payload?.error || "No se pudo guardar.");
        return;
      }

      // Sync with server count
      setCount(payload.count);
    } catch {
      // Rollback
      setCount(prevCount);
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
          : "Entra y guarda cuántas veces lo has sacado a mesa."}
      </p>
      {error ? <p className="mt-2 text-xs font-bold text-ruby">{error}</p> : null}
      <AuthPromptModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        title="Guarda esta partida en tu ludoteca"
        description="Entra en segundos y tu contador recordará cada vez que este juego volvió a mesa."
        next={`/juegos/${gameSlug}`}
        intent="played_game"
      />
    </section>
  );
}
