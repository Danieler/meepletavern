import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AdminReviewFormNotice } from "@/components/AdminReviewFormNotice";
import { EditAdminReviewForm } from "@/components/AdminReviewForm";
import { SectionHeader } from "@/components/SectionHeader";
import { getAdminGames } from "@/lib/games";
import { getAdminReviewById } from "@/lib/reviews";

export const dynamic = "force-dynamic";

type AdminReviewEditorPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminReviewEditorPage({ params }: AdminReviewEditorPageProps) {
  const { id } = await params;
  const [review, games] = await Promise.all([getAdminReviewById(id), getAdminGames()]);

  if (!review) {
    notFound();
  }

  const gameOptions = games.map((game) => ({
    id: game.id,
    title: game.title || game.name
  }));

  return (
    <div className="space-y-6">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-moss" href="/admin/reviews">
        <ChevronLeft size={16} aria-hidden="true" />
        Volver a reseñas
      </Link>
      <SectionHeader
        title={`Editar reseña: ${review.title}`}
        description={`Juego asociado: ${review.game.title || review.game.name}`}
      />
      {!gameOptions.length ? (
        <AdminReviewFormNotice />
      ) : (
        <EditAdminReviewForm
          gameOptions={gameOptions}
          initialValue={{
            id: review.id,
            gameId: review.gameId,
            authorName: review.authorName,
            title: review.title,
            summary: review.summary,
            body: review.body
          }}
        />
      )}
    </div>
  );
}
