"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Source } from "@prisma/client";
import { Save, Trash2 } from "lucide-react";
import {
  createSourceAction,
  deleteSourceAction,
  updateSourceAction,
  type SourceActionState
} from "@/app/admin/sources/actions";
import { isAmazonImportSource } from "@/lib/importSourceFilters";

const initialState: SourceActionState = {};

export function CreateSourceForm() {
  const [state, action, isPending] = useActionState(createSourceAction, initialState);

  return (
    <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
      <h2 className="text-xl font-bold text-ink">Nueva fuente</h2>
      <form action={action} className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <Field label="Nombre">
          <input className="field-input" name="name" required placeholder="Amazon España" />
        </Field>
        <Field label="URL / host">
          <input className="field-input" name="baseUrl" required placeholder="https://www.amazon.es" />
        </Field>
        <button className="button-primary md:min-h-11" type="submit" disabled={isPending}>
          <Save size={18} aria-hidden="true" />
          Crear
        </button>
      </form>
      <ActionFeedback state={state} />
    </section>
  );
}

export function SourceList({ sources }: { sources: Source[] }) {
  if (!sources.length) {
    return (
      <p className="rounded-md border border-ink/10 bg-white px-4 py-10 text-center text-ink/60 shadow-soft">
        Todavía no hay fuentes.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {sources.map((source) => (
        <EditableSourceRow key={source.id} source={source} />
      ))}
    </div>
  );
}

function EditableSourceRow({ source }: { source: Source }) {
  const [state, action, isPending] = useActionState(updateSourceAction, initialState);
  const canImport = isAmazonImportSource(source);
  const formId = `source-${source.id}`;

  return (
    <div className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <form id={formId} action={action} className="contents">
          <input type="hidden" name="id" value={source.id} />
          <Field label="Nombre">
            <input className="field-input" name="name" required defaultValue={source.name} />
          </Field>
          <Field label="URL / host">
            <input className="field-input" name="baseUrl" required defaultValue={source.baseUrl} />
          </Field>
        </form>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {canImport ? (
            <Link className="button-secondary min-h-10 px-3 py-2" href={`/admin/import?sourceId=${source.id}`}>
              Importar juegos
            </Link>
          ) : null}
          <button className="button-secondary min-h-10 px-3 py-2" type="submit" form={formId} disabled={isPending}>
            <Save size={16} aria-hidden="true" />
            Guardar
          </button>
          <form
            action={deleteSourceAction}
            onSubmit={(event) => {
              if (!window.confirm("¿Eliminar esta fuente?")) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={source.id} />
            <button className="button-danger min-h-10 px-3 py-2" type="submit">
              <Trash2 size={16} aria-hidden="true" />
              Eliminar
            </button>
          </form>
        </div>
      </div>
      <ActionFeedback state={state} />
    </div>
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

function ActionFeedback({ state }: { state: SourceActionState }) {
  if (state.error) {
    return <p className="mt-4 rounded-md border border-ruby/20 bg-ruby/10 px-3 py-2 text-sm font-semibold text-ruby">{state.error}</p>;
  }

  if (state.message) {
    return <p className="mt-4 rounded-md border border-moss/20 bg-moss/10 px-3 py-2 text-sm font-semibold text-moss">{state.message}</p>;
  }

  return null;
}
