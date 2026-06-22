"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UserGamePlayCountProps = {
  gameId: string;
  gameSlug: string;
  initialCount: number;
  isAuthenticated: boolean;
};

export function UserGamePlayCount({
  gameId,
  gameSlug,
  initialCount,
  isAuthenticated
}: UserGamePlayCountProps) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function increment() {
    if (!isAuthenticated) {
      router.push(`/auth?next=${encodeURIComponent(`/juegos/${gameSlug}`)}`);
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/account/play-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId })
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
      <p className="mt-3 text-2xl font-black text-wood">
        {isAuthenticated ? count : "Partidas jugadas"}
      </p>
      <button
        className="button-primary mt-4 min-h-10 w-full justify-center px-4 py-2 text-sm"
        type="button"
        onClick={() => void increment()}
        disabled={pending}
      >
        {pending ? "Guardando..." : "+1 partida"}
      </button>
      <p className="mt-2 text-xs font-semibold text-walnut/60">
        {isAuthenticated
          ? `Tu contador actual para este juego es ${count}.`
          : "Inicia sesión para guardar cuántas veces lo has jugado."}
      </p>
      {error ? <p className="mt-2 text-xs font-bold text-ruby">{error}</p> : null}
    </section>
  );
}
