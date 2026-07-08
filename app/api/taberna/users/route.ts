import { NextResponse } from "next/server";
import { getPublicUsersPage, PUBLIC_USER_PAGE_SIZE } from "@/lib/publicProfiles";
import { isValidTavernSearch, normalizeTavernSearch } from "@/lib/tavernSearch";

const publicCommunityFirstPageCacheHeaders = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400"
} as const;

const publicCommunityInteractiveCacheHeaders = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300"
} as const;

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

  try {
    const page = await getPublicUsersPage({ limit: PUBLIC_USER_PAGE_SIZE, cursor, query });
    const cacheHeaders = cursor || query ? publicCommunityInteractiveCacheHeaders : publicCommunityFirstPageCacheHeaders;

    return NextResponse.json(page, {
      headers: cacheHeaders
    });
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar los taberneros." }, { status: 400 });
  }
}
