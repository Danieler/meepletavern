"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Flame, Loader2, UserRound } from "lucide-react";
import { useState } from "react";
import { UserAvatar } from "@/components/account/UserAvatar";
import { ScrollCarousel } from "@/components/ui/ScrollCarousel";
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
    <section aria-labelledby="tavern-users-title" className="w-full">
      {/* Mobile view (< lg) - Stories slider */}
      <div className="lg:hidden mb-6">
        <div className="mb-3">
          <h3 className="font-display text-sm font-black uppercase tracking-[0.08em] text-wood">
            Taberneros en la barra
          </h3>
        </div>
        {page.items.length === 0 ? (
          <p className="text-xs font-semibold text-walnut/55">Nadie en la barra.</p>
        ) : (
          <ScrollCarousel
            containerClassName="-mx-4 sm:-mx-6 w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] max-w-[calc(100%+2rem)] sm:max-w-[calc(100%+3rem)]"
            listClassName="flex gap-4 px-4 sm:px-6 pb-2 scroll-px-4 sm:scroll-px-6"
          >
            {page.items.map((user) => {
              const handle = user.username.trim() || "tabernero";
              const isTopUser = user.stats && (user.stats.owned >= 25 || user.stats.played >= 25);
              
              // Determine the best micro-stat to display
              let statText = "Perfil";
              if (user.stats) {
                if (user.stats.owned > 0) {
                  statText = `${user.stats.owned} ${user.stats.owned === 1 ? "juego" : "juegos"}`;
                } else if (user.stats.played > 0) {
                  statText = `${user.stats.played} ${user.stats.played === 1 ? "jugado" : "jugados"}`;
                } else if (user.stats.wantToPlay > 0) {
                  statText = `${user.stats.wantToPlay} por probar`;
                } else {
                  statText = "Sin juegos";
                }
              } else {
                statText = "Privada";
              }

              return (
                <Link
                  key={user.username}
                  href={`/u/${encodeURIComponent(handle)}`}
                  prefetch={false}
                  className="flex flex-col items-center gap-1 shrink-0 snap-start text-center group"
                >
                  <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-hearth to-ember transition group-hover:scale-105 shadow-sm">
                    <UserAvatar
                      src={user.avatarUrl}
                      name={handle}
                      size="sm"
                      className="!rounded-full !h-14 !w-14"
                    />
                    {isTopUser && (
                      <span 
                        className="absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-ember text-white border border-white shadow-sm" 
                        title="Tabernero Top"
                      >
                        <Flame size={10} className="fill-white text-white" />
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-black text-walnut/70 truncate w-16 group-hover:text-ember tracking-wide mt-1">
                    @{handle}
                  </span>
                  <span className="text-[9px] font-bold text-walnut/45 truncate w-16 leading-tight">
                    {statText}
                  </span>
                </Link>
              );
            })}
          </ScrollCarousel>
        )}
      </div>

      {/* Desktop view (>= lg) - List and pagination */}
      <div className="hidden lg:block">
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
      </div>
    </section>
  );
}

function UserCard({ user }: { user: PublicUserCard }) {
  const handle = user.username.trim() || "tabernero";

  return (
    <article className="tavern-card overflow-hidden transition hover:-translate-y-0.5 hover:border-ember/45">
      <Link
        href={`/u/${encodeURIComponent(handle)}`}
        prefetch={false}
        className="group flex min-h-24 items-center gap-3 p-4"
      >
        <UserAvatar src={user.avatarUrl} name={handle} size="sm" />
        <div className="min-w-0 flex-1">
          <h3 className="font-display break-words text-xl font-bold leading-tight text-wood group-hover:text-ember flex items-center gap-2">
            @{handle}
            {user.stats && (user.stats.owned >= 25 || user.stats.played >= 25) && (
              <span className="flex items-center gap-1 rounded-full bg-ember/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-ember" title="Tabernero muy activo">
                <Flame size={12} />
                Top
              </span>
            )}
          </h3>
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
