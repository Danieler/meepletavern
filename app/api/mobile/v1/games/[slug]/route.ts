import { NextResponse } from "next/server";
import { getMobileGameBySlug, mobilePublicCacheHeaders } from "@/lib/mobile/mobileCatalog";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const game = await getMobileGameBySlug(decodeURIComponent(slug));

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  return NextResponse.json(game, { headers: mobilePublicCacheHeaders() });
}
