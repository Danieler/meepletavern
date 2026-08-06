import { AdminDatabaseNotice } from "@/components/AdminDatabaseNotice";
import { AdminReviewsHeader } from "@/components/AdminReviewsHeader";
import { AdminReviewsTable } from "@/components/AdminReviewsTable";
import { getAdminDatabaseError } from "@/lib/adminDatabaseError";
import { getEffectiveReviewRating } from "@/lib/reviewRating";
import { getAdminReviews } from "@/lib/reviews";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  try {
    const reviews = await getAdminReviews();

    return (
      <div>
        <AdminReviewsHeader />
        <AdminReviewsTable
          reviews={reviews.map((review) => ({
            id: review.id,
            title: review.title,
            slug: review.slug,
            rating: getEffectiveReviewRating(review.game.ratings, review.rating),
            authorName: review.authorName,
            createdByAdmin: review.createdByAdmin,
            isApproved: review.isApproved,
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
