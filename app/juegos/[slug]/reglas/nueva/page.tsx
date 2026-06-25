import { notFound } from "next/navigation";
import { CreateRuleQuestionForm } from "@/components/rules/CreateRuleQuestionForm";
import { PublicShell } from "@/components/PublicShell";
import { getGameBySlug } from "@/lib/catalog";

type CreateRuleQuestionPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CreateRuleQuestionPage({ params }: CreateRuleQuestionPageProps) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);

  if (!game) {
    notFound();
  }

  return (
    <PublicShell>
      <main className="container-page py-10 lg:py-16 max-w-3xl">
        <CreateRuleQuestionForm 
          gameId={game.id} 
          gameSlug={game.slug} 
          gameTitle={game.title} 
        />
      </main>
    </PublicShell>
  );
}
