"use client";

import { useRouter } from "next/navigation";
import { BrandIcon } from "@/components/BrandIcon";
import type { GameFilterInput } from "@/lib/catalog";

type PaginationProps = {
  active: GameFilterInput;
  totalPages: number;
  currentPage: number;
  basePath?: string;
  omitQueryKeys?: Array<keyof GameFilterInput>;
};

export function Pagination({
  active,
  totalPages,
  currentPage,
  basePath = "/juegos",
  omitQueryKeys = []
}: PaginationProps) {
  const router = useRouter();

  if (totalPages <= 1) {
    return null;
  }

  const omitted = new Set<string>(omitQueryKeys);

  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(active)) {
      if (!value || key === "page" || omitted.has(key)) continue;
      
      if (Array.isArray(value)) {
        for (const entry of value) {
          if (entry) params.append(key, entry);
        }
      } else if (typeof value === "string") {
        params.set(key, value);
      }
    }
    if (page > 1) {
      params.set("page", String(page));
    }

    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <nav className="mt-10 grid grid-cols-[44px_minmax(0,1fr)_44px] items-center justify-center gap-2 border-t border-ink/5 pt-8 sm:flex" aria-label="Paginación">
      {currentPage > 1 ? (
        <button
          type="button"
          onClick={() => router.push(buildUrl(currentPage - 1), { scroll: false })}
          aria-label="Página anterior"
          className="inline-flex h-11 w-11 items-center justify-center gap-1 rounded-md border border-ink/10 bg-white p-0 text-sm font-bold text-ink transition hover:border-moss/30 hover:bg-parchment sm:h-10 sm:w-auto sm:px-3"
        >
          <BrandIcon name="chevron-left" size={16} />
          <span className="sr-only sm:not-sr-only">Anterior</span>
        </button>
      ) : (
        <span aria-label="No hay página anterior" className="inline-flex h-11 w-11 cursor-not-allowed items-center justify-center gap-1 rounded-md border border-ink/5 bg-ink/5 p-0 text-sm font-bold text-ink/30 sm:h-10 sm:w-auto sm:px-3">
          <BrandIcon name="chevron-left" size={16} />
          <span className="sr-only sm:not-sr-only">Anterior</span>
        </span>
      )}

      <div className="flex h-11 min-w-0 items-center justify-center px-2 text-center text-sm font-bold text-ink/60 sm:h-10 sm:px-4">
        <span className="sm:hidden">{currentPage} / {totalPages}</span>
        <span className="hidden sm:inline">Página {currentPage} de {totalPages}</span>
      </div>

      {currentPage < totalPages ? (
        <button
          type="button"
          onClick={() => router.push(buildUrl(currentPage + 1), { scroll: false })}
          aria-label="Página siguiente"
          className="inline-flex h-11 w-11 items-center justify-center gap-1 rounded-md border border-ink/10 bg-white p-0 text-sm font-bold text-ink transition hover:border-moss/30 hover:bg-parchment sm:h-10 sm:w-auto sm:px-3"
        >
          <span className="sr-only sm:not-sr-only">Siguiente</span>
          <BrandIcon name="chevron-right" size={16} />
        </button>
      ) : (
        <span aria-label="No hay página siguiente" className="inline-flex h-11 w-11 cursor-not-allowed items-center justify-center gap-1 rounded-md border border-ink/5 bg-ink/5 p-0 text-sm font-bold text-ink/30 sm:h-10 sm:w-auto sm:px-3">
          <span className="sr-only sm:not-sr-only">Siguiente</span>
          <BrandIcon name="chevron-right" size={16} />
        </span>
      )}
    </nav>
  );
}
