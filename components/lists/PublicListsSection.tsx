import Link from "next/link";
import { ChevronRight, ListChecks } from "lucide-react";
import { ListGameThumbnail } from "@/components/lists/ListGameThumbnail";
import type { PublicGameListSummary } from "@/lib/gameLists";

export function PublicListsSection({
  username,
  displayName,
  lists,
  showAllLink = true
}: {
  username: string;
  displayName: string;
  lists: PublicGameListSummary[];
  showAllLink?: boolean;
}) {
  if (!lists.length) return null;

  return (
    <section className="container-page py-10 lg:py-14" aria-labelledby="public-lists-title">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="tavern-eyebrow">Listas públicas</p>
          <h2 id="public-lists-title" className="font-display mt-2 text-3xl font-bold text-wood">
            Selecciones de {displayName}
          </h2>
        </div>
        {showAllLink ? (
          <Link href={`/u/${encodeURIComponent(username)}/listas`} className="button-secondary">
            Ver todas
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {lists.map((list) => (
          <Link
            key={list.id}
            href={`/u/${encodeURIComponent(username)}/listas/${encodeURIComponent(list.slug)}`}
            className="tavern-card group flex min-h-44 flex-col p-5 transition hover:-translate-y-0.5 hover:border-ember/45"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-ember/10 text-ember">
                <ListChecks size={20} aria-hidden="true" />
              </span>
              <span className="text-xs font-black uppercase tracking-wide text-walnut/45">
                {list.gameCount} {list.gameCount === 1 ? "juego" : "juegos"}
              </span>
            </div>
            <h3 className="font-display mt-4 text-2xl font-bold text-wood group-hover:text-ember">{list.name}</h3>
            {list.description ? <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-walnut/60">{list.description}</p> : null}
            {list.previewGames.length ? (
              <div className="mt-auto flex gap-2 pt-4" aria-label="Vista previa de juegos">
                {list.previewGames.map((game) => (
                  <ListGameThumbnail key={game.gameId} {...game} size={46} />
                ))}
              </div>
            ) : (
              <p className="mt-auto pt-4 text-xs font-bold text-walnut/45">Lista todavía vacía</p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
