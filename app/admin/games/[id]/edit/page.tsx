import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AdminDatabaseNotice } from "@/components/AdminDatabaseNotice";
import { AdminGameForm, type AdminGameFormValues } from "@/components/AdminGameForm";
import { SectionHeader } from "@/components/SectionHeader";
import { asFaqItems, asSourceItems } from "@/lib/content";
import { getAdminDatabaseError } from "@/lib/adminDatabaseError";
import { getAdminGameById } from "@/lib/games";

export const dynamic = "force-dynamic";

type EditGamePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditGamePage({ params }: EditGamePageProps) {
  const { id } = await params;
  let game: Awaited<ReturnType<typeof getAdminGameById>>;

  try {
    game = await getAdminGameById(id);
  } catch (error) {
    const databaseError = getAdminDatabaseError(error);

    if (!databaseError) {
      throw error;
    }

    return (
      <div>
        <Link className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-moss" href="/admin/games">
          <ChevronLeft size={16} aria-hidden="true" />
          Volver a juegos
        </Link>
        <AdminDatabaseNotice error={databaseError} />
      </div>
    );
  }

  if (!game) {
    notFound();
  }

  const initialGame: AdminGameFormValues = {
    id: game.id,
    name: game.name,
    slug: game.slug,
    status: game.status,
    imageUrl: game.imageUrl || "",
    description: game.description || "",
    review: game.review || "",
    shortSummary: game.shortSummary || "",
    pros: game.pros,
    cons: game.cons,
    bestFor: game.bestFor || "",
    notFor: game.notFor || "",
    minPlayers: game.minPlayers,
    maxPlayers: game.maxPlayers,
    playtime: game.playtime || "",
    age: game.age || "",
    complexity: game.complexity || "",
    categories: game.categories,
    mechanics: game.mechanics,
    similarGames: game.similarGames,
    faqs: asFaqItems(game.faqs),
    seoTitle: game.seoTitle || "",
    seoDescription: game.seoDescription || "",
    buyUrl: game.buyUrl || "",
    sources: asSourceItems(game.sources)
  };

  return (
    <div>
      <Link className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-moss" href="/admin/games">
        <ChevronLeft size={16} aria-hidden="true" />
        Volver a juegos
      </Link>
      <SectionHeader title={`Editar ${game.name}`} description="Revisa el contenido antes de publicarlo." />
      <AdminGameForm initialGame={initialGame} />
    </div>
  );
}
