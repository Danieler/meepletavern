"use client";

import { useRouter } from "next/navigation";
import { BrandIcon } from "@/components/BrandIcon";
import type { GameFilterInput } from "@/lib/catalog";
import { buildCatalogUrl } from "@/lib/catalogUrl";

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

  const buildUrl = (page: number) =>
    buildCatalogUrl(
      Object.fromEntries(Object.entries(active).filter(([key]) => !omitted.has(key))) as GameFilterInput,
      { page: page > 1 ? String(page) : null },
      basePath
    );

  return (
    <nav className="mt-10 grid grid-cols-[44px_minmax(0,1fr)_44px] items-center justify-center gap-2 border-t border-border-subtle pt-8 sm:flex" aria-label="Paginación">
      {currentPage > 1 ? (
        <button
          type="button"
          onClick={() => router.push(buildUrl(currentPage - 1), { scroll: false })}
          aria-label="Página anterior"
          className="inline-flex h-11 w-11 items-center justify-center gap-1 rounded-lg border border-border-default bg-paper p-0 text-sm font-bold text-text-primary transition hover:border-action/20 hover:bg-surface-base sm:h-10 sm:w-auto sm:px-3"
        >
          <BrandIcon name="chevron-left" size={16} />
          <span className="sr-only sm:not-sr-only">Anterior</span>
        </button>
      ) : (
        <span aria-label="No hay página anterior" className="inline-flex h-11 w-11 cursor-not-allowed items-center justify-center gap-1 rounded-lg border border-border-subtle bg-surface-muted/30 p-0 text-sm font-bold text-text-tertiary/50 sm:h-10 sm:w-auto sm:px-3">
          <BrandIcon name="chevron-left" size={16} />
          <span className="sr-only sm:not-sr-only">Anterior</span>
        </span>
      )}

      <div className="flex h-11 min-w-0 items-center justify-center px-2 text-center text-sm font-bold text-text-secondary sm:h-10 sm:px-4">
        <span className="sm:hidden">{currentPage} / {totalPages}</span>
        <span className="hidden sm:inline">Página {currentPage} de {totalPages}</span>
      </div>

      {currentPage < totalPages ? (
        <button
          type="button"
          onClick={() => router.push(buildUrl(currentPage + 1), { scroll: false })}
          aria-label="Página siguiente"
          className="inline-flex h-11 w-11 items-center justify-center gap-1 rounded-lg border border-border-default bg-paper p-0 text-sm font-bold text-text-primary transition hover:border-action/20 hover:bg-surface-base sm:h-10 sm:w-auto sm:px-3"
        >
          <span className="sr-only sm:not-sr-only">Siguiente</span>
          <BrandIcon name="chevron-right" size={16} />
        </button>
      ) : (
        <span aria-label="No hay página siguiente" className="inline-flex h-11 w-11 cursor-not-allowed items-center justify-center gap-1 rounded-lg border border-border-subtle bg-surface-muted/30 p-0 text-sm font-bold text-text-tertiary/50 sm:h-10 sm:w-auto sm:px-3">
          <span className="sr-only sm:not-sr-only">Siguiente</span>
          <BrandIcon name="chevron-right" size={16} />
        </span>
      )}
    </nav>
  );
}
