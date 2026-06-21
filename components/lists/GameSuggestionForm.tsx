"use client";

import { type FormEvent, useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";

type GameSuggestionFormProps = {
  initialName?: string;
  embedded?: boolean;
};

export function GameSuggestionForm({ initialName = "", embedded = false }: GameSuggestionFormProps) {
  const [name, setName] = useState(initialName);
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/account/game-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, notes })
      });
      const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "No se pudo enviar la sugerencia.");

      setFeedback({
        kind: "success",
        message: payload?.message || "Gracias. Lo revisaremos para añadirlo al catálogo."
      });
      setName("");
      setUrl("");
      setNotes("");
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "No se pudo enviar la sugerencia." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="sugerir-juego" className={embedded ? "rounded-md border border-ember/20 bg-ember/5 p-4" : "tavern-card p-5 sm:p-6"}>
      <p className="tavern-eyebrow">No lo encuentro</p>
      <h2 className={`font-display mt-2 font-bold text-wood ${embedded ? "text-xl" : "text-2xl"}`}>
        Añadir juego que falta
      </h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-walnut/65">
        Pídenos que lo añadamos a MeepleTavern. Guardaremos la petición para revisarla, sin lanzar importadores ahora.
      </p>

      <form className="mt-5 grid gap-4" onSubmit={submit}>
        <label>
          <span className="field-label">Nombre del juego</span>
          <input
            required
            minLength={2}
            maxLength={120}
            value={name}
            className="field-input mt-2"
            placeholder="Ej. El Grande"
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          <span className="field-label">Enlace opcional</span>
          <input
            type="url"
            maxLength={500}
            value={url}
            className="field-input mt-2"
            placeholder="https://..."
            onChange={(event) => setUrl(event.target.value)}
          />
        </label>
        <label>
          <span className="field-label">Notas opcionales</span>
          <textarea
            maxLength={500}
            rows={3}
            value={notes}
            className="field-input mt-2 resize-y"
            placeholder="Editorial, edición o cualquier pista útil"
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        <button type="submit" className="button-primary w-fit" disabled={loading}>
          {loading ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}
          {loading ? "Enviando..." : "Enviar sugerencia"}
        </button>
      </form>

      {feedback ? (
        <p
          className={`mt-4 flex items-center gap-2 text-sm font-semibold ${feedback.kind === "success" ? "text-moss" : "text-ruby"}`}
          role="status"
        >
          {feedback.kind === "success" ? <CheckCircle2 size={17} aria-hidden="true" /> : null}
          {feedback.message}
        </p>
      ) : null}
    </section>
  );
}
