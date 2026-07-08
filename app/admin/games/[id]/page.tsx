import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, SquarePen } from "lucide-react";
import { AdminDatabaseNotice } from "@/components/AdminDatabaseNotice";
import { AdminFinalGameForm } from "@/components/AdminFinalGameForm";
import { SectionHeader } from "@/components/SectionHeader";
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
        <Link className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-moss" href="/admin/games">
          <ChevronLeft size={16} aria-hidden="true" />
          Volver a juegos
        </Link>
        <SectionHeader
          title={`Editor final: ${game.title || game.name}`}
          description="Guarda borradores y publica solo cuando la validación editorial esté completa."
        />
        <div className="mb-6">
          <Link className="button-secondary" href={`/admin/reviews/new?gameId=${game.id}`}>
            <SquarePen size={18} aria-hidden="true" />
            Crear reseña de este juego
          </Link>
        </div>
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
