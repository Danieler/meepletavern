"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteReviewsBulkAction } from "@/app/admin/reviews/actions";

type AdminReviewRow = {
  id: string;
  title: string;
  slug: string;
  authorName: string;
  createdByAdmin: boolean;
  createdAt: string;
  game: {
    id: string;
    title: string;
    slug: string;
  };
};

export function AdminReviewsTable({
  reviews,
  returnTo
}: {
  reviews: AdminReviewRow[];
  returnTo: string;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => reviews.some((review) => review.id === id)));
  }, [reviews]);

  const allSelected = reviews.length > 0 && selectedIds.length === reviews.length;

  return (
    <div className="overflow-hidden rounded-md border border-ink/10 bg-white shadow-soft">
      <div className="flex flex-col gap-3 border-b border-ink/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-ink/60">
          {selectedIds.length
            ? `${selectedIds.length} seleccionadas`
            : "Solo se muestran reseñas creadas de verdad."}
        </p>
        <form
          action={deleteReviewsBulkAction}
          onSubmit={(event) => {
            if (!selectedIds.length) {
              event.preventDefault();
              return;
            }

            if (!window.confirm("¿Eliminar las reseñas seleccionadas?")) {
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
            Eliminar seleccionadas
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
                  aria-label="Seleccionar todas las reseñas"
                  checked={allSelected}
                  onChange={(event) => {
                    setSelectedIds(event.target.checked ? reviews.map((review) => review.id) : []);
                  }}
                />
              </ThCheckbox>
              <th className="px-4 py-3">Reseña</th>
              <th className="px-4 py-3">Juego</th>
              <th className="px-4 py-3">Autor</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Creada</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {reviews.map((review) => {
              const checked = selectedIds.includes(review.id);

              return (
                <tr key={review.id}>
                  <TdCheckbox>
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar ${review.title}`}
                      checked={checked}
                      onChange={(event) => {
                        setSelectedIds((current) =>
                          event.target.checked
                            ? [...current, review.id]
                            : current.filter((id) => id !== review.id)
                        );
                      }}
                    />
                  </TdCheckbox>
                  <td className="px-4 py-3">
                    <div className="font-bold text-ink">{review.title}</div>
                    <div className="text-xs text-ink/45">/{review.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-ink/70">
                    <Link className="font-semibold text-moss hover:text-ink" href={`/admin/games/${review.game.id}`}>
                      {review.game.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink/70">{review.authorName}</td>
                  <td className="px-4 py-3 text-ink/70">
                    {review.createdByAdmin ? "Admin" : "Usuario"}
                  </td>
                  <td className="px-4 py-3 text-ink/70">{formatDate(review.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link className="button-secondary min-h-9 px-3 py-1.5" href={`/admin/reviews/${review.id}`}>
                        <Pencil size={16} aria-hidden="true" />
                        Editar
                      </Link>
                      <form
                        action={deleteReviewsBulkAction}
                        onSubmit={(event) => {
                          if (!window.confirm("¿Eliminar esta reseña?")) {
                            event.preventDefault();
                          }
                        }}
                      >
                        <input type="hidden" name="ids" value={review.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <button className="button-danger min-h-9 px-3 py-1.5" type="submit">
                          <Trash2 size={16} aria-hidden="true" />
                          Eliminar
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!reviews.length ? (
              <tr>
                <td className="px-4 py-10 text-center text-ink/60" colSpan={6}>
                  <div className="flex flex-col items-center gap-3">
                    <p>Todavía no hay reseñas creadas.</p>
                    <Link className="button-secondary" href="/admin/games">
                      <Plus size={16} aria-hidden="true" />
                      Ir a juegos para crear una reseña
                    </Link>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function ThCheckbox({ children }: { children: React.ReactNode }) {
  return <th className="w-12 px-4 py-3">{children}</th>;
}

function TdCheckbox({ children }: { children: React.ReactNode }) {
  return <td className="w-12 px-4 py-3 text-ink/70">{children}</td>;
}
