"use client";

import { GameStatus } from "@prisma/client";
import { ArrowLeft, ArrowRight, ArrowDown, ArrowUpDown, ArrowUp, ExternalLink, Pencil, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { deleteGamesBulkAction } from "@/app/admin/games/[id]/actions";
import { DeleteGameButton } from "@/components/AdminDeleteButtons";
import { AdminStatusBadge } from "@/components/AdminStatusBadge";

type AdminGameRow = {
  id: string;
  name: string;
  status: GameStatus;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
};

type SortKey = "name" | "status" | "slug" | "createdAt" | "updatedAt";
type SortDirection = "asc" | "desc";
type StatusFilter = "all" | "review" | "published";
const PAGE_SIZE = 10;

export function AdminGamesTable({
  games,
  returnTo
}: {
  games: AdminGameRow[];
  returnTo: string;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "updatedAt",
    direction: "desc"
  });

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => games.some((game) => game.id === id)));
  }, [games]);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredGames = useMemo(
    () =>
      games.filter((game) => {
        if (statusFilter === "review" && game.status !== GameStatus.review) {
          return false;
        }

        if (statusFilter === "published" && game.status !== GameStatus.published) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return [game.name, game.slug, statusLabel(game.status)]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      }),
    [games, normalizedSearch, statusFilter]
  );

  const sortedGames = useMemo(
    () =>
      [...filteredGames].sort((left, right) => {
        const comparison = compareGameValues(left[sortConfig.key], right[sortConfig.key], sortConfig.key);

        return sortConfig.direction === "asc" ? comparison : -comparison;
      }),
    [filteredGames, sortConfig]
  );

  const totalPages = Math.max(1, Math.ceil(sortedGames.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageGames = sortedGames.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pageIds = pageGames.map((game) => game.id);
  const selectedPageCount = pageIds.filter((id) => selectedIds.includes(id)).length;

  useEffect(() => {
    setPage(1);
  }, [normalizedSearch, sortConfig, statusFilter]);

  const selectedGames = games.filter((game) => selectedIds.includes(game.id));
  const allSelected = pageIds.length > 0 && selectedPageCount === pageIds.length;
  const hasPublishedSelected = selectedGames.some((game) => game.status === GameStatus.published);
  const hasFilter = Boolean(normalizedSearch) || statusFilter !== "all";

  function toggleCurrentPageSelection(checked: boolean) {
    setSelectedIds((current) => {
      if (checked) {
        return [...new Set([...current, ...pageIds])];
      }

      return current.filter((id) => !pageIds.includes(id));
    });
  }

  function clearSearch() {
    setSearch("");
  }

  return (
    <div className="overflow-hidden rounded-md border border-ink/10 bg-white shadow-soft">
      <div className="flex flex-col gap-3 border-b border-ink/10 px-4 py-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3 lg:gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <label className="block w-full lg:w-[340px]">
              <span className="text-xs font-bold uppercase text-ink/55">Buscar</span>
              <span className="mt-1 flex items-center gap-2 rounded-md border border-ink/10 bg-white px-3 py-2 shadow-soft focus-within:border-moss/40">
                <Search size={16} className="text-ink/35" aria-hidden="true" />
                <input
                  className="w-full bg-transparent text-sm outline-none placeholder:text-ink/35"
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                  }}
                  placeholder="Nombre, slug o estado"
                />
                {search ? (
                  <button
                    className="rounded-full p-1 text-ink/45 transition hover:bg-ink/5 hover:text-ink"
                    type="button"
                    onClick={clearSearch}
                    aria-label="Limpiar búsqueda"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                ) : null}
              </span>
            </label>
            <p className="text-sm font-semibold text-ink/60">
              {selectedIds.length
                ? `${selectedIds.length} seleccionados`
                : "Selecciona juegos para borrarlos en bloque."}
              <span className="block text-xs font-medium text-ink/45">
                Total: {sortedGames.length} juego{sortedGames.length === 1 ? "" : "s"}
                {hasFilter ? " filtrado" : ""}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
              Todos
            </FilterChip>
            <FilterChip active={statusFilter === "review"} onClick={() => setStatusFilter("review")}>
              En revisión
            </FilterChip>
            <FilterChip active={statusFilter === "published"} onClick={() => setStatusFilter("published")}>
              Publicados
            </FilterChip>
          </div>
        </div>
        <form
          action={deleteGamesBulkAction}
          onSubmit={(event) => {
            if (!selectedIds.length) {
              event.preventDefault();
              return;
            }

            const confirmed = window.confirm(
              hasPublishedSelected
                ? "¿Eliminar los juegos seleccionados? Algunos están publicados y desaparecerán de la web pública."
                : "¿Eliminar los juegos seleccionados?"
            );

            if (!confirmed) {
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
                  aria-label="Seleccionar todos los juegos"
                  checked={allSelected}
                  onChange={(event) => {
                    setSelectedIds(event.target.checked ? sortedGames.map((game) => game.id) : []);
                  }}
                />
              </ThCheckbox>
              <SortableTh label="Nombre" sortKey="name" sortConfig={sortConfig} setSortConfig={setSortConfig} />
              <SortableTh label="Estado" sortKey="status" sortConfig={sortConfig} setSortConfig={setSortConfig} />
              <SortableTh label="Slug" sortKey="slug" sortConfig={sortConfig} setSortConfig={setSortConfig} />
              <SortableTh label="Creado" sortKey="createdAt" sortConfig={sortConfig} setSortConfig={setSortConfig} />
              <SortableTh
                label="Actualizado"
                sortKey="updatedAt"
                sortConfig={sortConfig}
                setSortConfig={setSortConfig}
              />
              <Th>Acciones</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {pageGames.map((game) => {
              const checked = selectedIds.includes(game.id);

              return (
                <tr key={game.id} className="align-top">
                  <TdCheckbox>
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar ${game.name}`}
                      checked={checked}
                      onChange={(event) => {
                        setSelectedIds((current) =>
                          event.target.checked
                            ? [...current, game.id]
                            : current.filter((id) => id !== game.id)
                        );
                      }}
                    />
                  </TdCheckbox>
                  <Td>
                    <span className="font-bold text-ink">{game.name}</span>
                  </Td>
                  <Td>
                    <AdminStatusBadge status={game.status} />
                  </Td>
                  <Td>
                    <code className="rounded-md bg-ink/5 px-2 py-1 text-xs text-ink/70">{game.slug}</code>
                  </Td>
                  <Td>{formatDate(game.createdAt)}</Td>
                  <Td>{formatDate(game.updatedAt)}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      <Link className="button-secondary min-h-9 px-3 py-1.5" href={`/admin/games/${game.id}`}>
                        <Pencil size={16} aria-hidden="true" />
                        Editar
                      </Link>
                      <DeleteGameButton
                        id={game.id}
                        returnTo={returnTo}
                        published={game.status === GameStatus.published}
                        compact
                      />
                      {game.status === GameStatus.published ? (
                        <Link className="button-secondary min-h-9 px-3 py-1.5" href={`/juegos/${game.slug}`}>
                          <ExternalLink size={16} aria-hidden="true" />
                          Pública
                        </Link>
                      ) : null}
                    </div>
                  </Td>
                </tr>
              );
            })}
            {!sortedGames.length ? (
              <tr>
                <td className="px-4 py-10 text-center text-ink/60" colSpan={7}>
                  {hasFilter ? "No hay juegos que coincidan con esa búsqueda." : "Todavía no hay juegos."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {sortedGames.length ? (
        <div className="flex flex-col gap-3 border-t border-ink/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-ink/60">
            Mostrando {Math.min((safePage - 1) * PAGE_SIZE + 1, sortedGames.length)}-
            {Math.min(safePage * PAGE_SIZE, sortedGames.length)} de {sortedGames.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              className="button-secondary min-h-9 px-3 py-1.5"
              type="button"
              disabled={safePage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Anterior
            </button>
            <span className="min-w-20 rounded-md border border-ink/10 bg-ink/5 px-3 py-1.5 text-center text-sm font-semibold text-ink/70">
              {safePage} / {totalPages}
            </span>
            <button
              className="button-secondary min-h-9 px-3 py-1.5"
              type="button"
              disabled={safePage === totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Siguiente
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase">{children}</th>;
}

function SortableTh({
  label,
  sortKey,
  sortConfig,
  setSortConfig
}: {
  label: string;
  sortKey: SortKey;
  sortConfig: { key: SortKey; direction: SortDirection };
  setSortConfig: React.Dispatch<React.SetStateAction<{ key: SortKey; direction: SortDirection }>>;
}) {
  const active = sortConfig.key === sortKey;

  return (
    <th
      className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase"
      aria-sort={
        active ? (sortConfig.direction === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        className="inline-flex items-center gap-1 text-left transition hover:text-amber-200"
        type="button"
        onClick={() => {
          setSortConfig((current) => ({
            key: sortKey,
            direction: current.key === sortKey && current.direction === "asc" ? "desc" : "asc"
          }));
        }}
      >
        <span>{label}</span>
        {active ? (
          sortConfig.direction === "asc" ? (
            <ArrowUp size={12} aria-hidden="true" />
          ) : (
            <ArrowDown size={12} aria-hidden="true" />
          )
        ) : (
          <ArrowUpDown size={12} aria-hidden="true" className="opacity-70" />
        )}
      </button>
    </th>
  );
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

function FilterChip({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-moss px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white"
          : "rounded-full border border-ink/10 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink/60 transition hover:border-moss/30 hover:text-ink"
      }
    >
      {children}
    </button>
  );
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date instanceof Date ? date : new Date(date));
}

function compareGameValues(left: AdminGameRow[SortKey], right: AdminGameRow[SortKey], sortKey: SortKey) {
  if (sortKey === "createdAt" || sortKey === "updatedAt") {
    return toTimestamp(left) - toTimestamp(right);
  }

  return String(left).localeCompare(String(right), "es", { sensitivity: "base" });
}

function toTimestamp(value: Date | string) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function statusLabel(status: GameStatus) {
  return {
    draft: "borrador",
    review: "revisión",
    published: "publicado",
    archived: "archivado"
  }[status];
}
