import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { upsertAppUserFromAuthUser } from "@/lib/userAccounts";
import { ActivityEventType } from "@prisma/client";
import { tryRecordPublicActivityEvent, TAVERN_ACTIVITY_CACHE_TAG } from "@/lib/activity/events";
import { compatibilityCache } from "@/lib/compatibility";
import { revalidateTag } from "next/cache";

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

    const gameIds: string[] = body.gameIds;

    // Fetch game details to ensure they exist and record activities
    const games = await prisma.game.findMany({
      where: {
        id: { in: gameIds }
      },
      select: {
        id: true,
        slug: true,
        title: true,
        name: true
      }
    });

    if (games.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron los juegos indicados." },
        { status: 404 }
      );
    }

    // Insert library entries and trigger activity events
    let activityRecorded = false;
    for (const game of games) {
      // Upsert library entry strictly as played: true
      await prisma.userLibraryGame.upsert({
        where: {
          userId_gameId: {
            userId: appUser.id,
            gameId: game.id
          }
        },
        create: {
          userId: appUser.id,
          gameId: game.id,
          played: true,
          owned: false,
          wantToPlay: false,
          wantToBuy: false
        },
        update: {
          played: true,
          owned: false,
          wantToPlay: false,
          wantToBuy: false
        }
      });

      // Record activity event
      const eventRecorded = await tryRecordPublicActivityEvent({
        type: ActivityEventType.PLAYED,
        actor: appUser,
        game,
        requiresPublicCollection: true
      });
      if (eventRecorded) {
        activityRecorded = true;
      }
    }

    // Clear compatibility cache for this user
    compatibilityCache.delete(appUser.id);

    // Invalidate activity caches if any events were logged
    if (activityRecorded) {
      revalidateTag(TAVERN_ACTIVITY_CACHE_TAG);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error in onboarding games route:", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
