import { NextResponse } from "next/server";
import { getMobileCategories, mobilePublicCacheHeaders } from "@/lib/mobile/mobileCatalog";

export async function GET() {
  return NextResponse.json(await getMobileCategories(), { headers: mobilePublicCacheHeaders() });
}
