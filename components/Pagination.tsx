import Link from "next/link";
import { BrandIcon } from "@/components/BrandIcon";
import type { GameFilterInput } from "@/lib/catalog";

type PaginationProps = {
  active: GameFilterInput;
  totalPages: number;
  currentPage: number;
};

export function Pagination({ active, totalPages, currentPage }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(active)) {
      if (!value || key === "page") continue;
      
      if (Array.isArray(value)) {
        for (const entry of value) {
          if (entry) params.append(key, entry);
        }
      } else if (typeof value === "string") {
        params.set(key, value);
      }
    }
    params.set("page", String(page));
    return `/juegos?${params.toString()}`;
  };

  return (
    <nav className="mt-10 flex items-center justify-center gap-2 border-t border-ink/5 pt-8" aria-label="Paginación">
      {currentPage > 1 ? (
        <Link
          href={buildUrl(currentPage - 1)}
          className="inline-flex h-10 items-center gap-1 rounded-md border border-ink/10 bg-white px-3 text-sm font-bold text-ink transition hover:border-moss/30 hover:bg-parchment"
        >
          <BrandIcon name="chevron-left" size={16} />
          Anterior
        </Link>
      ) : (
        <span className="inline-flex h-10 cursor-not-allowed items-center gap-1 rounded-md border border-ink/5 bg-ink/5 px-3 text-sm font-bold text-ink/30">
          <BrandIcon name="chevron-left" size={16} />
          Anterior
        </span>
      )}

      <div className="flex h-10 items-center px-4 text-sm font-bold text-ink/60">
        Página {currentPage} de {totalPages}
      </div>

      {currentPage < totalPages ? (
        <Link
          href={buildUrl(currentPage + 1)}
          className="inline-flex h-10 items-center gap-1 rounded-md border border-ink/10 bg-white px-3 text-sm font-bold text-ink transition hover:border-moss/30 hover:bg-parchment"
        >
          Siguiente
          <BrandIcon name="chevron-right" size={16} />
        </Link>
      ) : (
        <span className="inline-flex h-10 cursor-not-allowed items-center gap-1 rounded-md border border-ink/5 bg-ink/5 px-3 text-sm font-bold text-ink/30">
          Siguiente
          <BrandIcon name="chevron-right" size={16} />
        </span>
      )}
    </nav>
  );
}
