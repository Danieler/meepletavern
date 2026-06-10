"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Info, Sparkles, Upload } from "lucide-react";
import { importAmazonAction } from "@/app/admin/import/amazon/actions";
import type { AmazonImportState } from "@/app/admin/import/amazon/actions";

type AmazonSource = {
  id: string;
  name: string;
  status: string;
  type: string;
  permissions: {
    canUseMetadata: boolean;
    canUseImages: boolean;
    canUseDescriptions: boolean;
    canUsePrices: boolean;
    canStoreImagesLocally: boolean;
  };
};

type AmazonImportFormProps = {
  sources: AmazonSource[];
};

export function AmazonImportForm({ sources }: AmazonImportFormProps) {
  const [selectedSourceId, setSelectedSourceId] = useState(sources[0]?.id || "");
  const initialAmazonImportState: AmazonImportState = { error: null, result: null };
  const [state, formAction, pending] = useActionState<AmazonImportState, FormData>(
    importAmazonAction,
    initialAmazonImportState
  );

  const selectedSource = useMemo(
    () => sources.find((source) => source.id === selectedSourceId) || sources[0] || null,
    [selectedSourceId, sources]
  );

  if (!sources.length) {
    return (
      <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-bold text-ink">Amazon PA API España</h2>
        <p className="mt-2 text-sm leading-6 text-ink/60">No hay ninguna fuente Amazon configurada.</p>
        <Link className="button-secondary mt-4 w-fit" href="/admin/sources">
          Crear fuente Amazon
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold uppercase tracking-wide text-ruby">Importar desde Amazon</p>
        <h2 className="text-xl font-bold text-ink">Amazon PA API España</h2>
        <p className="text-sm leading-6 text-ink/60">
          Importa un único juego desde ASIN o URL. El flujo usa PA API real cuando hay credenciales y, si no, intenta leer la ficha pública de Amazon.
        </p>
      </div>

      <form action={formAction} className="mt-5 space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <Field label="Fuente">
            <select
              className="field-input"
              name="sourceId"
              defaultValue={selectedSourceId}
              onChange={(event) => setSelectedSourceId(event.target.value)}
            >
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name} · {source.status}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ASIN o URL Amazon">
            <input
              className="field-input"
              name="amazonInput"
              required
              placeholder="B0XXXXXXXX o https://www.amazon.es/dp/B0XXXXXXXX"
            />
          </Field>
        </div>

        {selectedSource ? (
          <div className="rounded-md border border-ink/10 bg-parchment/60 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-ink">
                <Info size={16} aria-hidden="true" />
                Permisos de la fuente
              </div>
              <Link className="button-secondary min-h-9 px-3 py-1.5 text-sm" href={`/admin/sources#source-${selectedSource.id}`}>
                Editar fuente
              </Link>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <PermissionBadge label="metadata" value={selectedSource.permissions.canUseMetadata} />
              <PermissionBadge label="images" value={selectedSource.permissions.canUseImages} />
              <PermissionBadge label="descriptions" value={selectedSource.permissions.canUseDescriptions} />
              <PermissionBadge label="prices" value={selectedSource.permissions.canUsePrices} />
              <PermissionBadge label="store local" value={selectedSource.permissions.canStoreImagesLocally} />
            </div>
            <p className="mt-3 text-xs leading-5 text-ink/55">
              Si quieres cambiar un permiso como <span className="font-bold">descriptions</span>, usa <span className="font-bold">Editar fuente</span>.
            </p>
            <p className="mt-2 text-xs leading-5 text-ink/55">
              Las descripciones de Amazon no se copian a público. Si la API devuelve imagen y la política lo permite,
              se crea un MediaAsset aprobado y público.
            </p>
          </div>
        ) : null}

        <button className="button-primary" type="submit" disabled={pending}>
          <Upload size={18} aria-hidden="true" />
          {pending ? "Importando..." : "Importar desde Amazon"}
        </button>
      </form>

      {state.error ? (
        <p className="mt-4 rounded-md border border-ruby/20 bg-ruby/10 px-4 py-3 text-sm font-semibold text-ruby">
          {state.error}
        </p>
      ) : null}

      {state.result ? (
        <article className="mt-4 rounded-md border border-moss/20 bg-moss/10 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <Sparkles size={16} aria-hidden="true" />
            Importación completada
          </div>
          <div className="mt-3 grid gap-3 text-sm text-ink/75 sm:grid-cols-2">
            <InfoRow label="Título original" value={state.result.amazonTitleOriginal || "No disponible"} />
            <InfoRow label="Título limpio" value={state.result.cleanTitle} />
            <InfoRow label="ASIN" value={state.result.asin} />
            <InfoRow label="URL limpia" value={state.result.sourceUrlClean} />
            <InfoRow label="Jugadores detectados" value={state.result.detectedPlayers || "Pendiente"} />
            <InfoRow label="Duración detectada" value={state.result.detectedPlaytime || "Pendiente"} />
            <InfoRow label="Edad detectada" value={state.result.detectedAge ? `${state.result.detectedAge}+` : "Pendiente"} />
            <InfoRow label="Candidate" value={state.result.candidateStatus} />
            <InfoRow label="Imagen" value={state.result.imageStatus === "approved_public" ? "aprobada pública" : "placeholder"} />
            <InfoRow label="IA editorial" value={formatAiStatus(state.result.aiStatus)} />
          </div>

          {state.result.flags.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {state.result.flags.map((flag) => (
                <span key={flag} className="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-ink/70">
                  {flag}
                </span>
              ))}
            </div>
          ) : null}

          {state.result.warnings.length ? (
            <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-ink/75">
              <p className="font-black text-ink">Avisos de importación</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {state.result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {state.result.aiSuggestedTitle ? (
            <div className="mt-4 rounded-md border border-moss/20 bg-white px-3 py-2 text-sm font-semibold text-ink/80">
              La IA sugiere revisar el título como: <span className="text-moss">{state.result.aiSuggestedTitle}</span>
            </div>
          ) : null}

          {state.result.aiWarnings?.length ? (
            <div className="mt-4 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink/75">
              <p className="font-black text-ink">Avisos de IA</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {state.result.aiWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="button-secondary" href={`/admin/candidates/${state.result.candidateId}`}>
              Ver candidate
            </Link>
            <Link className="button-primary" href={`/admin/games/${state.result.gameId}`}>
              Ver game
            </Link>
          </div>
        </article>
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

function PermissionBadge({ label, value }: { label: string; value: boolean }) {
  return (
    <div className={`rounded-md px-3 py-2 text-xs font-bold ${value ? "bg-moss/10 text-moss" : "bg-ink/5 text-ink/45"}`}>
      {label}: {value ? "sí" : "no"}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-ink/45">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}

function formatAiStatus(value?: "applied" | "no_changes" | "unavailable" | "failed") {
  if (value === "applied") {
    return "completada";
  }

  if (value === "no_changes") {
    return "sin cambios";
  }

  if (value === "failed") {
    return "falló";
  }

  if (value === "unavailable") {
    return "no disponible";
  }

  return "pendiente";
}
