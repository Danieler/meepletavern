import { accountApiErrorResponse, accountApiJson } from "@/lib/accountErrors";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { prisma } from "@/lib/prisma";
import {
  decrementCurrentUserGamePlayCount,
  incrementCurrentUserGamePlayCount
} from "@/lib/userGamePlayCounts";

async function mutatePlayCount(request: Request) {
  try {
    const appUser = await requireCurrentAppUser();
    const body = (await request.json().catch(() => null)) as {
      gameId?: unknown;
      direction?: unknown;
    } | null;
    const gameId = typeof body?.gameId === "string" ? body.gameId.trim() : "";
    const direction = body?.direction === "decrement" ? "decrement" : "increment";

    if (!gameId) {
      return accountApiJson({ error: "Falta el juego." }, { status: 400 });
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true }
    });

    if (!game) {
      return accountApiJson({ error: "El juego no existe." }, { status: 404 });
    }

    const result =
      direction === "decrement"
        ? await decrementCurrentUserGamePlayCount(appUser.id, game.id)
        : await incrementCurrentUserGamePlayCount(appUser.id, game.id);

    return accountApiJson({ ok: true, count: result.count });
  } catch (error) {
    return accountApiErrorResponse(error);
  }
}

export async function GET(request: Request) {
  try {
    const appUser = await requireCurrentAppUser();
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId")?.trim();

    if (!gameId) {
      return accountApiJson({ error: "Falta el juego." }, { status: 400 });
    }

    const playCount = await prisma.userGamePlayCount.findUnique({
      where: {
        userId_gameId: {
          userId: appUser.id,
          gameId
        }
      },
      select: { count: true }
    });

    return accountApiJson({ count: playCount?.count || 0 });
  } catch {
    return accountApiJson({ count: 0 }); // Fallback for unauthenticated users or errors
  }
}

export async function POST(request: Request) {
  return mutatePlayCount(request);
}

export async function PATCH(request: Request) {
  return mutatePlayCount(request);
}
