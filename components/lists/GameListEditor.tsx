"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2
} from "lucide-react";
import { GameSuggestionForm } from "@/components/GameSuggestionForm";
import { ListGameThumbnail } from "@/components/lists/ListGameThumbnail";
import type { GameSearchResult, OwnerGameListPage } from "@/lib/gameLists";

const SEARCH_MIN_LENGTH = 3;

export function GameListEditor({
  initialPage,
  username
}: {
  initialPage: OwnerGameListPage;
  username: string | null;
}) {
  const router = useRouter();
  const [page, setPage] = useState(initialPage);
  const [name, setName] = useState(initialPage.list.name);
  const [description, setDescription] = useState(initialPage.list.description || "");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">(initialPage.list.visibility);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GameSearchResult[]>([]);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [searchError, setSearchError] = useState("");
  const [addingGameId, setAddingGameId] = useState<string | null>(null);
  const [removingGameId, setRemovingGameId] = useState<string | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);
  const [pageLoading, setPageLoading] = useState(false);

  useEffect(() => {
    const search = query.trim().replace(/\s+/g, " ");
    setShowSuggestion(false);
    if (search.length < SEARCH_MIN_LENGTH) {
      setResults([]);
      setSearchState("idle");
      setSearchError("");
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setSearchState("loading");
      setSearchError("");
      try {
        const response = await fetch(`/api/account/lists/game-search?q=${encodeURIComponent(search)}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const payload = (await response.json().catch(() => null)) as { games?: GameSearchResult[]; error?: string } | null;
        if (!response.ok || !payload?.games) throw new Error(payload?.error || "No se pudo buscar el juego.");
        setResults(payload.games);
        setSearchState("done");
      } catch (error) {
        if (controller.signal.aborted) return;
        setResults([]);
        setSearchState("error");
        setSearchError(error instanceof Error ? error.message : "No se pudo buscar el juego.");
      }
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);

  const saveList = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/account/lists/${encodeURIComponent(page.list.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, visibility })
      });
      const payload = (await response.json().catch(() => null)) as {
        list?: OwnerGameListPage["list"];
        error?: string;
      } | null;
      if (!response.ok || !payload?.list) throw new Error(payload?.error || "No se pudo guardar la lista.");

      const previousSlug = page.list.slug;
      setPage((current) => ({ ...current, list: { ...payload.list!, gameCount: current.list.gameCount } }));
      setName(payload.list.name);
      setDescription(payload.list.description || "");
      setVisibility(payload.list.visibility);
      setFeedback({ kind: "success", message: "Lista guardada." });
      if (payload.list.slug !== previousSlug) {
        router.replace(`/mi-perfil/listas/${encodeURIComponent(payload.list.slug)}`);
      }
      router.refresh();
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "No se pudo guardar la lista." });
    } finally {
      setSaving(false);
    }
  };

  const deleteList = async () => {
    if (page.list.isDefault || deleting) return;
    if (!window.confirm(`¿Eliminar la lista “${page.list.name}”? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/account/lists/${encodeURIComponent(page.list.id)}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "No se pudo eliminar la lista.");
      router.push("/mi-perfil/listas");
      router.refresh();
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "No se pudo eliminar la lista." });
      setDeleting(false);
    }
  };

  const requestItemsPage = async (cursor: string | null) => {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    const response = await fetch(`/api/account/lists/${encodeURIComponent(page.list.id)}/items?${params.toString()}`, {
      cache: "no-store"
    });
    const payload = (await response.json().catch(() => null)) as OwnerGameListPage | { error?: string } | null;
    if (!response.ok || !payload || !("items" in payload)) {
      throw new Error(payload && "error" in payload ? payload.error : "No se pudo cargar la lista.");
    }
    return payload;
  };

  const refreshFirstPage = async () => {
    const nextPage = await requestItemsPage(null);
    setPage(nextPage);
    setCurrentCursor(null);
    setCursorHistory([]);
  };

  const addGame = async (gameId: string) => {
    if (addingGameId) return;
    setAddingGameId(gameId);
    setFeedback(null);

    try {
      const response = await fetch(`/api/account/lists/${encodeURIComponent(page.list.id)}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "No se pudo añadir el juego.");
      await refreshFirstPage();
      setFeedback({ kind: "success", message: "Juego añadido a la lista." });
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "No se pudo añadir el juego." });
    } finally {
      setAddingGameId(null);
    }
  };

  const removeGame = async (gameId: string) => {
    if (removingGameId) return;
    setRemovingGameId(gameId);
    setFeedback(null);

    try {
      const response = await fetch(`/api/account/lists/${encodeURIComponent(page.list.id)}/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "No se pudo quitar el juego.");
      setPage((current) => ({
        ...current,
        list: { ...current.list, gameCount: Math.max(0, current.list.gameCount - 1) },
        items: current.items.filter((item) => item.gameId !== gameId)
      }));
      setFeedback({ kind: "success", message: "Juego eliminado de la lista." });
      router.refresh();
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "No se pudo quitar el juego." });
    } finally {
      setRemovingGameId(null);
    }
  };

  const showNextPage = async () => {
    if (!page.nextCursor || pageLoading) return;
    const nextCursor = page.nextCursor;
    setPageLoading(true);
    try {
      const nextPage = await requestItemsPage(nextCursor);
      setCursorHistory((current) => [...current, currentCursor]);
      setCurrentCursor(nextCursor);
      setPage(nextPage);
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "No se pudo cargar la página." });
    } finally {
      setPageLoading(false);
    }
  };

  const showPreviousPage = async () => {
    if (!cursorHistory.length || pageLoading) return;
    const previousCursor = cursorHistory[cursorHistory.length - 1] || null;
    setPageLoading(true);
    try {
      const previousPage = await requestItemsPage(previousCursor);
      setCursorHistory((current) => current.slice(0, -1));
      setCurrentCursor(previousCursor);
      setPage(previousPage);
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "No se pudo cargar la página." });
    } finally {
      setPageLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="tavern-eyebrow">Mis listas</p>
          <h1 className="font-display mt-2 text-4xl font-bold text-wood">{page.list.name}</h1>
          <p className="mt-2 text-sm font-semibold text-walnut/60">
            {page.list.gameCount} {page.list.gameCount === 1 ? "juego" : "juegos"} · {page.list.visibility === "PUBLIC" ? "Pública" : "Privada"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {page.list.visibility === "PUBLIC" && username ? (
            <Link href={`/u/${encodeURIComponent(username)}/listas/${encodeURIComponent(page.list.slug)}`} className="button-secondary">
              <ExternalLink size={16} aria-hidden="true" />
              Ver pública
            </Link>
          ) : null}
          <Link href="/mi-perfil/listas" className="button-secondary">Volver a mis listas</Link>
        </div>
      </header>

      <section className="tavern-panel p-5 sm:p-6">
        <h2 className="font-display text-2xl font-bold text-wood">Editar lista</h2>
        <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={saveList}>
          <label>
            <span className="field-label">Nombre</span>
            <input
              required
              minLength={2}
              maxLength={60}
              value={name}
              disabled={page.list.isDefault}
              className="field-input mt-2 disabled:cursor-not-allowed disabled:bg-walnut/5"
              onChange={(event) => setName(event.target.value)}
            />
            {page.list.isDefault ? <span className="mt-1 block text-xs font-semibold text-walnut/45">La lista predeterminada conserva este nombre.</span> : null}
          </label>
          <label>
            <span className="field-label">Visibilidad</span>
            <select value={visibility} className="field-input mt-2" onChange={(event) => setVisibility(event.target.value as "PUBLIC" | "PRIVATE")}>
              <option value="PRIVATE">Privada</option>
              <option value="PUBLIC">Pública</option>
            </select>
          </label>
          <label className="md:col-span-2">
            <span className="field-label">Descripción opcional</span>
            <textarea rows={3} maxLength={300} value={description} className="field-input mt-2 resize-y" onChange={(event) => setDescription(event.target.value)} />
          </label>
          <div className="flex flex-wrap gap-3 md:col-span-2">
            <button type="submit" className="button-primary" disabled={saving}>
              {saving ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
            {!page.list.isDefault ? (
              <button type="button" className="button-danger" disabled={deleting} onClick={deleteList}>
                {deleting ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <Trash2 size={17} aria-hidden="true" />}
                {deleting ? "Eliminando..." : "Eliminar lista"}
              </button>
            ) : null}
          </div>
        </form>
        {feedback ? (
          <p className={`mt-4 text-sm font-semibold ${feedback.kind === "success" ? "text-moss" : "text-ruby"}`} role="status">
            {feedback.message}
          </p>
        ) : null}
      </section>

      <section className="tavern-panel p-5 sm:p-6" aria-labelledby="add-game-title">
        <p className="tavern-eyebrow">Añadir juego</p>
        <h2 id="add-game-title" className="font-display mt-2 text-2xl font-bold text-wood">Buscar juego</h2>
        <label className="relative mt-4 block">
          <span className="sr-only">Buscar un juego para la lista</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-walnut/40" size={18} aria-hidden="true" />
          <input
            type="search"
            value={query}
            maxLength={80}
            className="field-input pl-10"
            placeholder="Escribe al menos 3 caracteres..."
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        {searchState === "loading" ? (
          <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-walnut/55"><Loader2 size={16} className="animate-spin" />Buscando...</p>
        ) : null}
        {searchError ? <p className="mt-4 text-sm font-semibold text-ruby" role="status">{searchError}</p> : null}

        {results.length ? (
          <div className="mt-4 grid gap-2">
            {results.map((game) => (
              <div key={game.gameId} className="flex items-center gap-3 rounded-md border border-walnut/10 bg-white/70 p-3">
                <ListGameThumbnail {...game} size={52} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-wood">{game.title}</p>
                  <p className="mt-1 text-xs font-semibold text-walnut/50">{game.year || "Año pendiente"}</p>
                </div>
                <button type="button" className="button-secondary shrink-0 px-3" disabled={Boolean(addingGameId)} onClick={() => void addGame(game.gameId)}>
                  {addingGameId === game.gameId ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
                  Añadir
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {searchState === "done" && results.length === 0 ? (
          <div className="mt-4 rounded-md border border-ember/20 bg-ember/5 p-4">
            <p className="font-extrabold text-wood">No encontramos ese juego.</p>
            <p className="mt-1 text-sm font-semibold text-walnut/60">Puedes pedirnos que lo añadamos a MeepleTavern.</p>
            <button type="button" className="button-secondary mt-3" onClick={() => setShowSuggestion(true)}>Pedir que añadamos este juego</button>
          </div>
        ) : results.length ? (
          <button type="button" className="mt-4 text-sm font-extrabold text-ember hover:text-wood" onClick={() => setShowSuggestion((current) => !current)}>
            No lo encuentro
          </button>
        ) : null}

        {showSuggestion ? <div className="mt-5"><GameSuggestionForm key={query} initialName={query.trim()} embedded /></div> : null}
      </section>

      <section className="tavern-panel p-5 sm:p-6" aria-labelledby="list-games-title">
        <div className="flex items-end justify-between gap-3 border-b border-walnut/10 pb-4">
          <div>
            <p className="tavern-eyebrow">Contenido</p>
            <h2 id="list-games-title" className="font-display mt-2 text-2xl font-bold text-wood">Juegos en la lista</h2>
          </div>
          <span className="text-xs font-bold text-walnut/45">Página {cursorHistory.length + 1}</span>
        </div>

        {page.items.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {page.items.map((item) => (
              <article key={item.itemId} className="flex min-w-0 items-center gap-3 rounded-md border border-walnut/10 bg-white/70 p-3">
                <Link href={`/juegos/${item.slug}`} className="shrink-0"><ListGameThumbnail {...item} size={64} /></Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/juegos/${item.slug}`} className="line-clamp-2 text-sm font-extrabold text-wood hover:text-ember">{item.title}</Link>
                  <p className="mt-1 text-xs font-semibold text-walnut/50">{item.year || "Año pendiente"}</p>
                </div>
                <button
                  type="button"
                  className="button-secondary min-h-10 w-10 shrink-0 px-0"
                  aria-label={`Quitar ${item.title}`}
                  disabled={Boolean(removingGameId)}
                  onClick={() => void removeGame(item.gameId)}
                >
                  {removingGameId === item.gameId ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center">
            <p className="font-display text-2xl font-bold text-wood">Esta lista todavía está vacía</p>
            <p className="mt-2 text-sm font-semibold text-walnut/60">Busca un juego y añádelo.</p>
          </div>
        )}

        {cursorHistory.length || page.nextCursor ? (
          <nav className="mt-5 flex items-center justify-between gap-3 border-t border-walnut/10 pt-4" aria-label="Páginas de juegos de la lista">
            <button type="button" className="button-secondary px-3" disabled={!cursorHistory.length || pageLoading} onClick={() => void showPreviousPage()}>
              <ChevronLeft size={16} />Anterior
            </button>
            <span className="text-xs font-bold text-walnut/50">Página {cursorHistory.length + 1}</span>
            <button type="button" className="button-secondary px-3" disabled={!page.nextCursor || pageLoading} onClick={() => void showNextPage()}>
              Siguiente{pageLoading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
            </button>
          </nav>
        ) : null}
      </section>
    </div>
  );
}
