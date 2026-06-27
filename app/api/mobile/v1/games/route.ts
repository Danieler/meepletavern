import { NextResponse } from "next/server";
import { getMobileGames, mobilePublicCacheHeaders, parseMobileGameFilters } from "@/lib/mobile/mobileCatalog";

export async function GET(request: Request) {
  const filters = parseMobileGameFilters(new URL(request.url).searchParams);
  const response = await getMobileGames(filters);

  return NextResponse.json(response, { headers: mobilePublicCacheHeaders() });
}
