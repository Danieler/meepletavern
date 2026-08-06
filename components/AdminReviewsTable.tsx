"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteReviewsBulkAction } from "@/app/admin/reviews/actions";
import { useAdminI18n } from "@/lib/adminI18n";

type AdminReviewRow = {
  id: string;
  title: string;
  slug: string;
  rating: number;
  authorName: string;
  createdByAdmin: boolean;
  isApproved: boolean;
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
  const { lang, t, tFormat } = useAdminI18n();
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
            ? tFormat("games.selectedCount", { count: selectedIds.length })
            : (lang === "en" ? "Only real created reviews are shown." : "Solo se muestran reseñas creadas de verdad.")}
        </p>
        <form
          action={deleteReviewsBulkAction}
          onSubmit={(event) => {
            if (!selectedIds.length) {
              event.preventDefault();
              return;
            }

            if (!window.confirm(t("games.confirmBulkDelete"))) {
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
            {t("games.deleteSelected")}
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
                  aria-label={t("games.selectAll")}
                  checked={allSelected}
                  onChange={(event) => {
                    setSelectedIds(event.target.checked ? reviews.map((review) => review.id) : []);
                  }}
                />
              </ThCheckbox>
              <th className="px-4 py-3">{t("reviews.title")}</th>
              <th className="px-4 py-3">{t("reviews.colGame")}</th>
              <th className="px-4 py-3">{t("reviews.colRating")}</th>
              <th className="px-4 py-3">{t("reviews.colAuthor")}</th>
              <th className="px-4 py-3">{lang === "en" ? "Type" : "Tipo"}</th>
              <th className="px-4 py-3">{t("games.colStatus")}</th>
              <th className="px-4 py-3">{t("reviews.colDate")}</th>
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
                      aria-label={tFormat("games.selectRow", { name: review.title })}
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
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-md border border-ember/20 bg-ember/10 px-2 py-1 text-xs font-black text-wood">
                      {formatRating(review.rating)}/10
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink/70">{review.authorName}</td>
                  <td className="px-4 py-3 text-ink/70">
                    {review.createdByAdmin ? "Admin" : (lang === "en" ? "User" : "Usuario")}
                  </td>
                  <td className="px-4 py-3">
                    {review.isApproved ? (
                      <span className="inline-flex items-center rounded-full bg-moss/10 px-2 py-1 text-xs font-semibold text-moss">
                        {t("status.approved")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-sun/20 px-2 py-1 text-xs font-semibold text-sun-dark">
                        {t("status.pending")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink/70">{formatDate(review.createdAt, lang)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link className="button-secondary min-h-9 px-3 py-1.5" href={`/admin/reviews/${review.id}`}>
                        <Pencil size={16} aria-hidden="true" />
                        {t("common.edit")}
                      </Link>
                      <form
                        action={deleteReviewsBulkAction}
                        onSubmit={(event) => {
                          if (!window.confirm(t("games.confirmBulkDelete"))) {
                            event.preventDefault();
                          }
                        }}
                      >
                        <input type="hidden" name="ids" value={review.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <button className="button-danger min-h-9 px-3 py-1.5" type="submit">
                          <Trash2 size={16} aria-hidden="true" />
                          {t("common.delete")}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!reviews.length ? (
              <tr>
                <td className="px-4 py-10 text-center text-ink/60" colSpan={9}>
                  <div className="flex flex-col items-center gap-3">
                    <p>{t("reviews.noReviews")}</p>
                    <Link className="button-secondary" href="/admin/games">
                      <Plus size={16} aria-hidden="true" />
                      {lang === "en" ? "Go to games to create a review" : "Ir a juegos para crear una reseña"}
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

function formatDate(value: string, lang: string = "es") {
  const locale = lang === "en" ? "en-US" : "es-ES";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function formatRating(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function ThCheckbox({ children }: { children: React.ReactNode }) {
  return <th className="w-12 px-4 py-3">{children}</th>;
}

function TdCheckbox({ children }: { children: React.ReactNode }) {
  return <td className="w-12 px-4 py-3 text-ink/70">{children}</td>;
}
