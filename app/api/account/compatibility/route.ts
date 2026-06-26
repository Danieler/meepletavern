import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { upsertAppUserFromAuthUser } from "@/lib/userAccounts";
import { getCompatibilityMatches, UserGameInput, compatibilityCache } from "@/lib/compatibility";

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const appUser = await upsertAppUserFromAuthUser(user);

    // Check cache
    const cached = compatibilityCache.get(appUser.id);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.data);
    }

    // Fetch user library games
    const userLibrary = await prisma.userLibraryGame.findMany({
      where: { userId: appUser.id },
      include: {
        game: {
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
        }
      }
    });

    if (userLibrary.length === 0) {
      const responseData = { matches: [], empty: true };
      return NextResponse.json(responseData);
    }

    // Map user library items to UserGameInput format
    const userGameInputs: UserGameInput[] = userLibrary.map((item) => ({
      gameId: item.gameId,
      owned: item.owned,
      wantToPlay: item.wantToPlay,
      played: item.played,
      game: item.game
    }));

    // Run the matching algorithm
    const matches = await getCompatibilityMatches(appUser.id, userGameInputs);

    const responseData = { matches, empty: false };

    // Save to cache
    compatibilityCache.set(appUser.id, {
      data: responseData,
      expiresAt: Date.now() + CACHE_TTL_MS
    });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error in account compatibility matches endpoint:", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
