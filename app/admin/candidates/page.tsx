import { AdminCandidatesHeader } from "@/components/AdminCandidatesHeader";
import { AdminCandidatesTable } from "@/components/AdminCandidatesTable";
import { AdminDatabaseNotice } from "@/components/AdminDatabaseNotice";
import { getAdminDatabaseError } from "@/lib/adminDatabaseError";
import { gameCandidateRepository, type CandidateFilter } from "@/lib/editorialRepositories";

export const dynamic = "force-dynamic";

type CandidatesPageProps = {
  searchParams?: Promise<{
    filter?: CandidateFilter;
  }>;
};

const VALID_FILTERS: CandidateFilter[] = ["all", "ready", "needs_review", "missing_data", "duplicates", "rejected"];

export default async function AdminCandidatesPage({ searchParams }: CandidatesPageProps) {
  const params = await searchParams;
  const activeFilter = normalizeFilter(params?.filter);

  try {
    const candidates = await gameCandidateRepository.list(activeFilter);

    return (
      <div className="space-y-6">
        <AdminCandidatesHeader activeFilter={activeFilter} />

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
  return VALID_FILTERS.includes(value as CandidateFilter) ? (value as CandidateFilter) : "all";
}
