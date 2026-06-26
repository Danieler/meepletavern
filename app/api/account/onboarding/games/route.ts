import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertAppUserFromAuthUser } from "@/lib/userAccounts";
import {
  normalizeOnboardingGameIds,
  normalizeOnboardingSource,
  syncOnboardingGamesForUser
} from "@/lib/onboardingGames";

export async function POST(request: Request) {
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

    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.gameIds) || body.gameIds.length === 0) {
      return NextResponse.json(
        { error: "Faltan los identificadores de juegos." },
        { status: 400 }
      );
    }

    const gameIds = normalizeOnboardingGameIds(body.gameIds);
    const source = normalizeOnboardingSource(body.source);

    if (gameIds.length === 0) {
      return NextResponse.json(
        { error: "Faltan los identificadores de juegos." },
        { status: 400 }
      );
    }

    const result = await syncOnboardingGamesForUser({ appUser, gameIds, source });

    if (!result.ok) {
      return NextResponse.json(
        { error: "No se encontraron los juegos indicados." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, gamesCount: result.gamesCount });
  } catch (error) {
    console.error("Error in onboarding games route:", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
