"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { ReviewCard } from "@/components/ReviewCard";
import type { Review } from "@/lib/catalog";

type ReviewFilter = "all" | "rating";
type ReviewSort = "recent" | "rating" | "alphabetical";

const FILTERS: Array<{ value: ReviewFilter; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "rating", label: "Nota del juego: 8+" }
];

const SORT_OPTIONS: Array<{ value: ReviewSort; label: string }> = [
  { value: "recent", label: "Más recientes" },
  { value: "rating", label: "Mayor nota del juego" },
  { value: "alphabetical", label: "Título A–Z" }
];

export function ReviewsExplorer({ reviews }: { reviews: Review[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [sort, setSort] = useState<ReviewSort>("recent");

  const visibleReviews = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query.trim());
    const matches = reviews
      .filter((review) => {
        const matchesQuery =
          !normalizedQuery ||
          [review.title, review.gameTitle, review.summary]
            .map(normalizeSearchText)
            .some((value) => value.includes(normalizedQuery));
        const matchesFilter =
          filter === "all" ||
          (filter === "rating" && review.rating >= 8);

        return matchesQuery && matchesFilter;
      });

    matches.sort((left, right) => {
      if (sort === "rating") {
        return (
          right.rating - left.rating ||
          getPublishedTimestamp(right) - getPublishedTimestamp(left) ||
          left.title.localeCompare(right.title, "es")
        );
      }

      if (sort === "alphabetical") {
        return left.title.localeCompare(right.title, "es");
      }

      return (
        getPublishedTimestamp(right) - getPublishedTimestamp(left) ||
        left.title.localeCompare(right.title, "es")
      );
    });

    return matches;
  }, [filter, query, reviews, sort]);

  const hasActiveControls = query.trim().length > 0 || filter !== "all" || sort !== "recent";

  function resetControls() {
    setQuery("");
    setFilter("all");
    setSort("recent");
  }

  return (
    <div className="min-w-0">
      <div className="rounded-xl border border-walnut/20 bg-white p-4 shadow-soft sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <label htmlFor="reviews-search" className="field-label">
              Buscar en las reseñas
            </label>
            <div className="relative mt-2">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-walnut/50"
                aria-hidden="true"
              />
              <input
                id="reviews-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Busca por título, juego o resumen"
                autoComplete="off"
                enterKeyHint="search"
                aria-controls="reviews-results"
                className="min-h-12 w-full rounded-lg border border-walnut/20 bg-[#fffaf0] py-2.5 pl-11 pr-4 text-base font-semibold text-ink shadow-sm transition placeholder:text-walnut/50 hover:border-walnut/40 focus-visible:border-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/25"
              />
            </div>
          </div>

          <div className="min-w-0 sm:min-w-[230px]">
            <label htmlFor="reviews-sort" className="field-label">
              Ordenar por
            </label>
            <select
              id="reviews-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as ReviewSort)}
              aria-controls="reviews-results"
              className="mt-2 min-h-12 w-full rounded-lg border border-walnut/20 bg-[#fffaf0] px-3 py-2.5 text-base font-extrabold text-wood shadow-sm transition hover:border-walnut/40 focus-visible:border-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/25"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4 border-t border-walnut/10 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-walnut/60">
              <SlidersHorizontal className="h-4 w-4 text-ember" aria-hidden="true" />
              Filtrar
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar reseñas">
              {FILTERS.map((option) => {
                const active = filter === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFilter(option.value)}
                    aria-pressed={active}
                    aria-controls="reviews-results"
                    className={`inline-flex min-h-11 items-center justify-center rounded-full border px-4 py-2 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 ${
                      active
                        ? "border-ember bg-ember text-white shadow-sm"
                        : "border-walnut/20 bg-[#fffaf0] text-walnut hover:border-ember/40 hover:bg-ember/10 hover:text-ember"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={resetControls}
            disabled={!hasActiveControls}
            className="inline-flex min-h-11 items-center justify-center self-start rounded-lg border border-walnut/20 bg-white px-4 py-2 text-sm font-extrabold text-walnut transition hover:border-ember/40 hover:text-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 lg:self-end"
          >
            Restablecer
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p id="reviews-results-count" role="status" aria-live="polite" className="text-sm font-extrabold text-walnut/70">
          {formatReviewCount(visibleReviews.length)}
        </p>
      </div>

      {visibleReviews.length > 0 ? (
        <div
          id="reviews-results"
          aria-labelledby="reviews-results-count"
          className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          {visibleReviews.map((review) => (
            <ReviewCard key={review.slug} review={review} compact />
          ))}
        </div>
      ) : (
        <div id="reviews-results" className="mt-4 rounded-xl border border-dashed border-walnut/20 bg-white/70 px-5 py-10 text-center">
          <h3 className="font-display text-2xl font-bold text-wood">No encontramos reseñas</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-walnut/70">
            Prueba con otro juego o título, cambia el filtro o vuelve a ver el archivo completo.
          </p>
          {hasActiveControls ? (
            <button
              type="button"
              onClick={resetControls}
              className="button-secondary mt-5 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2"
            >
              Ver todas las reseñas
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function getPublishedTimestamp(review: Review) {
  const timestamp = new Date(review.publishedAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-ES");
}

function formatReviewCount(count: number) {
  return `${new Intl.NumberFormat("es-ES").format(count)} ${count === 1 ? "reseña" : "reseñas"}`;
}
