import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompatibilityMatches, UserGameInput } from "@/lib/compatibility";

interface ArchetypeGame {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  reason: string;
}

const ARCHETYPES = [
  {
    userId: "archetype-euro",
    username: "EuroTaberna",
    displayName: "Jugador Eurogamer",
    avatarUrl: null,
    score: 88,
    confidence: "medium" as const,
    sharedMechanics: ["Colocación de trabajadores", "Gestión de recursos"],
    sharedCategories: ["Económico", "Estrategia"],
    suggestedGames: [] as ArchetypeGame[]
  },
  {
    userId: "archetype-coop",
    username: "CoopMaster",
    displayName: "Fan de Cooperativos",
    avatarUrl: null,
    score: 76,
    confidence: "medium" as const,
    sharedMechanics: ["Cooperativo", "Límites de comunicación"],
    sharedCategories: ["Familiar", "Aventura"],
    suggestedGames: [] as ArchetypeGame[]
  },
  {
    userId: "archetype-casual",
    username: "PartyKing",
    displayName: "Fan de Party Games",
    avatarUrl: null,
    score: 63,
    confidence: "medium" as const,
    sharedMechanics: ["Votación", "Humor"],
    sharedCategories: ["Fiestero", "Familiar"],
    suggestedGames: [] as ArchetypeGame[]
  }
];

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.gameIds) || body.gameIds.length === 0) {
      return NextResponse.json(
        { error: "Debes seleccionar al menos un juego." },
        { status: 400 }
      );
    }

    const gameIds: string[] = body.gameIds.slice(0, 10); // cap to reasonable number

    // Fetch the games from database
    const games = await prisma.game.findMany({
      where: {
        id: { in: gameIds },
        status: "published"
      },
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        categories: true,
        mechanics: true,
        complexity: true,
        difficulty: true
      }
    });

    if (games.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron los juegos seleccionados." },
        { status: 404 }
      );
    }

    // Map to UserGameInput as played: true
    const userGameInputs: UserGameInput[] = games.map((game) => ({
      gameId: game.id,
      owned: false,
      wantToPlay: false,
      played: true,
      game
    }));

    // Get real matches
    const realMatches = await getCompatibilityMatches(null, userGameInputs);

    // Filter down to safe public information
    const safeRealMatches = realMatches.map((match) => ({
      userId: match.userId,
      username: match.username,
      displayName: match.displayName,
      avatarUrl: match.avatarUrl,
      score: match.score,
      confidence: match.confidence,
      sharedMechanics: match.sharedMechanics,
      sharedCategories: match.sharedCategories,
      suggestedGames: match.suggestedGames
    }));

    // Combine with archetypes if we have fewer than 3 matches
    let finalMatches = safeRealMatches.slice(0, 3);
    if (finalMatches.length < 3) {
      const remainingCount = 3 - finalMatches.length;
      const selectedArchetypes = ARCHETYPES.slice(0, remainingCount).map((arch) => {
        // Dynamically suggest playing some of the user's selected games
        const dynamicSuggestions = games.slice(0, 2).map((g, idx) => ({
          id: g.id,
          name: g.name,
          slug: g.slug,
          imageUrl: g.imageUrl,
          reason: idx === 0 ? "Le encanta este juego" : "Coincidencia de gustos"
        }));

        return {
          ...arch,
          suggestedGames: dynamicSuggestions
        };
      });
      finalMatches = [...finalMatches, ...selectedArchetypes];
    }

    return NextResponse.json({ matches: finalMatches });
  } catch (error) {
    console.error("Error in compatibility preview endpoint:", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
