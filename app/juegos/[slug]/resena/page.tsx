import { notFound } from "next/navigation";
import { CreateReviewForm } from "@/components/reviews/CreateReviewForm";
import { PublicShell } from "@/components/PublicShell";
import { getGameBySlug } from "@/lib/catalog";

type CreateReviewPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CreateReviewPage({ params }: CreateReviewPageProps) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);

  if (!game) {
    notFound();
  }

  return (
    <PublicShell>
      <main className="container-page py-10 lg:py-16">
        <CreateReviewForm gameId={game.id} gameSlug={game.slug} gameTitle={game.title} />
      </main>
    </PublicShell>
  );
}
