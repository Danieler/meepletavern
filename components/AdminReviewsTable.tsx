"use client";

import { GameStatus } from "@prisma/client";
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteGamesBulkAction } from "@/app/admin/games/[id]/actions";
import { DeleteGameButton } from "@/components/AdminDeleteButtons";

type AdminReviewRow = {
  id: string;
  name: string;
  shortSummary: string | null;
  review: string | null;
  status: GameStatus;
};

export function AdminReviewsTable({
  games,
  returnTo
}: {
  games: AdminReviewRow[];
  returnTo: string;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => games.some((game) => game.id === id)));
  }, [games]);

  const allSelected = games.length > 0 && selectedIds.length === games.length;
  const hasPublishedSelected = games.some(
    (game) => selectedIds.includes(game.id) && game.status === GameStatus.published
  );

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
          <thead className="bg-ink/5 text-xs uppercase text-ink/50">
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
              <th className="px-4 py-3">Juego</th>
              <th className="px-4 py-3">Resumen</th>
              <th className="px-4 py-3">Reseña</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {games.map((game) => {
              const checked = selectedIds.includes(game.id);

              return (
                <tr key={game.id}>
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
                  <td className="px-4 py-3 font-bold text-ink">{game.name}</td>
                  <td className="max-w-xs px-4 py-3 text-ink/65">{game.shortSummary || "Pendiente"}</td>
                  <td className="max-w-xs px-4 py-3 text-ink/65">{game.review || "Pendiente"}</td>
                  <td className="px-4 py-3 text-ink/65">{game.status}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link className="button-secondary min-h-9 px-3 py-1.5" href={`/admin/games/${game.id}/edit#contenido-editorial`}>
                        <Pencil size={16} aria-hidden="true" />
                        Editar
                      </Link>
                      <DeleteGameButton
                        id={game.id}
                        returnTo={returnTo}
                        published={game.status === GameStatus.published}
                        compact
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {!games.length ? (
              <tr>
                <td className="px-4 py-10 text-center text-ink/60" colSpan={6}>
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

function ThCheckbox({ children }: { children: React.ReactNode }) {
  return <th className="w-12 px-4 py-3">{children}</th>;
}

function TdCheckbox({ children }: { children: React.ReactNode }) {
  return <td className="w-12 px-4 py-3 text-ink/70">{children}</td>;
}
