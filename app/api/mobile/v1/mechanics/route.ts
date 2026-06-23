import { NextResponse } from "next/server";
import { getMobileMechanics } from "@/lib/mobile/mobileCatalog";

export async function GET() {
  return NextResponse.json(await getMobileMechanics());
}
