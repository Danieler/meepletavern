import { AdminDatabaseNotice } from "@/components/AdminDatabaseNotice";
import { AdminReviewsTable } from "@/components/AdminReviewsTable";
import { SectionHeader } from "@/components/SectionHeader";
import { getAdminDatabaseError } from "@/lib/adminDatabaseError";
import { getAdminGames } from "@/lib/games";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  try {
    const games = await getAdminGames();

    return (
      <div>
        <SectionHeader
          title="Admin de reseñas"
          description="Revisa y corrige el resumen, la descripción, la reseña, pros y contras de cada juego."
        />
        <AdminReviewsTable games={games} returnTo="/admin/reviews" />
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
