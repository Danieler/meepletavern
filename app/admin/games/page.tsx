import { GameStatus } from "@prisma/client";
import { FilePlus2 } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminDatabaseNotice } from "@/components/AdminDatabaseNotice";
import { AdminGamesTable } from "@/components/AdminGamesTable";
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
        <form action={createManualGameAction}>
          <button className="button-secondary w-full sm:w-auto" type="submit">
            <FilePlus2 size={18} aria-hidden="true" />
            Nuevo juego manual
          </button>
        </form>
      </div>

      {databaseError ? (
        <AdminDatabaseNotice error={databaseError} />
      ) : (
        <AdminGamesTable games={games} returnTo="/admin/games" />
      )}
    </div>
  );
}

async function createManualGameAction() {
  "use server";

  const game = await createManualGameDraft();
  redirect(`/admin/games/${game.id}`);
}
