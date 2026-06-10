import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AdminDatabaseNotice } from "@/components/AdminDatabaseNotice";
import { AdminBggEnrichment } from "@/components/AdminBggEnrichment";
import { AdminFinalGameForm } from "@/components/AdminFinalGameForm";
import { SectionHeader } from "@/components/SectionHeader";
import { getAdminDatabaseError } from "@/lib/adminDatabaseError";
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
        <AdminBggEnrichment
          gameId={game.id}
          gameTitle={game.title || game.name}
          currentBgg={{
            bggId: game.bggId,
            bggUrl: game.bggUrl,
            bggLastSyncedAt: game.bggLastSyncedAt?.toISOString() || null
          }}
        />
        <AdminFinalGameForm game={game} mediaAssets={game.mediaAssets} />
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
