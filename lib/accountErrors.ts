import { NextResponse } from "next/server";

export class AuthenticationRequiredError extends Error {
  constructor(message = "No autenticado.") {
    super(message);
    this.name = "AuthenticationRequiredError";
  }
}

export class InvalidAccountStateError extends Error {
  constructor(message = "La cuenta necesita completar su configuración.") {
    super(message);
    this.name = "InvalidAccountStateError";
  }
}

export class AccountServiceUnavailableError extends Error {
  constructor(message = "La zona de cuenta no está disponible ahora mismo.") {
    super(message);
    this.name = "AccountServiceUnavailableError";
  }
}

export type AccountApiError = {
  message: string;
  status: number;
  code: "authentication_required" | "invalid_account_state" | "service_unavailable";
};

const privateHeaders = {
  "Cache-Control": "no-store"
};

export function getAccountApiError(error: unknown): AccountApiError {
  if (error instanceof AuthenticationRequiredError) {
    return { message: error.message, status: 401, code: "authentication_required" };
  }

  if (error instanceof InvalidAccountStateError) {
    return { message: error.message, status: 409, code: "invalid_account_state" };
  }

  if (error instanceof AccountServiceUnavailableError || looksLikeInfrastructureError(error)) {
    return {
      message: "No hemos podido cargar tu cuenta ahora mismo. Prueba de nuevo en unos segundos.",
      status: 503,
      code: "service_unavailable"
    };
  }

  return {
    message: "No hemos podido completar la operación.",
    status: 500,
    code: "service_unavailable"
  };
}

export function accountApiErrorResponse(error: unknown) {
  const result = getAccountApiError(error);
  return NextResponse.json(
    {
      error: result.message,
      code: result.code
    },
    { status: result.status, headers: privateHeaders }
  );
}

export function accountApiJson(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");

  return NextResponse.json(data, {
    ...init,
    headers
  });
}

function looksLikeInfrastructureError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: unknown; message?: unknown; name?: unknown };
  const code = typeof maybeError.code === "string" ? maybeError.code : "";
  const name = typeof maybeError.name === "string" ? maybeError.name : "";
  const message = typeof maybeError.message === "string" ? maybeError.message : "";

  return (
    name.includes("PrismaClient") ||
    code === "P1001" ||
    code === "P2024" ||
    /can't reach database|timed out|connection pool|database server/i.test(message)
  );
}
