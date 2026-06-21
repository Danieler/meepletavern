"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2, UserRound } from "lucide-react";
import { useState } from "react";
import { UserAvatar } from "@/components/account/UserAvatar";
import type { PublicUserCard, PublicUserPage } from "@/lib/publicProfiles";

type PublicUserDirectoryProps = {
  initialPage: PublicUserPage;
  query: string;
};

export function PublicUserDirectory({ initialPage, query }: PublicUserDirectoryProps) {
  const [page, setPage] = useState(initialPage);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pageNumber = cursorHistory.length + 1;

  const requestPage = async (cursor: string | null) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (cursor) params.set("cursor", cursor);

    const response = await fetch(`/api/taberna/users?${params.toString()}`);
    const payload = (await response.json().catch(() => null)) as PublicUserPage | { error?: string } | null;
    if (!response.ok || !payload || !("items" in payload)) {
      throw new Error(payload && "error" in payload ? payload.error : "No se pudieron cargar los taberneros.");
    }
    return payload;
  };

  const showNextPage = async () => {
    if (!page.nextCursor || loading) return;
    const nextCursor = page.nextCursor;
    setLoading(true);
    setError("");

    try {
      const nextPage = await requestPage(nextCursor);
      setCursorHistory((current) => [...current, currentCursor]);
      setCurrentCursor(nextCursor);
      setPage(nextPage);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudieron cargar los taberneros.");
    } finally {
      setLoading(false);
    }
  };

  const showPreviousPage = async () => {
    if (!cursorHistory.length || loading) return;
    const previousCursor = cursorHistory[cursorHistory.length - 1] || null;
    setLoading(true);
    setError("");

    try {
      const previousPage = await requestPage(previousCursor);
      setCursorHistory((current) => current.slice(0, -1));
      setCurrentCursor(previousCursor);
      setPage(previousPage);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudieron cargar los taberneros.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section aria-labelledby="tavern-users-title">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="tavern-eyebrow">Rincones públicos</p>
          <h2 id="tavern-users-title" className="font-display mt-2 text-3xl font-bold text-wood">
            Taberneros
          </h2>
        </div>
        <span className="text-xs font-bold text-walnut/45" aria-live="polite">
          Página {pageNumber}
        </span>
      </div>

      {page.items.length === 0 ? (
        <div className="tavern-panel py-12 text-center">
          <UserRound className="mx-auto text-walnut/35" size={36} />
          <h3 className="font-display mt-4 text-2xl font-bold text-wood">No hay nadie en la barra</h3>
          <p className="mt-2 text-sm font-semibold text-walnut/60">
            {query ? "Prueba con otro nombre." : "Vuelve cuando se sienten más jugadores."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3" aria-busy={loading}>
          {page.items.map((user) => (
            <UserCard key={user.username} user={user} />
          ))}
        </div>
      )}

      {cursorHistory.length > 0 || page.nextCursor ? (
        <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Páginas de taberneros">
          <button
            type="button"
            className="button-secondary px-3"
            disabled={!cursorHistory.length || loading}
            onClick={showPreviousPage}
          >
            <ChevronLeft size={16} aria-hidden="true" />
            Anterior
          </button>
          <span className="text-xs font-bold text-walnut/50">Página {pageNumber}</span>
          <button
            type="button"
            className="button-secondary px-3"
            disabled={!page.nextCursor || loading}
            onClick={showNextPage}
          >
            {loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
            Siguiente
            {!loading ? <ChevronRight size={16} aria-hidden="true" /> : null}
          </button>
        </nav>
      ) : null}

      {error ? <p className="mt-3 text-center text-sm font-semibold text-ruby" role="status">{error}</p> : null}
    </section>
  );
}

function UserCard({ user }: { user: PublicUserCard }) {
  return (
    <article className="tavern-card overflow-hidden transition hover:-translate-y-0.5 hover:border-ember/45">
      <Link
        href={`/u/${encodeURIComponent(user.username)}`}
        prefetch={false}
        className="group flex min-h-24 items-center gap-3 p-4"
      >
        <UserAvatar src={user.avatarUrl} name={user.displayName} size="sm" />
        <div className="min-w-0 flex-1">
          <h3 className="font-display truncate text-xl font-bold leading-tight text-wood group-hover:text-ember">
            {user.displayName}
          </h3>
          <p className="mt-0.5 truncate text-xs font-extrabold text-walnut/50">@{user.username}</p>
          {user.stats ? (
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-walnut/60">
              <span><strong className="text-wood">{user.stats.owned}</strong> en casa</span>
              <span><strong className="text-wood">{user.stats.played}</strong> jugados</span>
              <span><strong className="text-wood">{user.stats.wantToPlay}</strong> por probar</span>
            </p>
          ) : (
            <p className="mt-2 text-xs font-bold text-walnut/50">Ludoteca privada</p>
          )}
        </div>
        <ChevronRight className="shrink-0 text-walnut/30 transition group-hover:translate-x-0.5 group-hover:text-ember" size={20} aria-hidden="true" />
      </Link>
    </article>
  );
}
