"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2, Search, Star } from "lucide-react";
import { type FormEvent, useState } from "react";
import { UserAvatarFallbackArt } from "@/components/account/UserAvatar";
import type { TavernActivityFeed, TavernActivityFeedItem } from "@/lib/activity/feed";
import { TAVERN_SEARCH_MAX_LENGTH, TAVERN_SEARCH_MIN_LENGTH } from "@/lib/tavernSearch";

type TavernActivityFeedProps = {
  initialFeed: TavernActivityFeed;
};

type FilterType = "all" | "ratings" | "lists" | "games";

export function TavernActivityFeed({ initialFeed }: TavernActivityFeedProps) {
  const [feed, setFeed] = useState(initialFeed);
  const [query, setQuery] = useState("");
  const [draftQuery, setDraftQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);
  const [loadingAction, setLoadingAction] = useState<"search" | "next" | "previous" | "filter" | null>(null);
  const [error, setError] = useState("");
  const loading = loadingAction !== null;
  const pageNumber = cursorHistory.length + 1;

  const requestPage = async (cursor: string | null, search: string, type: string) => {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (search) params.set("q", search);
    if (type !== "all") params.set("type", type);

    const response = await fetch(`/api/taberna/activity?${params.toString()}`);
    const payload = (await response.json().catch(() => null)) as TavernActivityFeed | { error?: string } | null;
    if (!response.ok || !payload || !("items" in payload)) {
      throw new Error(payload && "error" in payload ? payload.error : "No se pudo cargar la actividad.");
    }
    return payload;
  };

  const runSearch = async (search: string, type: FilterType) => {
    if (loading) return;
    setLoadingAction(search !== query ? "search" : "filter");
    setError("");

    try {
      const nextFeed = await requestPage(null, search, type);
      setFeed(nextFeed);
      setQuery(search);
      setDraftQuery(search);
      setActiveFilter(type);
      setCurrentCursor(null);
      setCursorHistory([]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cargar la actividad.");
    } finally {
      setLoadingAction(null);
    }
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runSearch(draftQuery.trim().replace(/\s+/g, " "), activeFilter);
  };

  const showNextPage = async () => {
    if (!feed.nextCursor || loading) return;
    const nextCursor = feed.nextCursor;
    setLoadingAction("next");
    setError("");

    try {
      const nextFeed = await requestPage(nextCursor, query, activeFilter);
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
      const previousFeed = await requestPage(previousCursor, query, activeFilter);
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
    <section id="actividad" className="tavern-panel scroll-mt-24 p-4 sm:p-6" aria-labelledby="tavern-activity-title">
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
            <button type="button" className="button-secondary h-11" disabled={loading} onClick={() => void runSearch("", activeFilter)}>
              Limpiar
            </button>
          ) : null}
        </form>
        
        <div className="mt-4 flex flex-wrap gap-2">
          <FilterPill active={activeFilter === "all"} onClick={() => runSearch(query, "all")}>Todo</FilterPill>
          <FilterPill active={activeFilter === "ratings"} onClick={() => runSearch(query, "ratings")}>Valoraciones</FilterPill>
          <FilterPill active={activeFilter === "lists"} onClick={() => runSearch(query, "lists")}>Listas</FilterPill>
          <FilterPill active={activeFilter === "games"} onClick={() => runSearch(query, "games")}>Juegos</FilterPill>
        </div>

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

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] transition ${
        active
          ? "bg-ember text-white"
          : "bg-walnut/5 text-walnut/60 hover:bg-walnut/10 hover:text-walnut/80"
      }`}
    >
      {children}
    </button>
  );
}

function ActivityItem({ item }: { item: TavernActivityFeedItem }) {
  const actorName = item.actorUsername || "tabernero";

  return (
    <li className="flex gap-4 py-4 first:pt-5">
      <ActorAvatar item={item} name={actorName} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-6 text-ink/75">
          <ActorLink item={item} name={actorName} /> <ActivitySentence item={item} />
        </p>
        <time className="mt-1 block text-xs font-bold text-walnut/40" dateTime={item.createdAt}>
          {formatActivityDate(item.createdAt)}
        </time>
        
        <RichActivityPreview item={item} />
      </div>
      {item.gameCoverImageUrl && (
        <div className="hidden sm:block shrink-0 pt-1">
          <div className="relative h-16 w-12 overflow-hidden rounded-md border border-walnut/15 shadow-sm">
            <Image
              src={item.gameCoverImageUrl}
              alt=""
              fill
              sizes="48px"
              className="object-cover"
              unoptimized
            />
          </div>
        </div>
      )}
    </li>
  );
}

function RichActivityPreview({ item }: { item: TavernActivityFeedItem }) {
  if (item.type === "RATED" && item.rating !== null) {
    return (
      <div className="mt-2 flex items-center gap-0.5" aria-label={`Puntuación: ${item.rating} sobre 10`}>
        {[...Array(5)].map((_, i) => {
          const ratingValue = (i + 1) * 2;
          const isFilled = item.rating! >= ratingValue;
          const isHalf = !isFilled && item.rating! >= ratingValue - 1;
          return (
            <Star
              key={i}
              size={14}
              className={`${isFilled || isHalf ? "fill-amber-400 text-amber-400" : "text-walnut/20"} ${isHalf ? "opacity-60" : ""}`}
            />
          );
        })}
      </div>
    );
  }

  if (item.type === "COMMENTED" && item.commentSnippet) {
    return (
      <blockquote className="mt-2 border-l-2 border-ember/30 pl-3 text-sm font-medium italic text-walnut/70">
        “{item.commentSnippet}”
      </blockquote>
    );
  }

  return null;
}

function ActorAvatar({ item, name }: { item: TavernActivityFeedItem; name: string }) {
  const avatar = (
    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-walnut/15 bg-parchment text-xs font-black text-walnut/35">
      {item.actorAvatarUrl ? (
        <Image
          src={item.actorAvatarUrl}
          alt=""
          fill
          sizes="40px"
          className="object-cover"
          unoptimized
        />
      ) : (
        <UserAvatarFallbackArt seed={name} className="h-full w-full" />
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
      return <>puntuó {game}</>;
    case "COMMENTED":
      return <>comentó en {game}</>;
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
