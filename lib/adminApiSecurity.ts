import { NextResponse } from "next/server";
import { ADMIN_REQUEST_HEADER, ADMIN_REQUEST_HEADER_VALUE } from "@/lib/adminApiClient";

export function assertTrustedAdminApiRequest(
  request: Request,
  options: {
    requireJson?: boolean;
  } = {}
) {
  const headerValue = request.headers.get(ADMIN_REQUEST_HEADER);

  if (headerValue !== ADMIN_REQUEST_HEADER_VALUE) {
    throw new AdminApiSecurityError("Petición admin no autorizada.", 403);
  }

  if (options.requireJson && !hasJsonContentType(request)) {
    throw new AdminApiSecurityError("La petición debe enviarse como JSON.", 415);
  }

  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (origin && origin !== requestUrl.origin) {
    throw new AdminApiSecurityError("Origen no permitido.", 403);
  }

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.origin !== requestUrl.origin) {
        throw new AdminApiSecurityError("Referer no permitido.", 403);
      }
    } catch {
      throw new AdminApiSecurityError("Referer inválido.", 403);
    }
  }
}

export function jsonNoStore(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export class AdminApiSecurityError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "AdminApiSecurityError";
  }
}

function hasJsonContentType(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  return contentType.toLowerCase().includes("application/json");
}
