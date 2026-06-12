import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";

export function middleware(request: NextRequest) {
  return handleRequest(request);
}

const ADMIN_SESSION_COOKIE = "meepletavern_admin_session";
const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;

async function handleRequest(request: NextRequest) {
  const isAdminPath =
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/api/admin");

  if (!isAdminPath) {
    if (!isSupabaseConfigured) {
      return NextResponse.next();
    }

    const client = createSupabaseMiddlewareClient(request);
    await client.supabase.auth.getUser();
    return client.response;
  }

  const auth = await resolveAdminAuth(request);

  if (!auth.authorized) {
    return new NextResponse("Autenticacion requerida", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Meeple Tavern Admin"',
        "X-Robots-Tag": "noindex, nofollow"
      }
    });
  }

  const response = NextResponse.next();

  if (auth.sessionToken) {
    response.cookies.set(ADMIN_SESSION_COOKIE, auth.sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      maxAge: ADMIN_SESSION_MAX_AGE,
      path: "/admin"
    });
  }

  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  return response;
}

async function resolveAdminAuth(request: NextRequest) {
  const cookieToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (cookieToken && (await verifyAdminSessionToken(cookieToken))) {
    return { authorized: true, sessionToken: null };
  }

  const header = request.headers.get("authorization");

  if (!header?.startsWith("Basic ")) {
    return { authorized: false, sessionToken: null };
  }

  const credentials = decodeBasicAuth(header);
  if (!credentials) {
    return { authorized: false, sessionToken: null };
  }

  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "meepletavern";

  const authorized = credentials.username === username && credentials.password === password;

  return {
    authorized,
    sessionToken: authorized ? await createAdminSessionToken(username) : null
  };
}

function decodeBasicAuth(header: string) {
  try {
    const value = atob(header.replace("Basic ", ""));
    const separator = value.indexOf(":");

    if (separator < 0) {
      return null;
    }

    return {
      username: value.slice(0, separator),
      password: value.slice(separator + 1)
    };
  } catch {
    return null;
  }
}

async function createAdminSessionToken(username: string) {
  const expiresAt = Date.now() + ADMIN_SESSION_MAX_AGE * 1000;
  const payload = base64UrlEncode(JSON.stringify({ username, expiresAt }));
  const signature = await signAdminSessionPayload(payload);
  return `${payload}.${signature}`;
}

async function verifyAdminSessionToken(token: string) {
  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return false;
  }

  const expectedSignature = await signAdminSessionPayload(payload);
  if (signature !== expectedSignature) {
    return false;
  }

  try {
    const data = JSON.parse(base64UrlDecode(payload)) as { username?: unknown; expiresAt?: unknown };
    const username = process.env.ADMIN_USERNAME || "admin";
    return data.username === username && typeof data.expiresAt === "number" && data.expiresAt > Date.now();
  } catch {
    return false;
  }
}

async function signAdminSessionPayload(payload: string) {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "meepletavern";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
}

function base64UrlEncode(value: string) {
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(value: string) {
  const padded = value.padEnd(Math.ceil(value.length / 4) * 4, "=").replaceAll("-", "+").replaceAll("_", "/");
  return atob(padded);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
