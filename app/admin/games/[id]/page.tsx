import { notFound } from "next/navigation";
import { AdminDatabaseNotice } from "@/components/AdminDatabaseNotice";
import { AdminFinalGameForm } from "@/components/AdminFinalGameForm";
import { AdminGameEditorHeader } from "@/components/AdminGameEditorHeader";
import { getAdminDatabaseError } from "@/lib/adminDatabaseError";
import { getPendingGameImportProposal } from "@/lib/ai/gameWebAutofill";
import { gameRepository } from "@/lib/editorialRepositories";

export const dynamic = "force-dynamic";

type GameEditorPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function GameEditorPage({ params }: GameEditorPageProps) {
  const { id } = await params;

  try {
    const game = await gameRepository.getEditorById(id);

    if (!game) {
      notFound();
    }

    const pendingProposal = await getOptionalPendingGameImportProposal(id);

    return (
      <div>
        <AdminGameEditorHeader gameId={game.id} gameTitle={game.title || game.name} />
        <AdminFinalGameForm game={game} mediaAssets={game.mediaAssets} initialAiWebProposal={pendingProposal} />
      </div>
    );
  } catch (error) {
    const databaseError = getAdminDatabaseError(error);

    if (!databaseError) {
      throw error;
    }

    return <AdminDatabaseNotice error={databaseError} />;
  }
}

async function getOptionalPendingGameImportProposal(gameId: string) {
  try {
    return await getPendingGameImportProposal(gameId);
  } catch (error) {
    const databaseError = getAdminDatabaseError(error);

    if (databaseError) {
      console.warn("[admin-games] editor opened without pending AI proposal", {
        gameId,
        target: databaseError.target
      });
      return null;
    }

    throw error;
  }
}
