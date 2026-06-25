import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

export type RuleQuestionSummary = {
  id: string;
  title: string;
  body: string | null;
  createdAt: Date;
  user: {
    username: string;
    avatarUrl: string | null;
  };
  answers: {
    id: string;
    body: string;
    isAccepted: boolean;
    user: {
      username: string;
      avatarUrl: string | null;
    };
  }[];
  _count: {
    answers: number;
  };
};

export async function getGameRuleQuestions(gameId: string, limit: number = 3): Promise<RuleQuestionSummary[]> {
  const fetchQuestions = async () => {
    const rawQuestions = await prisma.ruleQuestion.findMany({
      where: { gameId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: {
          select: {
            displayName: true,
            profile: {
              select: {
                username: true,
                avatarUrl: true
              }
            }
          }
        },
        _count: { select: { answers: true } },
        answers: {
          orderBy: [
            { isAccepted: "desc" },
            { createdAt: "asc" }
          ],
          take: 1, // Only get the top answer for the accordion
          include: {
            user: {
              select: {
                displayName: true,
                profile: {
                  select: {
                    username: true,
                    avatarUrl: true
                  }
                }
              }
            }
          }
        }
      }
    });

    return rawQuestions.map(q => ({
      id: q.id,
      title: q.title,
      body: q.body,
      createdAt: q.createdAt,
      user: {
        username: q.user.profile?.username || q.user.displayName || "Usuario",
        avatarUrl: q.user.profile?.avatarUrl || null,
      },
      answers: q.answers.map(a => ({
        id: a.id,
        body: a.body,
        isAccepted: a.isAccepted,
        user: {
          username: a.user.profile?.username || a.user.displayName || "Usuario",
          avatarUrl: a.user.profile?.avatarUrl || null,
        }
      })),
      _count: q._count
    }));
  };

  // Cache by gameId
  const cached = unstable_cache(fetchQuestions, [`rule-questions-${gameId}-${limit}`], {
    tags: [`game-${gameId}-rules`],
    revalidate: 3600 // 1 hour default revalidation
  });

  return cached();
}

export async function createRuleQuestion({
  gameId,
  userId,
  title,
  body
}: {
  gameId: string;
  userId: string;
  title: string;
  body?: string;
}) {
  return prisma.ruleQuestion.create({
    data: {
      gameId,
      userId,
      title,
      body
    }
  });
}
