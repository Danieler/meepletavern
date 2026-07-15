import Link from "next/link";
import { redirect } from "next/navigation";
import { Dices, LibraryBig, Search, UsersRound } from "lucide-react";
import { getTavernGroupLibraryPreviewForMember } from "@/lib/tavernGroups";
import { getTavernGroupSummaryForRsc, requireCurrentAppUserForRsc } from "@/lib/tavernRequestCache";

type Props = {
  params: Promise<{ tavernId: string }>;
  searchParams?: Promise<{ q?: string }>;
};

export default async function TavernLibraryPage({ params, searchParams }: Props) {
  let user: Awaited<ReturnType<typeof requireCurrentAppUserForRsc>>;
  const { tavernId } = await params;
  try {
    user = await requireCurrentAppUserForRsc();
  } catch {
    redirect(`/auth?mode=login&next=${encodeURIComponent(`/comunidad/tabernas/${tavernId}`)}`);
  }
  const q = (await searchParams)?.q || "";
  await getTavernGroupSummaryForRsc(user.id, tavernId);
  const games = await getTavernGroupLibraryPreviewForMember(tavernId, q);

  return (
    <section className="space-y-6">
      <div className="tavern-card grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
        <div>
          <p className="tavern-eyebrow">Colección compartida</p>
          <h2 className="font-display mt-2 text-3xl font-bold text-wood sm:text-4xl">Ludoteca de la taberna</h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-walnut/66">
            Se forma automáticamente con los juegos que los miembros tienen marcados como “En casa”.
          </p>
        </div>
        <form className="flex gap-2" action={`/comunidad/tabernas/${tavernId}`}>
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Buscar en la ludoteca</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-walnut/45" size={17} />
            <input name="q" defaultValue={q} className="field-input h-11 pl-10" placeholder="Buscar juego..." />
          </label>
          <button className="button-secondary" type="submit">Buscar</button>
        </form>
      </div>

      {games.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {games.map((game) => (
            <article key={game.gameId} className="tavern-card overflow-hidden">
              <Link href={`/juegos/${game.slug}`} className="block">
                <div className="aspect-[4/3] overflow-hidden bg-walnut/8">
                  {game.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={game.coverImageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-walnut/20"><LibraryBig size={44} /></div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-display line-clamp-2 text-xl font-bold text-wood">{game.title}</h3>
                </div>
              </Link>
              <div className="border-t border-walnut/10 p-4">
                <div className="grid grid-cols-2 gap-2">
                  <Metric icon={LibraryBig} value={game.copyCount} label={game.copyCount === 1 ? "copia" : "copias"} />
                  <Metric icon={Dices} value={game.playCount} label={game.playCount === 1 ? "partida" : "partidas"} />
                </div>
                <div className="mt-4 flex items-start gap-2 text-xs font-semibold leading-5 text-walnut/60">
                  <UsersRound size={15} className="mt-0.5 shrink-0" />
                  <span>{formatOwners(game.owners.map((owner) => owner.displayName))}</span>
                </div>
                <Link className="button-primary mt-4 w-full" prefetch={false} href={`/comunidad/tabernas/${tavernId}/partidas?gameId=${encodeURIComponent(game.gameId)}`}>
                  <Dices size={17} /> Registrar partida
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="tavern-card p-8 text-center">
          <LibraryBig className="mx-auto text-ember" size={36} />
          <h3 className="font-display mt-4 text-3xl font-bold text-wood">{q ? "No hay coincidencias" : "La estantería está vacía"}</h3>
          <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-walnut/65">
            {q ? "Prueba con otro título." : "Cuando algún miembro marque un juego como “En casa”, aparecerá aquí automáticamente."}
          </p>
          {!q ? <Link href="/juegos" className="button-primary mt-5">Explorar juegos</Link> : null}
        </div>
      )}
    </section>
  );
}

function Metric({ icon: Icon, value, label }: { icon: typeof LibraryBig; value: number; label: string }) {
  return (
    <span className="rounded-md border border-walnut/10 bg-vanilla/60 p-3 text-center">
      <Icon className="mx-auto text-ember" size={17} />
      <strong className="font-display mt-1 block text-2xl text-wood">{value}</strong>
      <small className="text-[10px] font-black uppercase tracking-wide text-walnut/45">{label}</small>
    </span>
  );
}

function formatOwners(names: string[]) {
  if (!names.length) return "Sin propietario actual";
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} y ${names.length - 2} más`;
}
