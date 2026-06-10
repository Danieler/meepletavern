import { GameStatus } from "@prisma/client";
import { ExternalLink, FilePlus2, Pencil, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminDatabaseNotice } from "@/components/AdminDatabaseNotice";
import { DeleteGameButton } from "@/components/AdminDeleteButtons";
import { AdminStatusBadge } from "@/components/AdminStatusBadge";
import { SectionHeader } from "@/components/SectionHeader";
import { getAdminDatabaseError } from "@/lib/adminDatabaseError";
import { createManualGameDraft, getAdminGames } from "@/lib/games";

export const dynamic = "force-dynamic";

export default async function AdminGamesPage() {
  let games: Awaited<ReturnType<typeof getAdminGames>> = [];
  let databaseError: ReturnType<typeof getAdminDatabaseError> = null;

  try {
    games = await getAdminGames();
  } catch (error) {
    databaseError = getAdminDatabaseError(error);

    if (!databaseError) {
      throw error;
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeader
          title="Juegos"
          description="Gestiona borradores, fichas publicadas y contenido archivado."
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <form action={createManualGameAction}>
            <button className="button-secondary w-full" type="submit">
              <FilePlus2 size={18} aria-hidden="true" />
              Nuevo juego manual
            </button>
          </form>
          <Link className="button-primary" href="/admin/games/new-ai">
            <Sparkles size={18} aria-hidden="true" />
            Crear con IA
          </Link>
        </div>
      </div>

      {databaseError ? (
        <AdminDatabaseNotice error={databaseError} />
      ) : (
      <div className="overflow-hidden rounded-md border border-ink/10 bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ink/10 text-left text-sm">
            <thead className="bg-ink text-white">
              <tr>
                <Th>Nombre</Th>
                <Th>Estado</Th>
                <Th>Slug</Th>
                <Th>IA</Th>
                <Th>Creado</Th>
                <Th>Actualizado</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {games.map((game) => (
                <tr key={game.id} className="align-top">
                  <Td>
                    <span className="font-bold text-ink">{game.name}</span>
                  </Td>
                  <Td>
                    <AdminStatusBadge status={game.status} />
                  </Td>
                  <Td>
                    <code className="rounded-md bg-ink/5 px-2 py-1 text-xs text-ink/70">{game.slug}</code>
                  </Td>
                  <Td>{game.createdByAi ? "Sí" : "No"}</Td>
                  <Td>{formatDate(game.createdAt)}</Td>
                  <Td>{formatDate(game.updatedAt)}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      <Link className="button-secondary min-h-9 px-3 py-1.5" href={`/admin/games/${game.id}`}>
                        <Pencil size={16} aria-hidden="true" />
                        Editar
                      </Link>
                      <DeleteGameButton
                        id={game.id}
                        returnTo="/admin/games"
                        published={game.status === GameStatus.published}
                        compact
                      />
                      {game.status === GameStatus.published ? (
                        <Link className="button-secondary min-h-9 px-3 py-1.5" href={`/juegos/${game.slug}`}>
                          <ExternalLink size={16} aria-hidden="true" />
                          Pública
                        </Link>
                      ) : null}
                    </div>
                  </Td>
                </tr>
              ))}
              {!games.length ? (
                <tr>
                  <td className="px-4 py-10 text-center text-ink/60" colSpan={7}>
                    Todavía no hay juegos.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}

async function createManualGameAction() {
  "use server";

  const game = await createManualGameDraft();
  redirect(`/admin/games/${game.id}`);
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-4 text-ink/70">{children}</td>;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
