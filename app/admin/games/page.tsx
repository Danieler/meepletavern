import { redirect } from "next/navigation";
import { AdminDatabaseNotice } from "@/components/AdminDatabaseNotice";
import { AdminGamesHeader } from "@/components/AdminGamesHeader";
import { AdminGamesTable } from "@/components/AdminGamesTable";
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
      <AdminGamesHeader createManualGameAction={createManualGameAction} />

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
