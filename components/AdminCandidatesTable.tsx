"use client";

import { Eye, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteCandidatesBulkAction } from "@/app/admin/candidates/[id]/actions";
import { DeleteCandidateButton } from "@/components/AdminDeleteButtons";

type AdminCandidateRow = {
  id: string;
  title: string;
  status: string;
  confidence: number;
  flags: string[];
  createdAt: Date;
  source: {
    name: string;
  };
};

export function AdminCandidatesTable({
  candidates,
  returnTo
}: {
  candidates: AdminCandidateRow[];
  returnTo: string;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => candidates.some((candidate) => candidate.id === id)));
  }, [candidates]);

  const allSelected = candidates.length > 0 && selectedIds.length === candidates.length;

  return (
    <div className="overflow-hidden rounded-md border border-ink/10 bg-white shadow-soft">
      <div className="flex flex-col gap-3 border-b border-ink/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-ink/60">
          {selectedIds.length ? `${selectedIds.length} seleccionados` : "Selecciona candidatos para borrarlos en bloque."}
        </p>
        <form
          action={deleteCandidatesBulkAction}
          onSubmit={(event) => {
            if (!selectedIds.length) {
              event.preventDefault();
              return;
            }

            if (!window.confirm("¿Eliminar los candidatos seleccionados?")) {
              event.preventDefault();
            }
          }}
        >
          {selectedIds.map((id) => (
            <input key={id} type="hidden" name="ids" value={id} />
          ))}
          <input type="hidden" name="returnTo" value={returnTo} />
          <button className="button-danger min-h-9 px-3 py-1.5" disabled={!selectedIds.length} type="submit">
            <Trash2 size={16} aria-hidden="true" />
            Eliminar seleccionados
          </button>
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-ink/10 text-left text-sm">
          <thead className="bg-ink text-white">
            <tr>
              <ThCheckbox>
                <input
                  type="checkbox"
                  aria-label="Seleccionar todos los candidatos"
                  checked={allSelected}
                  onChange={(event) => {
                    setSelectedIds(event.target.checked ? candidates.map((candidate) => candidate.id) : []);
                  }}
                />
              </ThCheckbox>
              <Th>Título</Th>
              <Th>Fuente</Th>
              <Th>Estado</Th>
              <Th>Confianza</Th>
              <Th>Flags</Th>
              <Th>Creado</Th>
              <Th />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {candidates.map((candidate) => {
              const checked = selectedIds.includes(candidate.id);

              return (
                <tr key={candidate.id} className="align-top">
                  <TdCheckbox>
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar ${candidate.title}`}
                      checked={checked}
                      onChange={(event) => {
                        setSelectedIds((current) =>
                          event.target.checked
                            ? [...current, candidate.id]
                            : current.filter((id) => id !== candidate.id)
                        );
                      }}
                    />
                  </TdCheckbox>
                  <Td>
                    <span className="font-bold text-ink">{candidate.title}</span>
                  </Td>
                  <Td>{candidate.source.name}</Td>
                  <Td>{candidate.status}</Td>
                  <Td>{Math.round(candidate.confidence * 100)}%</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.flags.map((flag) => (
                        <span key={flag} className="rounded-md bg-ember/10 px-2 py-1 text-xs font-semibold text-ink">
                          {flag}
                        </span>
                      ))}
                      {!candidate.flags.length ? <span className="text-ink/45">Sin flags</span> : null}
                    </div>
                  </Td>
                  <Td>{formatDate(candidate.createdAt)}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      <Link className="button-secondary min-h-9 px-3 py-1.5" href={`/admin/candidates/${candidate.id}`}>
                        <Eye size={16} aria-hidden="true" />
                        Ver
                      </Link>
                      <DeleteCandidateButton id={candidate.id} returnTo={returnTo} compact />
                    </div>
                  </Td>
                </tr>
              );
            })}
            {!candidates.length ? (
              <tr>
                <td className="px-4 py-10 text-center text-ink/60" colSpan={8}>
                  No hay candidatos para este filtro.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase">{children}</th>;
}

function ThCheckbox({ children }: { children: React.ReactNode }) {
  return <th className="w-12 px-4 py-3 text-xs font-bold uppercase">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-4 text-ink/70">{children}</td>;
}

function TdCheckbox({ children }: { children: React.ReactNode }) {
  return <td className="w-12 px-4 py-4 text-ink/70">{children}</td>;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
