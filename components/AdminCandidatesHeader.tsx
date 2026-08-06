"use client";

import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { AdminSectionHeader } from "@/components/AdminSectionHeader";
import { useAdminI18n } from "@/lib/adminI18n";
import type { CandidateFilter } from "@/lib/editorialRepositories";

export function AdminCandidatesHeader({ activeFilter }: { activeFilter: CandidateFilter }) {
  const { lang, t } = useAdminI18n();

  const filters: { value: CandidateFilter; labelEs: string; labelEn: string }[] = [
    { value: "all", labelEs: "Todos", labelEn: "All" },
    { value: "ready", labelEs: "Ready", labelEn: "Ready" },
    { value: "needs_review", labelEs: "Needs review", labelEn: "Needs review" },
    { value: "missing_data", labelEs: "Missing data", labelEn: "Missing data" },
    { value: "duplicates", labelEs: "Duplicates", labelEn: "Duplicates" },
    { value: "rejected", labelEs: "Rejected", labelEn: "Rejected" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <AdminSectionHeader
          titleKey="candidates.title"
          descriptionKey="candidates.description"
        />
        <Link className="button-primary" href="/admin/import">
          <PlusCircle size={18} aria-hidden="true" />
          {lang === "en" ? "Manual Import" : "Importación manual"}
        </Link>
      </div>

      <nav className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Link
            key={filter.value}
            className={filter.value === activeFilter ? "button-primary min-h-9 px-3 py-1.5" : "button-secondary min-h-9 px-3 py-1.5"}
            href={`/admin/candidates?filter=${filter.value}`}
          >
            {lang === "en" ? filter.labelEn : filter.labelEs}
          </Link>
        ))}
      </nav>
    </div>
  );
}
