"use client";

import { useActionState } from "react";
import Link from "next/link";
import { DatabaseZap, Loader2 } from "lucide-react";
import { importMasterGamesAction, type MasterImportBatchState } from "@/app/admin/import/actions";

const initialState: MasterImportBatchState = {
  error: null,
  message: null,
  results: [],
  totals: null
};

export function MasterImportForm({ disabled }: { disabled?: boolean }) {
  const [state, action, isPending] = useActionState(importMasterGamesAction, initialState);

  if (disabled) {
    return (
      <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">Importador maestro</p>
          <h2 className="text-xl font-bold text-ink">Importar por nombre o lote</h2>
          <p className="text-sm leading-6 text-ink/60">Necesitas dar de alta al menos una fuente antes de lanzar búsquedas automáticas.</p>
        </div>
        <Link className="button-secondary mt-4 w-fit" href="/admin/sources">
          Configurar fuentes
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">Importador maestro</p>
        <h2 className="text-xl font-bold text-ink">Importar por nombre o por lote</h2>
        <p className="text-sm leading-6 text-ink/60">
          Pega un nombre, una lista con una línea por juego o un array JSON. El sistema buscará coincidencias en todas las
          fuentes compatibles y creará o actualizará candidatos automáticamente.
        </p>
      </div>

      <div className="mt-5 rounded-md border border-ink/10 bg-parchment/50 p-4">
        <p className="text-sm font-bold text-ink">Formato admitido</p>
        <ul className="mt-2 space-y-1 text-sm leading-6 text-ink/70">
          <li>• Un único nombre: `Ark Nova`</li>
          <li>• Una línea por juego: `Ark Nova` + salto de línea + `Cascadia`</li>
          <li>• Array JSON: `["Ark Nova", "Cascadia"]`</li>
        </ul>
      </div>

      <form action={action} className="mt-5 space-y-5">
        <Field label="Juego o lista de juegos">
          <textarea
            className="field-input min-h-44"
            name="titles"
            required
            placeholder={"Ark Nova\nCascadia\nBrass: Birmingham"}
          />
        </Field>

        <div className="space-y-4">
          <button className="button-primary" type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <DatabaseZap size={18} aria-hidden="true" />}
            {isPending ? "Importando lote..." : "Lanzar importador maestro"}
          </button>

          {isPending ? (
            <p className="inline-flex items-center gap-2 rounded-md border border-ember/20 bg-ember/10 px-4 py-3 text-sm font-semibold text-ink">
              <Loader2 className="animate-spin" size={16} aria-hidden="true" />
              Buscando coincidencias en todas las fuentes y guardando candidatos en la bandeja editorial.
            </p>
          ) : null}
        </div>
      </form>

      {state.error ? (
        <p className="mt-4 rounded-md border border-ruby/20 bg-ruby/10 px-4 py-3 text-sm font-semibold text-ruby">{state.error}</p>
      ) : null}

      {state.message ? (
        <p className="mt-4 rounded-md border border-moss/20 bg-moss/10 px-4 py-3 text-sm font-semibold text-moss">{state.message}</p>
      ) : null}

      {state.totals ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatCard label="Solicitados" value={String(state.totals.requested)} />
          <StatCard label="Importados" value={String(state.totals.imported)} />
          <StatCard label="Fallidos" value={String(state.totals.failed)} />
        </div>
      ) : null}

      {state.results.length ? (
        <div className="mt-5 space-y-3">
          {state.results.map((result) => (
            <article key={result.inputTitle} className="rounded-md border border-ink/10 bg-parchment/40 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-ink">{result.importedTitle || result.inputTitle}</p>
                  <p className="text-sm text-ink/60">Entrada: {result.inputTitle}</p>
                </div>
                <span className={buildStatusClassName(result.status)}>{formatStatus(result.status)}</span>
              </div>

              {result.matchedSources.length ? (
                <p className="mt-3 text-sm text-ink/70">Fuentes: {result.matchedSources.join(", ")}</p>
              ) : null}

              <p className="mt-2 text-sm text-ink/70">
                Ofertas creadas: {result.offersCreated} · Ofertas actualizadas: {result.offersUpdated}
              </p>

              {result.sourcesWithOffers.length ? (
                <p className="mt-2 text-sm text-moss">Fuentes con oferta: {result.sourcesWithOffers.join(", ")}</p>
              ) : null}

              {result.sourcesWithoutOffers.length ? (
                <p className="mt-2 text-sm text-amber-700">Fuentes sin oferta útil: {result.sourcesWithoutOffers.join(", ")}</p>
              ) : null}

              {result.failedSources.length ? (
                <p className="mt-2 text-sm text-ruby">
                  Fallos: {result.failedSources.map((source) => `${source.sourceName}: ${source.reason}`).join(" · ")}
                </p>
              ) : null}

              {result.bestOffer ? (
                <p className="mt-2 text-sm font-semibold text-ink">
                  Mejor oferta:{" "}
                  <a
                    className="text-emerald-700 underline decoration-emerald-300 underline-offset-2"
                    href={result.bestOffer.affiliateUrl || result.bestOffer.purchaseUrl || result.bestOffer.sourceUrl || "#"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {result.bestOffer.sourceDisplayName}
                    {result.bestOffer.price !== null ? ` ${formatMoney(result.bestOffer.price, result.bestOffer.currency)}` : ""}
                  </a>
                </p>
              ) : null}

              {result.sourceDiagnostics.length ? (
                <div className="mt-3 space-y-1 text-sm text-ink/65">
                  {result.sourceDiagnostics.map((diagnostic) => (
                    <p key={`${result.inputTitle}-${diagnostic.sourceName}-${diagnostic.stage}-${diagnostic.outcome}`}>
                      {diagnostic.sourceName}: {diagnostic.outcome}
                      {diagnostic.reason ? ` · ${diagnostic.reason}` : ""}
                    </p>
                  ))}
                </div>
              ) : null}

              {result.warnings.length ? (
                <p className="mt-2 text-sm text-amber-700">Avisos: {result.warnings.join(" ")}</p>
              ) : null}

              {result.error ? <p className="mt-2 text-sm font-semibold text-ruby">{result.error}</p> : null}

              {result.candidateId ? (
                <div className="mt-3">
                  <Link className="button-secondary min-h-9 px-3 py-1.5 text-sm" href={`/admin/candidates/${result.candidateId}`}>
                    Abrir candidato
                  </Link>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ink/60">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-ink/10 bg-parchment/40 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-ink/50">{label}</p>
      <p className="mt-1 text-2xl font-black text-ink">{value}</p>
    </div>
  );
}

function buildStatusClassName(status: MasterImportBatchState["results"][number]["status"]) {
  if (status === "failed") {
    return "inline-flex w-fit rounded-full bg-ruby/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-ruby";
  }

  if (status === "ready_to_publish") {
    return "inline-flex w-fit rounded-full bg-moss/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-moss";
  }

  return "inline-flex w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800";
}

function formatStatus(status: MasterImportBatchState["results"][number]["status"]) {
  switch (status) {
    case "ready_to_publish":
      return "Ready";
    case "needs_review":
      return "Needs review";
    case "draft":
      return "Draft";
    case "update_existing":
      return "Update existing";
    case "duplicate":
      return "Duplicate";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

function formatMoney(value: number, currency: string | null) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency || "EUR"
  }).format(value);
}
