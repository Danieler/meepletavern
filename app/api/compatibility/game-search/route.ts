import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GameStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const rawQuery = new URL(request.url).searchParams.get("q") || "";
    const query = rawQuery.trim().toLowerCase();

    if (!query || query.length < 2) {
      return NextResponse.json({ games: [] });
    }

    const games = await prisma.game.findMany({
      where: {
        status: GameStatus.published,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } }
        ]
      },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: 8,
      select: {
        id: true,
        title: true,
        name: true,
        slug: true,
        coverImageUrl: true,
        imageUrl: true,
        year: true
      }
    });

    // Map to a unified format for client-side search autocomplete
    const formattedGames = games.map((game) => ({
      id: game.id,
      name: game.title || game.name,
      slug: game.slug,
      imageUrl: game.coverImageUrl || game.imageUrl || null,
      year: game.year
    }));

    return NextResponse.json({ games: formattedGames });
  } catch (error) {
    console.error("Error in public game search endpoint:", error);
    return NextResponse.json(
      { error: "Error interno al buscar juegos." },
      { status: 500 }
    );
  }
}
