"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Info, Sparkles, Upload } from "lucide-react";
import { importSourceAction, type ImportSourceState } from "@/app/admin/import/actions";

type ImportSource = {
  id: string;
  name: string;
  baseUrl: string;
};

type SourceImportFormProps = {
  sources: ImportSource[];
  initialSourceId?: string;
};

const initialState: ImportSourceState = {
  error: null,
  result: null
};

export function SourceImportForm({ sources, initialSourceId = "" }: SourceImportFormProps) {
  const initialSelectedSourceId =
    sources.find((source) => source.id === initialSourceId)?.id || sources[0]?.id || "";
  const [selectedSourceId, setSelectedSourceId] = useState(initialSelectedSourceId);
  const [state, formAction, pending] = useActionState(importSourceAction, initialState);

  const selectedSource = useMemo(
    () => sources.find((source) => source.id === selectedSourceId) || sources[0] || null,
    [selectedSourceId, sources]
  );
  const expectsAmazonInput = selectedSource ? isAmazonSource(selectedSource) : false;

  if (!sources.length) {
    return (
      <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-bold text-ink">Importar juego</h2>
        <p className="mt-2 text-sm leading-6 text-ink/60">No hay ninguna fuente configurada.</p>
        <Link className="button-secondary mt-4 w-fit" href="/admin/sources">
          Crear fuente
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold uppercase tracking-wide text-ruby">Importar desde fuente</p>
        <h2 className="text-xl font-bold text-ink">Importar juego por URL</h2>
        <p className="text-sm leading-6 text-ink/60">
          Selecciona una fuente y pega la URL del juego. Si la fuente es Amazon también puedes usar un ASIN.
        </p>
      </div>

      <div className="mt-5 rounded-md border border-ink/10 bg-parchment/50 p-4">
        <p className="text-sm font-bold text-ink">Qué se creará automáticamente</p>
        <ul className="mt-2 space-y-1 text-sm leading-6 text-ink/70">
          <li>• Una ficha de juego en revisión lista para completar y publicar.</li>
          <li>• La portada principal si la fuente devuelve una imagen válida.</li>
          <li>• Un autocompletado editorial con Bedrock para dejar la ficha mucho más cerrada.</li>
        </ul>
      </div>

      <form action={formAction} className="mt-5 space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <Field label="Fuente">
            <select
              className="field-input"
              name="sourceId"
              defaultValue={selectedSourceId}
              onChange={(event) => setSelectedSourceId(event.target.value)}
            >
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={expectsAmazonInput ? "ASIN o URL del juego" : "URL del juego"}>
            <input
              className="field-input"
              name="sourceInput"
              required
              placeholder={
                expectsAmazonInput
                  ? "B0XXXXXXXX o https://www.amazon.es/dp/B0XXXXXXXX"
                  : "https://dracotienda.com/..."
              }
            />
          </Field>
        </div>

        {selectedSource ? (
          <div className="rounded-md border border-ink/10 bg-parchment/60 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-ink">
              <Info size={16} aria-hidden="true" />
              Fuente seleccionada
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">{selectedSource.name}</p>
                <p className="text-sm text-ink/60">{selectedSource.baseUrl}</p>
              </div>
              <Link className="button-secondary min-h-9 px-3 py-1.5 text-sm" href={`/admin/sources#source-${selectedSource.id}`}>
                Editar fuente
              </Link>
            </div>
          </div>
        ) : null}

        <button className="button-primary" type="submit" disabled={pending}>
          <Upload size={18} aria-hidden="true" />
          {pending ? "Importando..." : "Importar juego"}
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
            Importado · ficha en revisión
          </div>
          <div className="mt-3 grid gap-3 text-sm text-ink/75 sm:grid-cols-2">
            <InfoRow label="Título detectado" value={state.result.title} />
            <InfoRow label="Título original" value={state.result.originalTitle || "No disponible"} />
            <InfoRow label="Fuente" value={state.result.sourceName} />
            <InfoRow label="URL origen" value={state.result.sourceUrlClean} />
            <InfoRow label="Precio detectado" value={state.result.detectedPrice || "No disponible"} />
            <InfoRow label="Editorial detectada" value={state.result.detectedPublisher || "No disponible"} />
            <InfoRow label="Jugadores detectados" value={state.result.detectedPlayers || "Pendiente"} />
            <InfoRow label="Duración detectada" value={state.result.detectedPlaytime || "Pendiente"} />
            <InfoRow label="Edad detectada" value={state.result.detectedAge ? `${state.result.detectedAge}+` : "Pendiente"} />
            <InfoRow label="Imagen" value={state.result.imageStatus === "approved_public" ? "Aprobada pública" : "Marcador"} />
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

          {state.result.aiSuggestedTitle ? (
            <div className="mt-4 rounded-md border border-moss/20 bg-white px-3 py-2 text-sm font-semibold text-ink/80">
              La IA sugiere revisar el título como: <span className="text-moss">{state.result.aiSuggestedTitle}</span>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="button-primary" href={`/admin/games/${state.result.gameId}`}>
              Abrir ficha
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

function isAmazonSource(source: ImportSource) {
  return `${source.name} ${source.baseUrl}`.toLowerCase().includes("amazon.");
}
