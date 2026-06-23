import { NextResponse } from "next/server";
import { mobileOpenApiSpec } from "@/lib/mobile/openapi";

export async function GET() {
  return NextResponse.json(mobileOpenApiSpec);
}
