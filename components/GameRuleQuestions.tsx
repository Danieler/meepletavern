import Link from "next/link";
import { MessageCircleQuestion, ChevronRight, Scale } from "lucide-react";
import { UserAvatar } from "@/components/account/UserAvatar";
import { getGameRuleQuestions } from "@/lib/rules";

export async function GameRuleQuestions({ gameId, gameSlug }: { gameId: string; gameSlug: string }) {
  const questions = await getGameRuleQuestions(gameId, 3);
  
  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-walnut/20 bg-black/10 p-6 text-center">
        <Scale size={32} className="mx-auto text-walnut/40 mb-3" />
        <h3 className="text-lg font-bold text-wood">Aún no hay dudas de reglas</h3>
        <p className="mt-1 text-sm text-walnut/70">
          ¿Tienes alguna duda con el manual? Sé el primero en preguntar.
        </p>
        <Link 
          href={`/juegos/${gameSlug}/reglas/nueva`} 
          prefetch={false}
          className="button-secondary mt-4 inline-flex border-walnut/20 bg-white/5"
        >
          Preguntar una duda
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="divide-y divide-walnut/10 rounded-xl border border-walnut/15 bg-white/5 shadow-soft">
        {questions.map((question) => {
          const topAnswer = question.answers[0];
          
          return (
            <details key={question.id} className="group overflow-hidden">
              <summary className="flex cursor-pointer items-center justify-between p-4 hover:bg-white/5 transition-colors focus:outline-none">
                <div className="flex items-center gap-3">
                  <MessageCircleQuestion size={18} className="text-ember/70 shrink-0" />
                  <span className="font-medium text-wood">{question.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  {question._count.answers > 0 && (
                    <span className="text-xs font-bold text-amber-600 bg-amber-500/10 px-2 py-1 rounded-full">
                      {question._count.answers} resp.
                    </span>
                  )}
                  <ChevronRight size={18} className="text-walnut/40 transition-transform group-open:rotate-90" />
                </div>
              </summary>
              
              <div className="p-4 pt-2 pb-5 bg-black/20 text-sm">
                <div className="flex items-start gap-3 border-l-2 border-walnut/20 pl-4 mb-4">
                  <UserAvatar src={question.user.avatarUrl} name={question.user.username} size="sm" className="!h-6 !w-6 !rounded-full shrink-0 mt-0.5" />
                  <div className="text-walnut/80">
                    <span className="font-bold text-wood mr-2">{question.user.username}</span>
                    {question.body || "Sin descripción adicional."}
                  </div>
                </div>

                {topAnswer ? (
                  <div className="flex items-start gap-3 border-l-2 border-ember/50 pl-4">
                    <UserAvatar src={topAnswer.user.avatarUrl} name={topAnswer.user.username} size="sm" className="!h-6 !w-6 !rounded-full shrink-0 mt-0.5" />
                    <div className="text-parchment/90">
                      <span className="font-bold text-wood mr-2">{topAnswer.user.username}</span>
                      {topAnswer.isAccepted && (
                        <span className="text-xs font-bold text-green-500 mr-2 uppercase">✔ Solución</span>
                      )}
                      {topAnswer.body}
                    </div>
                  </div>
                ) : (
                  <div className="pl-4 text-walnut/50 italic">Aún no hay respuestas.</div>
                )}
              </div>
            </details>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4">
        <Link 
          href={`/juegos/${gameSlug}/reglas`} 
          prefetch={false}
          className="text-sm font-bold text-ember hover:text-amber-600 transition-colors"
        >
          Ver todas las dudas de este juego →
        </Link>
        <Link 
          href={`/juegos/${gameSlug}/reglas/nueva`} 
          prefetch={false}
          className="button-secondary text-xs py-1.5 px-3"
        >
          Preguntar duda
        </Link>
      </div>
    </div>
  );
}

export function GameRuleQuestionsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="divide-y divide-walnut/10 rounded-xl border border-walnut/15 bg-white/5">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center p-4 gap-3">
            <div className="h-5 w-5 bg-white/10 rounded-full shrink-0" />
            <div className="h-4 bg-white/10 rounded w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
