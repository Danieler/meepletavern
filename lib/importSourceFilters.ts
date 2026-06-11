import type { Source } from "@prisma/client";

export function isAmazonImportSource(source: Pick<Source, "baseUrl" | "name">) {
  const normalized = `${source.name} ${source.baseUrl}`.toLowerCase();
  return normalized.includes("amazon.");
}
