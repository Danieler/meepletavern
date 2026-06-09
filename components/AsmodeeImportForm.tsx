"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Info, Upload } from "lucide-react";
import { createConnectorCandidateAction } from "@/app/admin/import/actions";

type AsmodeeSource = {
  id: string;
  name: string;
  status: string;
};

type AsmodeeImportFormProps = {
  sources: AsmodeeSource[];
};

export function AsmodeeImportForm({ sources }: AsmodeeImportFormProps) {
  const [selectedSourceId, setSelectedSourceId] = useState(sources[0]?.id || "");
  const selectedSource = useMemo(
    () => sources.find((source) => source.id === selectedSourceId) || sources[0] || null,
    [selectedSourceId, sources]
  );

  if (!sources.length) {
    return (
      <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-bold text-ink">Conector Asmodee por URL</h2>
        <p className="mt-2 text-sm leading-6 text-ink/60">No hay ninguna fuente Asmodee configurada.</p>
        <Link className="button-secondary mt-4 w-fit" href="/admin/sources">
          Crear fuente Asmodee
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold uppercase tracking-wide text-ruby">Conector Asmodee por URL</p>
        <h2 className="text-xl font-bold text-ink">Asmodee</h2>
        <p className="text-sm leading-6 text-ink/60">
          Crea un candidato desde una URL de producto de Asmodee. Solo aparecen fuentes compatibles con Asmodee.
        </p>
      </div>

      <form action={createConnectorCandidateAction} className="mt-5 space-y-5">
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
          <Field label="URL de producto Asmodee">
            <input
              className="field-input"
              name="sourceUrl"
              required
              placeholder="https://www.asmodee.es/producto/..."
            />
          </Field>
        </div>

        {selectedSource ? (
          <div className="rounded-md border border-ink/10 bg-parchment/60 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-ink">
              <Info size={16} aria-hidden="true" />
              Fuente seleccionada
            </div>
            <p className="mt-2 text-sm text-ink/65">
              {selectedSource.name} · {selectedSource.status}
            </p>
            <p className="mt-2 text-xs leading-5 text-ink/55">
              El conector extrae solo datos editoriales básicos y deja todo pendiente de revisión.
            </p>
          </div>
        ) : null}

        <button className="button-primary" type="submit">
          <Upload size={18} aria-hidden="true" />
          Crear con conector Asmodee
        </button>
      </form>
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
