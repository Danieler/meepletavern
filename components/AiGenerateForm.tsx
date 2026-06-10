"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getAdminApiFetchHeaders } from "@/lib/adminApiClient";

export function AiGenerateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/games/generate-ai", {
        method: "POST",
        headers: getAdminApiFetchHeaders(),
        body: JSON.stringify({ name })
      });
      const payload = (await response.json()) as { gameId?: string; error?: string };

      if (!response.ok || !payload.gameId) {
        throw new Error(payload.error || "No se pudo generar la ficha.");
      }

      router.push(`/admin/games/${payload.gameId}/edit`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo generar la ficha.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
      <label htmlFor="game-name" className="field-label">
        Nombre del juego
      </label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          id="game-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="field-input min-h-12"
          placeholder="Arkham Horror LCG"
          disabled={isLoading}
        />
        <button type="submit" className="button-primary" disabled={isLoading}>
          <Sparkles size={18} aria-hidden="true" />
          {isLoading ? "Generando..." : "Generar ficha"}
        </button>
      </div>
      {error ? (
        <p className="mt-4 rounded-md border border-ruby/20 bg-ruby/10 px-3 py-2 text-sm font-semibold text-ruby">
          {error}
        </p>
      ) : null}
    </form>
  );
}
