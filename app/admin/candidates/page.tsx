import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { AdminCandidatesTable } from "@/components/AdminCandidatesTable";
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

        <AdminCandidatesTable
          candidates={candidates}
          returnTo={`/admin/candidates?filter=${activeFilter}`}
        />
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
