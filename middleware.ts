import { NextRequest, NextResponse } from "next/server";
import { getRequestAuditSummary, logEgressAudit } from "@/lib/egressAudit";

export function middleware(request: NextRequest) {
  if (!isAdminPath(request.nextUrl.pathname)) {
    logEgressAudit("request", getRequestAuditSummary(request));
    return NextResponse.next();
  }

  return handleRequest(request);
}

const ADMIN_SESSION_COOKIE = "meepletavern_admin_session";
const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;
const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "meepletavern";

function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/");
}

async function handleRequest(request: NextRequest) {
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
  const config = readAdminAuthConfig();
  if (!config) {
    return { authorized: false, sessionToken: null };
  }

  const cookieToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (cookieToken && (await verifyAdminSessionToken(cookieToken, config))) {
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

  const authorized = credentials.username === config.username && credentials.password === config.password;

  return {
    authorized,
    sessionToken: authorized ? await createAdminSessionToken(config.username, config.sessionSecret) : null
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

async function createAdminSessionToken(username: string, sessionSecret: string) {
  const expiresAt = Date.now() + ADMIN_SESSION_MAX_AGE * 1000;
  const payload = base64UrlEncode(JSON.stringify({ username, expiresAt }));
  const signature = await signAdminSessionPayload(payload, sessionSecret);
  return `${payload}.${signature}`;
}

async function verifyAdminSessionToken(
  token: string,
  config: {
    username: string;
    password: string;
    sessionSecret: string;
  }
) {
  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return false;
  }

  const expectedSignature = await signAdminSessionPayload(payload, config.sessionSecret);
  if (signature !== expectedSignature) {
    return false;
  }

  try {
    const data = JSON.parse(base64UrlDecode(payload)) as { username?: unknown; expiresAt?: unknown };
    return data.username === config.username && typeof data.expiresAt === "number" && data.expiresAt > Date.now();
  } catch {
    return false;
  }
}

async function signAdminSessionPayload(payload: string, secret: string) {
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

export function readAdminAuthConfig(
  environment = process.env.NODE_ENV,
  env: Record<string, string | undefined> = process.env
) {
  const isProduction = environment === "production";
  const username = env.ADMIN_USERNAME?.trim();
  const password = env.ADMIN_PASSWORD?.trim();
  const sessionSecret = env.ADMIN_SESSION_SECRET?.trim();

  if (isProduction) {
    if (!username || !password || !sessionSecret) {
      return null;
    }

    return {
      username,
      password,
      sessionSecret
    };
  }

  return {
    username: username || DEFAULT_ADMIN_USERNAME,
    password: password || DEFAULT_ADMIN_PASSWORD,
    sessionSecret: sessionSecret || password || DEFAULT_ADMIN_PASSWORD
  };
}

export const config = {
  matcher: [
    "/",
    "/juegos/:path*",
    "/taberna",
    "/categorias/:path*",
    "/mecanicas/:path*",
    "/rankings/:path*",
    "/resenas/:path*",
    "/guias/:path*",
    "/u/:path*",
    "/api/mobile/:path*",
    "/api/taberna/:path*",
    "/api/compatibility/:path*",
    "/sitemap.xml",
    "/robots.txt",
    "/admin/:path*",
    "/api/admin/:path*"
  ]
};
