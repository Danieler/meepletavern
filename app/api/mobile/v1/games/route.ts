import { NextResponse } from "next/server";
import {
  getMobileGameFilterError,
  getMobileGames,
  mobilePublicCacheHeaders,
  parseMobileGameFilters
} from "@/lib/mobile/mobileCatalog";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const filterError = getMobileGameFilterError(searchParams);
  if (filterError) {
    return NextResponse.json(
      { error: filterError },
      { status: 400, headers: mobilePublicCacheHeaders() }
    );
  }

  const filters = parseMobileGameFilters(searchParams);
  const response = await getMobileGames(filters);

  return NextResponse.json(response, { headers: mobilePublicCacheHeaders() });
}
