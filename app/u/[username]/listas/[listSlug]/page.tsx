import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
import { ListGameThumbnail } from "@/components/lists/ListGameThumbnail";
import { GAME_LIST_ITEM_PAGE_SIZE, getPublicListDetail } from "@/lib/gameLists";

export const metadata: Metadata = { title: "Lista pública - MeepleTavern" };

export default async function PublicListPage({
  params,
  searchParams
}: {
  params: Promise<{ username: string; listSlug: string }>;
  searchParams?: Promise<{ cursor?: string }>;
}) {
  const [{ username, listSlug }, query] = await Promise.all([
    params,
    searchParams || Promise.resolve({} as { cursor?: string })
  ]);
  const rawCursor = query.cursor?.trim() || null;
  const cursor = rawCursor && rawCursor.length <= 64 && /^[a-zA-Z0-9_-]+$/.test(rawCursor) ? rawCursor : null;
  const page = await getPublicListDetail({ username, listSlug, cursor, limit: GAME_LIST_ITEM_PAGE_SIZE });
  if (!page) notFound();

  const nextUrl = page.nextCursor
    ? `/u/${encodeURIComponent(page.list.owner.username)}/listas/${encodeURIComponent(page.list.slug)}?cursor=${encodeURIComponent(page.nextCursor)}`
    : null;

  return (
    <PublicShell>
      <main>
        <section className="bg-wood text-white">
          <div className="container-page py-10 lg:py-14">
            <Link href={`/u/${encodeURIComponent(page.list.owner.username)}`} className="text-xs font-black uppercase tracking-[0.12em] text-ember hover:text-white">
              @{page.list.owner.username}
            </Link>
            <h1 className="font-display mt-3 text-4xl font-bold sm:text-5xl">{page.list.name}</h1>
            {page.list.description ? <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-parchment/75">{page.list.description}</p> : null}
            <p className="mt-4 text-sm font-bold text-parchment/60">
              Por {page.list.owner.displayName} · {page.list.gameCount} {page.list.gameCount === 1 ? "juego" : "juegos"}
            </p>
          </div>
        </section>

        <section className="container-page py-10 lg:py-14">
          {page.items.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {page.items.map((item) => (
                <article key={item.itemId} className="tavern-card flex min-w-0 items-center gap-3 p-3">
                  <Link href={`/juegos/${item.slug}`} prefetch={false} className="shrink-0"><ListGameThumbnail {...item} size={72} /></Link>
                  <div className="min-w-0">
                    <Link href={`/juegos/${item.slug}`} prefetch={false} className="line-clamp-2 text-sm font-extrabold leading-5 text-wood hover:text-ember">{item.title}</Link>
                    <p className="mt-2 text-xs font-semibold text-walnut/50">{item.year || "Año pendiente"}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="tavern-panel p-8 text-center">
              <h2 className="font-display text-3xl font-bold text-wood">Esta lista todavía está vacía</h2>
            </div>
          )}

          {nextUrl ? (
            <div className="mt-8 flex justify-center">
              <Link href={nextUrl} className="button-secondary">
                Siguiente página
                <ChevronRight size={16} aria-hidden="true" />
              </Link>
            </div>
          ) : null}
        </section>
      </main>
    </PublicShell>
  );
}
