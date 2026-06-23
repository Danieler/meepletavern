import { NextResponse } from "next/server";
import { getMobileFilters } from "@/lib/mobile/mobileCatalog";

export async function GET() {
  return NextResponse.json(getMobileFilters());
}
