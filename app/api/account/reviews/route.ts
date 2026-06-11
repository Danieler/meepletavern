import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { prisma } from "@/lib/prisma";
import { createReview } from "@/lib/reviews";

export async function POST(request: Request) {
  try {
    const appUser = await requireCurrentAppUser();
    const body = (await request.json().catch(() => null)) as
      | {
          gameId?: unknown;
          title?: unknown;
          summary?: unknown;
          body?: unknown;
        }
      | null;

    const gameId = typeof body?.gameId === "string" ? body.gameId.trim() : "";
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const summary = typeof body?.summary === "string" ? body.summary.trim() : "";
    const content = typeof body?.body === "string" ? body.body.trim() : "";

    if (!gameId || !title || !summary || !content) {
      return NextResponse.json({ error: "Completa todos los campos de la reseña." }, { status: 400 });
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true, slug: true, title: true, name: true }
    });

    if (!game) {
      return NextResponse.json({ error: "Ese juego no existe." }, { status: 404 });
    }

    const review = await createReview({
      gameId,
      userId: appUser.id,
      authorName: appUser.displayName || appUser.email.split("@")[0] || "Usuario",
      title,
      summary,
      body: content,
      createdByAdmin: false
    });

    revalidateTag("public-games");
    revalidatePath("/");
    revalidatePath("/resenas");
    revalidatePath(`/resenas/${review.slug}`);
    revalidatePath(`/juegos/${game.slug}`);
    revalidatePath("/sitemap.xml");

    return NextResponse.json({
      ok: true,
      review: {
        id: review.id,
        slug: review.slug
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo crear la reseña." },
      { status: 401 }
    );
  }
}
