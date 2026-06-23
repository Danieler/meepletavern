import { NextResponse } from "next/server";
import { getMobileCategories } from "@/lib/mobile/mobileCatalog";

export async function GET() {
  return NextResponse.json(await getMobileCategories());
}
