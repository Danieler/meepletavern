"use client";

import { GameStatus } from "@prisma/client";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
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

export function AdminGamesTable({
  games,
  returnTo
}: {
  games: AdminGameRow[];
  returnTo: string;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => games.some((game) => game.id === id)));
  }, [games]);

  const selectedGames = games.filter((game) => selectedIds.includes(game.id));
  const allSelected = games.length > 0 && selectedIds.length === games.length;
  const hasPublishedSelected = selectedGames.some((game) => game.status === GameStatus.published);

  return (
    <div className="overflow-hidden rounded-md border border-ink/10 bg-white shadow-soft">
      <div className="flex flex-col gap-3 border-b border-ink/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-ink/60">
          {selectedIds.length ? `${selectedIds.length} seleccionados` : "Selecciona juegos para borrarlos en bloque."}
        </p>
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
                    setSelectedIds(event.target.checked ? games.map((game) => game.id) : []);
                  }}
                />
              </ThCheckbox>
              <Th>Nombre</Th>
              <Th>Estado</Th>
              <Th>Slug</Th>
              <Th>Creado</Th>
              <Th>Actualizado</Th>
              <Th>Acciones</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {games.map((game) => {
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
            {!games.length ? (
              <tr>
                <td className="px-4 py-10 text-center text-ink/60" colSpan={7}>
                  Todavía no hay juegos.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
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
