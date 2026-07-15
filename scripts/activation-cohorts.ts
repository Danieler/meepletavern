import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const MS_PER_DAY = 86_400_000;

type CohortRow = {
  cohortDate: string;
  registrations: number;
  firstLibraryActionWithin24h: number;
  usefulReturnDays2To7: number;
};

async function main() {
  const days = normalizeDays(process.env.COHORT_DAYS);
  const since = startOfDay(new Date(Date.now() - days * MS_PER_DAY));
  const users = await prisma.user.findMany({
    where: { createdAt: { gte: since } },
    select: {
      id: true,
      createdAt: true,
      library: {
        where: {
          OR: [
            { owned: true },
            { wantToPlay: true },
            { wantToBuy: true },
            { played: true }
          ]
        },
        select: {
          createdAt: true,
          updatedAt: true
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });
  const cohorts = new Map<string, CohortRow>();

  for (const user of users) {
    const cohortDate = toDateKey(user.createdAt);
    const cohort = cohorts.get(cohortDate) || {
      cohortDate,
      registrations: 0,
      firstLibraryActionWithin24h: 0,
      usefulReturnDays2To7: 0
    };
    const actionTimes = user.library
      .flatMap((entry) => [entry.createdAt, entry.updatedAt])
      .map((date) => date.getTime())
      .filter((time) => Number.isFinite(time))
      .sort((left, right) => left - right);
    const registeredAt = user.createdAt.getTime();
    const firstAction = actionTimes[0];
    const hasFirstActionWithin24h = firstAction !== undefined && firstAction - registeredAt <= MS_PER_DAY;
    const hasUsefulReturnDays2To7 = actionTimes.some((time) => {
      const age = time - registeredAt;
      return age >= 2 * MS_PER_DAY && age <= 7 * MS_PER_DAY;
    });

    cohort.registrations += 1;
    if (hasFirstActionWithin24h) cohort.firstLibraryActionWithin24h += 1;
    if (hasUsefulReturnDays2To7) cohort.usefulReturnDays2To7 += 1;
    cohorts.set(cohortDate, cohort);
  }

  console.table(Array.from(cohorts.values()));
}

function normalizeDays(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(180, Math.trunc(parsed)) : 30;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

main()
  .catch((error) => {
    console.error("No se pudieron calcular las cohortes de activación.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
