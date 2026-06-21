"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { type FormEvent, useState } from "react";
import type { TavernActivityFeed, TavernActivityFeedItem } from "@/lib/activity/feed";
import { TAVERN_SEARCH_MAX_LENGTH, TAVERN_SEARCH_MIN_LENGTH } from "@/lib/tavernSearch";

type TavernActivityFeedProps = {
  initialFeed: TavernActivityFeed;
};

export function TavernActivityFeed({ initialFeed }: TavernActivityFeedProps) {
  const [feed, setFeed] = useState(initialFeed);
  const [query, setQuery] = useState("");
  const [draftQuery, setDraftQuery] = useState("");
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);
  const [loadingAction, setLoadingAction] = useState<"search" | "next" | "previous" | null>(null);
  const [error, setError] = useState("");
  const loading = loadingAction !== null;
  const pageNumber = cursorHistory.length + 1;

  const requestPage = async (cursor: string | null, search: string) => {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (search) params.set("q", search);

    const response = await fetch(`/api/taberna/activity?${params.toString()}`);
    const payload = (await response.json().catch(() => null)) as TavernActivityFeed | { error?: string } | null;
    if (!response.ok || !payload || !("items" in payload)) {
      throw new Error(payload && "error" in payload ? payload.error : "No se pudo cargar la actividad.");
    }
    return payload;
  };

  const runSearch = async (search: string) => {
    if (loading) return;
    setLoadingAction("search");
    setError("");

    try {
      const nextFeed = await requestPage(null, search);
      setFeed(nextFeed);
      setQuery(search);
      setDraftQuery(search);
      setCurrentCursor(null);
      setCursorHistory([]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo buscar la actividad.");
    } finally {
      setLoadingAction(null);
    }
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runSearch(draftQuery.trim().replace(/\s+/g, " "));
  };

  const showNextPage = async () => {
    if (!feed.nextCursor || loading) return;
    const nextCursor = feed.nextCursor;
    setLoadingAction("next");
    setError("");

    try {
      const nextFeed = await requestPage(nextCursor, query);
      setCursorHistory((current) => [...current, currentCursor]);
      setCurrentCursor(nextCursor);
      setFeed(nextFeed);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cargar más actividad.");
    } finally {
      setLoadingAction(null);
    }
  };

  const showPreviousPage = async () => {
    if (!cursorHistory.length || loading) return;
    const previousCursor = cursorHistory[cursorHistory.length - 1] || null;
    setLoadingAction("previous");
    setError("");

    try {
      const previousFeed = await requestPage(previousCursor, query);
      setCursorHistory((current) => current.slice(0, -1));
      setCurrentCursor(previousCursor);
      setFeed(previousFeed);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cargar la actividad anterior.");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <section id="actividad" className="tavern-panel scroll-mt-24 p-5 sm:p-6" aria-labelledby="tavern-activity-title">
      <div className="border-b border-walnut/10 pb-4">
        <p className="tavern-eyebrow">Ahora mismo</p>
        <h2 id="tavern-activity-title" className="font-display mt-2 text-3xl font-bold text-wood">
          Última actividad en la taberna
        </h2>
        <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={submitSearch}>
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Buscar actividad por jugador o juego</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-walnut/40" size={17} aria-hidden="true" />
            <input
              type="search"
              value={draftQuery}
              minLength={TAVERN_SEARCH_MIN_LENGTH}
              maxLength={TAVERN_SEARCH_MAX_LENGTH}
              placeholder="Buscar jugador o juego..."
              className="field-input h-11 bg-white pl-10"
              onChange={(event) => setDraftQuery(event.target.value)}
            />
          </label>
          <button type="submit" className="button-secondary h-11" disabled={loading}>
            {loadingAction === "search" ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Search size={16} aria-hidden="true" />}
            Buscar
          </button>
          {query ? (
            <button type="button" className="button-secondary h-11" disabled={loading} onClick={() => void runSearch("")}>
              Limpiar
            </button>
          ) : null}
        </form>
        {query ? <p className="mt-3 text-xs font-semibold text-walnut/55">Resultados para “{query}”</p> : null}
      </div>

      {feed.items.length ? (
        <ol className="divide-y divide-walnut/10" aria-busy={loading}>
          {feed.items.map((item) => (
            <ActivityItem key={item.id} item={item} />
          ))}
        </ol>
      ) : (
        <div className="py-12 text-center">
          <p className="font-display text-2xl font-bold text-wood">
            {query ? "No encontramos esa actividad" : "La barra está tranquila"}
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-walnut/60">
            {query
              ? "Prueba con otro jugador o título de juego."
              : "La taberna acaba de abrir. Añade juegos a tu ludoteca para que aparezcan aquí."}
          </p>
        </div>
      )}

      {cursorHistory.length > 0 || feed.nextCursor ? (
        <nav className="flex items-center justify-between gap-3 border-t border-walnut/10 pt-4" aria-label="Páginas de actividad">
          <button type="button" className="button-secondary px-3" disabled={!cursorHistory.length || loading} onClick={showPreviousPage}>
            {loadingAction === "previous" ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <ChevronLeft size={16} aria-hidden="true" />}
            Anterior
          </button>
          <span className="text-xs font-bold text-walnut/50" aria-live="polite">Página {pageNumber}</span>
          <button type="button" className="button-secondary px-3" disabled={!feed.nextCursor || loading} onClick={showNextPage}>
            Siguiente
            {loadingAction === "next" ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
          </button>
        </nav>
      ) : null}

      {error ? <p className="mt-3 text-center text-sm font-semibold text-ruby" role="status">{error}</p> : null}
    </section>
  );
}

function ActivityItem({ item }: { item: TavernActivityFeedItem }) {
  const actorName = item.actorName || item.actorUsername || "Un tabernero";

  return (
    <li className="flex gap-3 py-4 first:pt-5">
      <ActorAvatar item={item} name={actorName} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-6 text-ink/75">
          <ActorLink item={item} name={actorName} /> <ActivitySentence item={item} />
        </p>
        <time className="mt-1 block text-xs font-bold text-walnut/40" dateTime={item.createdAt}>
          {formatActivityDate(item.createdAt)}
        </time>
      </div>
    </li>
  );
}

function ActorAvatar({ item, name }: { item: TavernActivityFeedItem; name: string }) {
  const avatar = (
    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-walnut/15 bg-parchment text-xs font-black text-walnut/35">
      {item.actorAvatarUrl ? (
        <Image src={item.actorAvatarUrl} alt="" fill sizes="40px" className="object-cover" />
      ) : (
        name[0]?.toUpperCase() || "T"
      )}
    </span>
  );

  return item.actorUsername ? (
    <Link href={`/u/${encodeURIComponent(item.actorUsername)}`} prefetch={false} aria-label={`Ver el perfil público de ${name}`}>
      {avatar}
    </Link>
  ) : (
    avatar
  );
}

function ActorLink({ item, name }: { item: TavernActivityFeedItem; name: string }) {
  return item.actorUsername ? (
    <Link href={`/u/${encodeURIComponent(item.actorUsername)}`} prefetch={false} className="font-black text-wood hover:text-ember">
      {name}
    </Link>
  ) : (
    <strong className="font-black text-wood">{name}</strong>
  );
}

function ActivitySentence({ item }: { item: TavernActivityFeedItem }) {
  const game = <GameLink item={item} />;

  switch (item.type) {
    case "COLLECTION_ADDED":
      return <>añadió {game} a su ludoteca</>;
    case "WANT_TO_PLAY":
      return <>quiere jugar {game}</>;
    case "PLAYED":
      return <>ha jugado {game}</>;
    case "RATED":
      return <>puntuó {game}{item.rating ? ` con un ${item.rating}` : ""}</>;
    case "COMMENTED":
      return <>comentó en {game}{item.commentSnippet ? `: “${item.commentSnippet}”` : ""}</>;
    case "GAME_TRENDING":
      return <>{game} está reuniendo mesa</>;
    case "WEEKLY_SUMMARY":
      return <>dejó un nuevo resumen de la semana</>;
    case "LIST_CREATED":
      return <>creó la lista <ListLink item={item} /></>;
    case "LIST_GAME_ADDED":
      return <>añadió {game} a <ListLink item={item} /></>;
  }
}

function GameLink({ item }: { item: TavernActivityFeedItem }) {
  const title = item.gameTitle || "un juego";
  return item.gameSlug ? (
    <Link href={`/juegos/${encodeURIComponent(item.gameSlug)}`} prefetch={false} className="font-black text-ink hover:text-ember">
      {title}
    </Link>
  ) : (
    <strong className="font-black text-ink">{title}</strong>
  );
}

function ListLink({ item }: { item: TavernActivityFeedItem }) {
  const title = item.listTitle || "una lista";
  return item.actorUsername && item.listSlug ? (
    <Link
      href={`/u/${encodeURIComponent(item.actorUsername)}/listas/${encodeURIComponent(item.listSlug)}`}
      prefetch={false}
      className="font-black text-ink hover:text-ember"
    >
      {title}
    </Link>
  ) : (
    <strong className="font-black text-ink">{title}</strong>
  );
}

function formatActivityDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Actividad reciente";
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid"
  }).format(date);
}
