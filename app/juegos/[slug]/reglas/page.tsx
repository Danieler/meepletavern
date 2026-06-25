import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MessageCircleQuestion } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
import { getGameBySlug } from "@/lib/catalog";
import { getGameRuleQuestions } from "@/lib/rules";
import { UserAvatar } from "@/components/account/UserAvatar";

type ReglasPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: ReglasPageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlug(slug);

  if (!game) return { title: "No encontrado" };

  return {
    title: `Dudas de Reglas: ${game.title}`,
    description: `Resuelve tus dudas sobre el manual y las reglas de ${game.title} con la ayuda de la comunidad de MeepleTavern.`,
  };
}

export default async function ReglasPage({ params }: ReglasPageProps) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);

  if (!game) {
    notFound();
  }

  // Fetch all questions for this game (limit 100 for now as MVP)
  const questions = await getGameRuleQuestions(game.id, 100);

  return (
    <PublicShell>
      <main className="container-page py-10 lg:py-14">
        <Link 
          href={`/juegos/${game.slug}#reglas`}
          className="inline-flex items-center gap-1 text-sm font-bold text-walnut/70 hover:text-wood mb-6 transition-colors"
        >
          <ChevronLeft size={16} />
          Volver a {game.title}
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-10">
          <div>
            <h1 className="font-display text-3xl font-bold text-wood sm:text-4xl">
              Dudas de Reglas
            </h1>
            <p className="mt-2 text-lg text-walnut/80">
              Comunidad y resoluciones del manual de <strong className="text-wood">{game.title}</strong>
            </p>
          </div>
          <Link 
            href={`/juegos/${game.slug}/reglas/nueva`} 
            className="button-primary shrink-0"
          >
            Preguntar duda
          </Link>
        </div>

        {questions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-walnut/20 bg-white/40 p-12 text-center">
            <MessageCircleQuestion size={48} className="mx-auto text-walnut/30 mb-4" />
            <h3 className="text-xl font-bold text-wood">Sé el primero en preguntar</h3>
            <p className="mt-2 text-walnut/70 max-w-md mx-auto">
              Nadie ha reportado dudas de reglas para este juego todavía. Si hay algo del manual que no te cuadra, la taberna está aquí para ayudar.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {questions.map((question) => {
              const topAnswer = question.answers[0];
              return (
                <div key={question.id} className="rounded-xl border border-walnut/15 bg-white shadow-soft p-5 lg:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-bold text-lg text-wood">{question.title}</h3>
                    <span className="shrink-0 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                      {question._count.answers} respuestas
                    </span>
                  </div>
                  
                  <div className="mt-3 flex items-start gap-3">
                    <UserAvatar src={question.user.avatarUrl} name={question.user.username} size="sm" className="!h-8 !w-8 !rounded-full shrink-0" />
                    <div className="text-sm text-walnut/80">
                      <span className="font-bold text-wood mr-2">{question.user.username}</span>
                      <span className="text-walnut/50 mr-2">· {new Date(question.createdAt).toLocaleDateString()}</span>
                      <p className="mt-1">{question.body || "Sin descripción."}</p>
                    </div>
                  </div>

                  {topAnswer && (
                    <div className="mt-5 rounded-lg bg-amber-50/50 p-4 border border-amber-100">
                      <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-3">Mejor Respuesta</p>
                      <div className="flex items-start gap-3">
                        <UserAvatar src={topAnswer.user.avatarUrl} name={topAnswer.user.username} size="sm" className="!h-8 !w-8 !rounded-full shrink-0" />
                        <div className="text-sm text-wood">
                          <span className="font-bold text-wood mr-2">{topAnswer.user.username}</span>
                          {topAnswer.isAccepted && (
                            <span className="text-xs font-bold text-green-600 mr-2 uppercase">✔ Solución aceptada</span>
                          )}
                          <p className="mt-1">{topAnswer.body}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </PublicShell>
  );
}
