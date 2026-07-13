import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { TavernGroupError } from "@/lib/tavernGroups";

export class AccountMutationSecurityError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "AccountMutationSecurityError";
  }
}

export function assertTrustedAccountMutation(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new AccountMutationSecurityError("La petición debe enviarse como JSON.", 415);
  }
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== requestUrl.origin) {
    throw new AccountMutationSecurityError("Origen no permitido.", 403);
  }
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      if (new URL(referer).origin !== requestUrl.origin) {
        throw new AccountMutationSecurityError("Origen no permitido.", 403);
      }
    } catch (error) {
      if (error instanceof AccountMutationSecurityError) throw error;
      throw new AccountMutationSecurityError("Referer inválido.", 403);
    }
  }
}

export function privateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export function tavernApiError(error: unknown, fallback: string) {
  if (error instanceof TavernGroupError) {
    return privateJson({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof AccountMutationSecurityError) {
    return privateJson({ error: error.message }, { status: error.status });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return privateJson({ error: "Ese cambio ya se había realizado.", code: "CONFLICT" }, { status: 409 });
  }
  const message = error instanceof Error ? error.message : fallback;
  const status = message === "No autenticado." ? 401 : 500;
  return privateJson({ error: status === 500 ? fallback : message }, { status });
}
