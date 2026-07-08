import { NextResponse } from "next/server";
import { mobileOpenApiSpec } from "@/lib/mobile/openapi";

export const revalidate = 86400;

const staticPublicCacheHeaders = {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800"
} as const;

export async function GET() {
  return NextResponse.json(mobileOpenApiSpec, { headers: staticPublicCacheHeaders });
}
