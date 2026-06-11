import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AdminReviewFormNotice } from "@/components/AdminReviewFormNotice";
import { CreateAdminReviewForm } from "@/components/AdminReviewForm";
import { SectionHeader } from "@/components/SectionHeader";
import { getAdminGames } from "@/lib/games";

export const dynamic = "force-dynamic";

type AdminNewReviewPageProps = {
  searchParams: Promise<{
    gameId?: string;
  }>;
};

export default async function AdminNewReviewPage({ searchParams }: AdminNewReviewPageProps) {
  const { gameId = "" } = await searchParams;
  const games = await getAdminGames();
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
        title="Nueva reseña"
        description="Crea una reseña real asociada a un juego. No se generará nada automáticamente."
      />
      {!gameOptions.length ? (
        <AdminReviewFormNotice />
      ) : (
        <CreateAdminReviewForm
          gameOptions={gameOptions}
          initialValue={{
            gameId,
            authorName: "Admin MeepleTavern",
            title: "",
            summary: "",
            body: ""
          }}
        />
      )}
    </div>
  );
}
