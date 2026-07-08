import { NextResponse } from "next/server";
import { getMobileFilters, mobilePublicCacheHeaders } from "@/lib/mobile/mobileCatalog";

export const revalidate = 3600;

export async function GET() {
  return NextResponse.json(getMobileFilters(), { headers: mobilePublicCacheHeaders() });
}
