"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import { bulkImportAction } from "@/app/admin/import/bulk/actions";

type AdminBulkImportFormProps = {
  sources: {
    id: string;
    name: string;
    status: string;
  }[];
};

type BulkImportState = {
  ok: boolean;
  error: string | null;
  results: {
    url: string;
    status: "success" | "failed" | "duplicate" | "needs_review";
    candidateId?: string;
    message?: string;
  }[];
};

const initialBulkImportState: BulkImportState = {
  ok: false,
  error: null,
  results: []
};

export function AdminBulkImportForm({ sources }: AdminBulkImportFormProps) {
  const [state, formAction, pending] = useActionState<BulkImportState, FormData>(
    bulkImportAction,
    initialBulkImportState
  );

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5 rounded-md border border-ink/10 bg-white p-5 shadow-soft">
        <div className="grid gap-4 md:grid-cols-[1fr_160px]">
          <Field label="Fuente">
            <select className="field-input" name="sourceId" required>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name} · {source.status}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Límite">
            <input className="field-input" name="limit" type="number" min="1" max="20" defaultValue="10" />
          </Field>
        </div>
        <Field label="URLs, una por línea">
          <textarea
            className="field-textarea min-h-56"
            name="urls"
            required
            placeholder="https://www.asmodee.es/product/..."
          />
        </Field>
        <button className="button-primary" type="submit" disabled={pending}>
          <Upload size={18} aria-hidden="true" />
          {pending ? "Importando..." : "Crear candidatos"}
        </button>
      </form>

      {state.error ? (
        <div className="rounded-md border border-ember/30 bg-ember/10 p-4 text-sm font-semibold text-ink">
          {state.error}
        </div>
      ) : null}

      {state.results.length ? (
        <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-ink">Resultado</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink/50">
                <tr>
                  <th className="border-b border-ink/10 py-2 pr-4">URL</th>
                  <th className="border-b border-ink/10 py-2 pr-4">Estado</th>
                  <th className="border-b border-ink/10 py-2 pr-4">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {state.results.map((result) => (
                  <tr key={result.url}>
                    <td className="border-b border-ink/5 py-3 pr-4">
                      <a className="font-semibold text-moss" href={result.url} target="_blank" rel="noreferrer">
                        {result.url}
                      </a>
                    </td>
                    <td className="border-b border-ink/5 py-3 pr-4 font-semibold">{result.status}</td>
                    <td className="border-b border-ink/5 py-3 pr-4 text-ink/65">
                      {result.candidateId ? (
                        <Link className="font-semibold text-moss" href={`/admin/candidates/${result.candidateId}`}>
                          Ver candidato
                        </Link>
                      ) : (
                        result.message || "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
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
