import Link from "next/link";
import { Eye, PlusCircle } from "lucide-react";
import { AdminDatabaseNotice } from "@/components/AdminDatabaseNotice";
import { SectionHeader } from "@/components/SectionHeader";
import { getAdminDatabaseError } from "@/lib/adminDatabaseError";
import { gameCandidateRepository, type CandidateFilter } from "@/lib/editorialRepositories";

export const dynamic = "force-dynamic";

type CandidatesPageProps = {
  searchParams?: Promise<{
    filter?: CandidateFilter;
  }>;
};

const filters: { value: CandidateFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "ready", label: "Ready" },
  { value: "needs_review", label: "Needs review" },
  { value: "missing_data", label: "Missing data" },
  { value: "needs_permission", label: "Needs permission" },
  { value: "duplicates", label: "Duplicates" },
  { value: "rejected", label: "Rejected" }
];

export default async function AdminCandidatesPage({ searchParams }: CandidatesPageProps) {
  const params = await searchParams;
  const activeFilter = normalizeFilter(params?.filter);

  try {
    const candidates = await gameCandidateRepository.list(activeFilter);

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeader
            title="Bandeja editorial"
            description="Revisa candidatos manuales antes de convertirlos en juegos no publicados."
          />
          <Link className="button-primary" href="/admin/import">
            <PlusCircle size={18} aria-hidden="true" />
            Importación manual
          </Link>
        </div>

        <nav className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Link
              key={filter.value}
              className={filter.value === activeFilter ? "button-primary min-h-9 px-3 py-1.5" : "button-secondary min-h-9 px-3 py-1.5"}
              href={`/admin/candidates?filter=${filter.value}`}
            >
              {filter.label}
            </Link>
          ))}
        </nav>

        <div className="overflow-hidden rounded-md border border-ink/10 bg-white shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ink/10 text-left text-sm">
              <thead className="bg-ink text-white">
                <tr>
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
                {candidates.map((candidate) => (
                  <tr key={candidate.id} className="align-top">
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
                      <Link className="button-secondary min-h-9 px-3 py-1.5" href={`/admin/candidates/${candidate.id}`}>
                        <Eye size={16} aria-hidden="true" />
                        Ver
                      </Link>
                    </Td>
                  </tr>
                ))}
                {!candidates.length ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-ink/60" colSpan={7}>
                      No hay candidatos para este filtro.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    const databaseError = getAdminDatabaseError(error);

    if (!databaseError) {
      throw error;
    }

    return <AdminDatabaseNotice error={databaseError} />;
  }
}

function normalizeFilter(value: unknown): CandidateFilter {
  return filters.some((filter) => filter.value === value) ? (value as CandidateFilter) : "all";
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-4 text-ink/70">{children}</td>;
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
