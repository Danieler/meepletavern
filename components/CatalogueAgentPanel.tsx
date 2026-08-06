"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { getAdminApiFetchHeaders } from "@/lib/adminApiClient";
import { useAdminI18n } from "@/lib/adminI18n";
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
  const { lang, t } = useAdminI18n();
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
        const message = typeof body?.error === "string" ? body.error : (lang === "en" ? "Could not run agent." : "No se pudo ejecutar el agente.");
        const diagnostics = body?.diagnostics;
        const diagnosticDetail = diagnostics && typeof diagnostics.runId === "string"
          ? (lang === "en" ? ` Run ref ${diagnostics.runId}: ${Number(diagnostics.modelCalls) || 0} Nova calls and ${Number(diagnostics.tavilySearches) || 0} Tavily searches.` : ` Referencia ${diagnostics.runId}: ${Number(diagnostics.modelCalls) || 0} llamadas Nova y ${Number(diagnostics.tavilySearches) || 0} búsquedas Tavily.`)
          : "";
        const technicalDetail = typeof body?.detail === "string" ? ` ${lang === "en" ? "Detail:" : "Detalle:"} ${body.detail}` : "";
        throw new Error(`${message}${technicalDetail}${diagnosticDetail}`);
      }

      const parsed = catalogueAgentApiResultSchema.parse(body);
      setResult(parsed);
      if (parsed.candidateId) {
        router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : (lang === "en" ? "Could not run agent." : "No se pudo ejecutar el agente."));
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
          <h2 id="catalogue-agent-title" className="font-display text-xl font-bold text-ink">{t("catalogueAgent.title")}</h2>
          <p className="mt-1 text-sm text-ink/60">
            {t("catalogueAgent.description")}
          </p>
        </div>
      </div>

      <form className="mt-5 grid gap-3 md:grid-cols-3 md:items-end" onSubmit={submit}>
        <label className="text-sm font-bold text-ink">
          {t("catalogueAgent.action")}
          <select
            className="mt-1 w-full rounded-md border border-ink/20 bg-ink/5 px-3 py-2 font-normal text-ink"
            value="add_new_game"
            disabled
          >
            <option value="add_new_game">{t("catalogueAgent.addNewGame")}</option>
          </select>
        </label>

        <label className="text-sm font-bold text-ink">
          {t("catalogueAgent.category")}
          <select
            className="mt-1 w-full rounded-md border border-ink/20 bg-white px-3 py-2 font-normal outline-none focus:border-ember"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            disabled={loading || disabled}
          >
            <option value="">{t("catalogueAgent.any")}</option>
            {categories.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>

        <label className="text-sm font-bold text-ink">
          {t("catalogueAgent.mechanic")}
          <select
            className="mt-1 w-full rounded-md border border-ink/20 bg-white px-3 py-2 font-normal outline-none focus:border-ember"
            value={mechanic}
            onChange={(event) => setMechanic(event.target.value)}
            disabled={loading || disabled}
          >
            <option value="">{t("catalogueAgent.any")}</option>
            {mechanics.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>

        <p className="text-xs text-ink/55 md:col-span-2">
          {t("catalogueAgent.filterHelp")}
        </p>
        <button className="button-primary md:justify-self-end" type="submit" disabled={disabled || loading || (!category && !mechanic)}>
          <Search size={18} aria-hidden="true" />
          {loading ? t("catalogueAgent.searching") : t("catalogueAgent.searchButton")}
        </button>
      </form>

      {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="alert">{error}</p> : null}
      {result ? <CatalogueAgentResultView result={result} /> : null}
    </section>
  );
}

function CatalogueAgentResultView({ result }: { result: CatalogueAgentApiResult }) {
  const { lang, t } = useAdminI18n();

  return (
    <div className="mt-4 rounded-md border border-ink/10 bg-[#faf8f3] p-4 text-sm" aria-live="polite">
      <p className="font-bold text-ink">{t("catalogueAgent.status")}: {statusLabel(result.status, lang)}</p>
      {"selectedCandidate" in result && result.selectedCandidate ? (
        <p className="mt-2 text-ink/75">
          <span className="font-semibold">{result.candidateId ? t("catalogueAgent.importedGame") : t("catalogueAgent.chosenGame")}</span>{" "}
          {result.selectedCandidate.title}
        </p>
      ) : null}
      <p className="mt-2 text-ink/75">{result.reason}</p>
      {result.sources.length ? (
        <div className="mt-3">
          <p className="font-semibold text-ink">{t("catalogueAgent.sources")}</p>
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
          {t("catalogueAgent.openCandidate")}
        </Link>
      ) : null}
      {"diagnostics" in result && result.diagnostics ? (
        <p className="mt-3 text-xs text-ink/55">
          {lang === "en"
            ? `Execution cost: ${result.diagnostics.modelCalls} Nova calls and ${result.diagnostics.tavilySearches} Tavily searches.`
            : `Coste de esta ejecución: ${result.diagnostics.modelCalls} llamadas Nova y ${result.diagnostics.tavilySearches} búsquedas Tavily.`}
        </p>
      ) : null}
    </div>
  );
}

function statusLabel(status: CatalogueAgentApiResult["status"], lang: string) {
  if (lang === "en") {
    switch (status) {
      case "candidate_selected": return "Import completed";
      case "possible_duplicate": return "Possible duplicate";
      case "insufficient_evidence": return "Insufficient evidence";
      case "limit_reached": return "Limit reached";
      case "external_calls_disabled": return "External calls disabled";
    }
  }
  switch (status) {
    case "candidate_selected": return "Importación completada";
    case "possible_duplicate": return "Posible duplicado";
    case "insufficient_evidence": return "Evidencia insuficiente";
    case "limit_reached": return "Límite alcanzado";
    case "external_calls_disabled": return "Llamadas externas deshabilitadas";
  }
}
