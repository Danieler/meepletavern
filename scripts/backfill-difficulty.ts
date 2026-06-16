import { prisma } from "../lib/prisma";
import { difficultyRank, inferImportedDifficulty } from "../lib/import/difficulty";

type GameForBackfill = Awaited<ReturnType<typeof loadGames>>[number];

const WRITE = process.argv.includes("--write");
const ALLOW_DOWNGRADE = process.argv.includes("--allow-downgrade");

async function loadGames() {
  return prisma.game.findMany({
    select: {
      id: true,
      name: true,
      title: true,
      originalTitle: true,
      difficulty: true,
      complexity: true,
      playtime: true,
      age: true,
      minAge: true,
      description: true,
      shortDescription: true,
      shortSummary: true,
      categories: true,
      mechanics: true,
      themes: true,
      ratings: true,
      sources: true,
      status: true
    },
    orderBy: { title: "asc" }
  });
}

function metadataFor(game: GameForBackfill) {
  return {
    ratings: game.ratings,
    sources: game.sources,
    difficulty: game.difficulty,
    complexity: game.complexity,
    minAge: game.minAge ?? parseAge(game.age)
  };
}

function parseAge(value: string | null) {
  if (!value) return null;
  const match = value.match(/\d{1,2}/);
  return match ? Number(match[0]) : null;
}

async function main() {
  const games = await loadGames();
  const changes: Array<{ id: string; title: string; from: string; to: string; source: string; weight: number | null }> = [];

  for (const game of games) {
    const inferred = inferImportedDifficulty({
      title: game.title || game.name,
      originalTitle: game.originalTitle,
      metadata: metadataFor(game),
      description: [game.description, game.shortDescription, game.shortSummary].filter(Boolean).join("\n"),
      categories: game.categories,
      mechanics: game.mechanics,
      themes: game.themes,
      minAge: game.minAge ?? parseAge(game.age),
      playtime: game.playtime,
      fallback: game.difficulty || game.complexity
    });

    if (inferred.source === "default") continue;

    const current = game.difficulty || game.complexity || "";
    const currentRank = difficultyRank(current);
    const nextRank = difficultyRank(inferred.value);

    if (current === inferred.value) continue;
    if (!ALLOW_DOWNGRADE && currentRank > nextRank) continue;

    changes.push({
      id: game.id,
      title: game.title || game.name,
      from: current || "(vacío)",
      to: inferred.value,
      source: inferred.source,
      weight: inferred.weight
    });
  }

  console.table(changes.map(({ title, from, to, source, weight }) => ({ title, from, to, source, weight })));
  console.log(`${WRITE ? "Aplicando" : "Dry run"}: ${changes.length} cambios de dificultad`);

  if (!WRITE) {
    console.log("Para aplicar: npm run backfill:difficulty -- --write");
    console.log("Por seguridad no rebaja dificultades existentes. Para permitir rebajas: npm run backfill:difficulty -- --write --allow-downgrade");
    return;
  }

  for (const change of changes) {
    await prisma.game.update({
      where: { id: change.id },
      data: {
        difficulty: change.to,
        complexity: change.to
      }
    });
  }

  console.log(`Actualizados ${changes.length} juegos.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
