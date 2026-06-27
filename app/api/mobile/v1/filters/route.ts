import { NextResponse } from "next/server";
import { getMobileFilters, mobilePublicCacheHeaders } from "@/lib/mobile/mobileCatalog";

export async function GET() {
  return NextResponse.json(getMobileFilters(), { headers: mobilePublicCacheHeaders() });
}
