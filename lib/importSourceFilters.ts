import type { Source } from "@prisma/client";

export function isAmazonImportSource(source: Pick<Source, "type" | "name">) {
  return source.type === "affiliate_api" || source.name.toLowerCase().includes("amazon");
}

export function isAsmodeeImportSource(source: Pick<Source, "name" | "baseUrl">) {
  return source.name.toLowerCase().includes("asmodee") || source.baseUrl.toLowerCase().includes("asmodee");
}
