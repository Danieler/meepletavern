import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { prisma } from "@/lib/prisma";
import { createRuleQuestion } from "@/lib/rules";

export async function POST(request: Request) {
  try {
    const appUser = await requireCurrentAppUser();
    const body = (await request.json().catch(() => null)) as
      | {
          gameId?: unknown;
          title?: unknown;
          body?: unknown;
        }
      | null;

    const gameId = typeof body?.gameId === "string" ? body.gameId.trim() : "";
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const content = typeof body?.body === "string" ? body.body.trim() : "";

    if (!gameId || !title) {
      return NextResponse.json({ error: "Completa el título de la duda." }, { status: 400 });
    }

    if (title.length > 150) {
      return NextResponse.json({ error: "El título es demasiado largo (máx. 150 caracteres)." }, { status: 400 });
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true, slug: true }
    });

    if (!game) {
      return NextResponse.json({ error: "Ese juego no existe." }, { status: 404 });
    }

    const question = await createRuleQuestion({
      gameId,
      userId: appUser.id,
      title,
      body: content || undefined
    });

    revalidateTag(`game-${gameId}-rules`);
    revalidatePath(`/juegos/${game.slug}`);
    revalidatePath(`/juegos/${game.slug}/reglas`);

    return NextResponse.json({
      ok: true,
      question: {
        id: question.id
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo crear la duda." },
      { status: 401 }
    );
  }
}
