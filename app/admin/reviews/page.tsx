import { AdminDatabaseNotice } from "@/components/AdminDatabaseNotice";
import { AdminReviewsTable } from "@/components/AdminReviewsTable";
import { SectionHeader } from "@/components/SectionHeader";
import { getAdminDatabaseError } from "@/lib/adminDatabaseError";
import { getAdminReviews } from "@/lib/reviews";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  try {
    const reviews = await getAdminReviews();

    return (
      <div>
        <SectionHeader
          title="Admin de reseñas"
          description="Aquí solo aparecen reseñas creadas de verdad, tanto por usuarios como por admin."
        />
        <div className="mb-6">
          <Link className="button-secondary" href="/admin/reviews/new">
            Crear reseña
          </Link>
        </div>
        <AdminReviewsTable
          reviews={reviews.map((review) => ({
            id: review.id,
            title: review.title,
            slug: review.slug,
            authorName: review.authorName,
            createdByAdmin: review.createdByAdmin,
            createdAt: review.createdAt.toISOString(),
            game: {
              id: review.game.id,
              title: review.game.title || review.game.name,
              slug: review.game.slug
            }
          }))}
          returnTo="/admin/reviews"
        />
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
