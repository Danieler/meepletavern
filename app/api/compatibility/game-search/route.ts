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

    const cleanQuery = query.replace(/[\s-]/g, "");
    const likeQuery = `%${query}%`;
    const cleanLikeQuery = `%${cleanQuery}%`;

    const games = await prisma.$queryRaw<Array<{
      id: string;
      title: string;
      name: string;
      slug: string;
      coverImageUrl: string | null;
      imageUrl: string | null;
      year: number | null;
    }>>`
      SELECT id, title, name, slug, "coverImageUrl", "imageUrl", year
      FROM "Game"
      WHERE status = ${GameStatus.published}::"GameStatus"
        AND (
          title ILIKE ${likeQuery}
          OR name ILIKE ${likeQuery}
          OR replace(replace(lower(title), ' ', ''), '-', '') LIKE ${cleanLikeQuery}
          OR replace(replace(lower(name), ' ', ''), '-', '') LIKE ${cleanLikeQuery}
        )
      ORDER BY "publishedAt" DESC NULLS LAST, id DESC
      LIMIT 8
    `;

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
