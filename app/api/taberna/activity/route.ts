import { NextResponse } from "next/server";
import { getTavernActivityFeed, TAVERN_ACTIVITY_PAGE_SIZE } from "@/lib/activity/feed";
import { isValidTavernSearch, normalizeTavernSearch } from "@/lib/tavernSearch";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const cursor = searchParams.get("cursor")?.trim() || null;
  const rawQuery = searchParams.get("q");

  if (cursor && (cursor.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(cursor))) {
    return NextResponse.json({ error: "Cursor no válido." }, { status: 400 });
  }
  if (!isValidTavernSearch(rawQuery)) {
    return NextResponse.json({ error: "Escribe entre 2 y 60 caracteres para buscar." }, { status: 400 });
  }

  const query = normalizeTavernSearch(rawQuery);
  const type = searchParams.get("type")?.trim() || null;

  try {
    const feed = await getTavernActivityFeed({ limit: TAVERN_ACTIVITY_PAGE_SIZE, cursor, query, type });
    return NextResponse.json(feed, {
      headers: {
        "Cache-Control": (query || type) ? "no-store" : "public, s-maxage=60, stale-while-revalidate=300"
      }
    });
  } catch {
    return NextResponse.json({ error: "No se pudo cargar más actividad." }, { status: 400 });
  }
}
