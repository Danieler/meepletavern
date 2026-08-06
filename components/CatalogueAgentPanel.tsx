"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { getAdminApiFetchHeaders } from "@/lib/adminApiClient";
import {
  catalogueAgentApiResultSchema,
  type CatalogueAgentApiResult
} from "@/lib/catalogueAgent/schemas";

export function CatalogueAgentPanel({
  categories,
  mechanics,
  disabled = false
}: {
  categories: string[];
  mechanics: string[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const activeRequest = useRef(false);
  const [category, setCategory] = useState("");
  const [mechanic, setMechanic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CatalogueAgentApiResult | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeRequest.current) return;

    activeRequest.current = true;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/admin/catalogue-agent", {
        method: "POST",
        headers: getAdminApiFetchHeaders(),
        body: JSON.stringify({
          action: "add_new_game",
          category: category || null,
          mechanic: mechanic || null
        })
      });
      const body = await response.json();

      if (!response.ok) {
        const message = typeof body?.error === "string" ? body.error : "No se pudo ejecutar el agente.";
        const diagnostics = body?.diagnostics;
        const diagnosticDetail = diagnostics && typeof diagnostics.runId === "string"
          ? ` Referencia ${diagnostics.runId}: ${Number(diagnostics.modelCalls) || 0} llamadas Nova y ${Number(diagnostics.tavilySearches) || 0} búsquedas Tavily.`
          : "";
        const technicalDetail = typeof body?.detail === "string" ? ` Detalle: ${body.detail}` : "";
        throw new Error(`${message}${technicalDetail}${diagnosticDetail}`);
      }

      const parsed = catalogueAgentApiResultSchema.parse(body);
      setResult(parsed);
      if (parsed.candidateId) {
        router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo ejecutar el agente.");
    } finally {
      activeRequest.current = false;
      setLoading(false);
    }
  }

  return (
    <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft" aria-labelledby="catalogue-agent-title">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ember/10 text-ember">
          <Sparkles size={20} aria-hidden="true" />
        </span>
        <div>
          <h2 id="catalogue-agent-title" className="font-display text-xl font-bold text-ink">Buscar e importar juego con agente</h2>
          <p className="mt-1 text-sm text-ink/60">
            Elige una opción, comprueba Games y Candidates y lanza el importador maestro para crear un Candidate revisable. Nunca publica un Game.
          </p>
        </div>
      </div>

      <form className="mt-5 grid gap-3 md:grid-cols-3 md:items-end" onSubmit={submit}>
        <label className="text-sm font-bold text-ink">
          Acción
          <select
            className="mt-1 w-full rounded-md border border-ink/20 bg-ink/5 px-3 py-2 font-normal text-ink"
            value="add_new_game"
            disabled
          >
            <option value="add_new_game">Añadir juego nuevo</option>
          </select>
        </label>

        <label className="text-sm font-bold text-ink">
          Categoría
          <select
            className="mt-1 w-full rounded-md border border-ink/20 bg-white px-3 py-2 font-normal outline-none focus:border-ember"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            disabled={loading || disabled}
          >
            <option value="">Cualquiera</option>
            {categories.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>

        <label className="text-sm font-bold text-ink">
          Mecánica
          <select
            className="mt-1 w-full rounded-md border border-ink/20 bg-white px-3 py-2 font-normal outline-none focus:border-ember"
            value={mechanic}
            onChange={(event) => setMechanic(event.target.value)}
            disabled={loading || disabled}
          >
            <option value="">Cualquiera</option>
            {mechanics.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>

        <p className="text-xs text-ink/55 md:col-span-2">
          Selecciona al menos un filtro. Si el juego no está duplicado, la importación del borrador se inicia automáticamente.
        </p>
        <button className="button-primary md:justify-self-end" type="submit" disabled={disabled || loading || (!category && !mechanic)}>
          <Search size={18} aria-hidden="true" />
          {loading ? "Buscando e importando…" : "Buscar e importar borrador"}
        </button>
      </form>

      {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="alert">{error}</p> : null}
      {result ? <CatalogueAgentResultView result={result} /> : null}
    </section>
  );
}

function CatalogueAgentResultView({ result }: { result: CatalogueAgentApiResult }) {
  return (
    <div className="mt-4 rounded-md border border-ink/10 bg-[#faf8f3] p-4 text-sm" aria-live="polite">
      <p className="font-bold text-ink">Estado: {statusLabel(result.status)}</p>
      {"selectedCandidate" in result && result.selectedCandidate ? (
        <p className="mt-2 text-ink/75">
          <span className="font-semibold">{result.candidateId ? "Juego importado:" : "Juego elegido:"}</span>{" "}
          {result.selectedCandidate.title}
        </p>
      ) : null}
      <p className="mt-2 text-ink/75">{result.reason}</p>
      {result.sources.length ? (
        <div className="mt-3">
          <p className="font-semibold text-ink">Fuentes</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {result.sources.map((source) => (
              <li key={source}>
                <a className="break-all text-moss underline" href={source} target="_blank" rel="noreferrer">{source}</a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {result.candidateId ? (
        <Link className="button-secondary mt-4" href={`/admin/candidates/${result.candidateId}`}>
          Abrir Candidate creado
        </Link>
      ) : null}
      {"diagnostics" in result && result.diagnostics ? (
        <p className="mt-3 text-xs text-ink/55">
          Coste de esta ejecución: {result.diagnostics.modelCalls} llamadas Nova y {result.diagnostics.tavilySearches} búsquedas Tavily.
        </p>
      ) : null}
    </div>
  );
}

function statusLabel(status: CatalogueAgentApiResult["status"]) {
  switch (status) {
    case "candidate_selected": return "Importación completada";
    case "possible_duplicate": return "Posible duplicado";
    case "insufficient_evidence": return "Evidencia insuficiente";
    case "limit_reached": return "Límite alcanzado";
    case "external_calls_disabled": return "Llamadas externas deshabilitadas";
  }
}
