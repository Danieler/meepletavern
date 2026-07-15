import { NextRequest, NextResponse } from "next/server";
import { getRequestAuditSummary, logEgressAudit } from "@/lib/egressAudit";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const canonicalHostResponse = getCanonicalHostResponse(request);
  if (canonicalHostResponse) {
    return canonicalHostResponse;
  }

  if (!isAdminPath(request.nextUrl.pathname)) {
    const auditSummary = getRequestAuditSummary(request);
    logEgressAudit("request", auditSummary);

    const catalogGuardResponse = getCatalogFilterGuardResponse(request, auditSummary);
    if (catalogGuardResponse) {
      return catalogGuardResponse;
    }

    const canonicalCatalogQueryResponse = getCanonicalCatalogQueryResponse(request, auditSummary);
    if (canonicalCatalogQueryResponse) {
      return canonicalCatalogQueryResponse;
    }

    let response = NextResponse.next();
    if (isSupabaseSessionPath(request.nextUrl.pathname)) {
      const supabaseClient = createSupabaseMiddlewareClient(request);
      await supabaseClient.supabase.auth.getUser();
      response = supabaseClient.response;
    }
    if (isFilteredCatalogPath(request)) {
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return response;
  }

  return handleRequest(request);
}

const CATALOG_FILTER_FAMILIES = ["q", "players", "duration", "weight", "age", "category", "mechanic"] as const;
const CATALOG_QUERY_KEYS = [...CATALOG_FILTER_FAMILIES, "sort", "page", "welcome"] as const;
const MAX_CATALOG_FILTER_FAMILIES = 3;
const MAX_CATALOG_FILTER_VALUES = 6;
const MAX_CATALOG_VALUES_PER_FAMILY = 3;
const CANONICAL_HOST = "www.meepletavern.com";

function getCanonicalHostResponse(request: NextRequest) {
  const vercelEnvironment = process.env.VERCEL_ENV;
  if (process.env.NODE_ENV !== "production" || (vercelEnvironment && vercelEnvironment !== "production")) {
    return null;
  }

  const host = request.nextUrl.hostname.toLowerCase();
  if (!host.endsWith(".vercel.app")) {
    return null;
  }

  const targetUrl = request.nextUrl.clone();
  targetUrl.protocol = "https:";
  targetUrl.hostname = CANONICAL_HOST;
  targetUrl.port = "";

  const response = NextResponse.redirect(targetUrl, 308);
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
  return response;
}

function isFilteredCatalogPath(request: NextRequest) {
  return request.nextUrl.pathname === "/juegos" && request.nextUrl.searchParams.size > 0;
}

function isSupabaseSessionPath(pathname: string) {
  return (
    pathname === "/api/account" ||
    pathname.startsWith("/api/account/")
  );
}

function getCatalogFilterGuardResponse(request: NextRequest, auditSummary: Record<string, unknown>) {
  if (request.nextUrl.pathname !== "/juegos" || request.method !== "GET") {
    return null;
  }

  const searchParams = request.nextUrl.searchParams;
  const activeFamilies = CATALOG_FILTER_FAMILIES.filter((family) => searchParams.has(family));
  const filterValueCount = activeFamilies.reduce((count, family) => count + searchParams.getAll(family).filter(Boolean).length, 0);
  const overloadedFamilies = activeFamilies.filter((family) => searchParams.getAll(family).filter(Boolean).length > MAX_CATALOG_VALUES_PER_FAMILY);

  if (
    activeFamilies.length <= MAX_CATALOG_FILTER_FAMILIES &&
    filterValueCount <= MAX_CATALOG_FILTER_VALUES &&
    overloadedFamilies.length === 0
  ) {
    return null;
  }

  logEgressAudit("catalog-filter-guard", {
    ...auditSummary,
    activeFilterFamilies: activeFamilies,
    activeFilterFamilyCount: activeFamilies.length,
    overloadedFilterFamilies: overloadedFamilies,
    filterValueCount,
    maxFilterFamilies: MAX_CATALOG_FILTER_FAMILIES,
    maxFilterValues: MAX_CATALOG_FILTER_VALUES,
    maxValuesPerFamily: MAX_CATALOG_VALUES_PER_FAMILY
  });

  return new NextResponse(buildCatalogFilterGuardHtml(), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function getCanonicalCatalogQueryResponse(request: NextRequest, auditSummary: Record<string, unknown>) {
  if (request.nextUrl.pathname !== "/juegos" || request.method !== "GET" || request.nextUrl.searchParams.size === 0) {
    return null;
  }

  const canonicalParams = new URLSearchParams();

  for (const key of CATALOG_QUERY_KEYS) {
    const values = request.nextUrl.searchParams
      .getAll(key)
      .map((value) => value.trim())
      .filter(Boolean);

    if (!values.length) {
      continue;
    }

    if (key === "sort" && values.at(-1) === "nombre") {
      continue;
    }

    if (key === "page" && values.at(-1) === "1") {
      continue;
    }

    if (key === "q" || key === "sort" || key === "page" || key === "welcome") {
      canonicalParams.set(key, values.at(-1) || "");
      continue;
    }

    for (const value of [...new Set(values)].sort((left, right) => left.localeCompare(right, "es"))) {
      canonicalParams.append(key, value);
    }
  }

  const targetUrl = request.nextUrl.clone();
  targetUrl.search = canonicalParams.toString();

  if (`${targetUrl.pathname}${targetUrl.search}` === `${request.nextUrl.pathname}${request.nextUrl.search}`) {
    return null;
  }

  logEgressAudit("catalog-query-canonicalized", {
    ...auditSummary,
    canonicalPath: targetUrl.pathname,
    canonicalQueryParamCount: canonicalParams.size
  });

  const response = NextResponse.redirect(targetUrl, 308);
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
  return response;
}

function buildCatalogFilterGuardHtml() {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Filtros demasiado específicos | MeepleTavern</title>
  <style>
    body{margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fbf7ee;color:#2d1a12;display:grid;min-height:100vh;place-items:center;padding:24px}
    main{max-width:560px;border:1px solid rgba(69,40,26,.16);background:#fffaf0;border-radius:8px;padding:28px;box-shadow:0 12px 32px rgba(45,26,18,.08)}
    p{font-size:16px;line-height:1.55;color:rgba(45,26,18,.72)}
    a{display:inline-flex;margin-top:12px;border-radius:6px;background:#d8892b;color:#21140d;text-decoration:none;font-weight:800;padding:10px 14px}
  </style>
</head>
<body>
  <main>
    <h1>Demasiados filtros combinados</h1>
    <p>Para proteger la velocidad de la taberna, empieza con menos filtros y afina la búsqueda desde el catálogo.</p>
    <a href="/juegos">Volver al catálogo</a>
  </main>
</body>
</html>`;
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
    {
      source: "/juegos",
      has: [{ type: "query", key: "q" }],
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
        { type: "header", key: "sec-purpose", value: "prefetch" }
      ]
    },
    {
      source: "/juegos",
      has: [{ type: "query", key: "players" }],
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
        { type: "header", key: "sec-purpose", value: "prefetch" }
      ]
    },
    {
      source: "/juegos",
      has: [{ type: "query", key: "duration" }],
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
        { type: "header", key: "sec-purpose", value: "prefetch" }
      ]
    },
    {
      source: "/juegos",
      has: [{ type: "query", key: "weight" }],
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
        { type: "header", key: "sec-purpose", value: "prefetch" }
      ]
    },
    {
      source: "/juegos",
      has: [{ type: "query", key: "age" }],
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
        { type: "header", key: "sec-purpose", value: "prefetch" }
      ]
    },
    {
      source: "/juegos",
      has: [{ type: "query", key: "category" }],
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
        { type: "header", key: "sec-purpose", value: "prefetch" }
      ]
    },
    {
      source: "/juegos",
      has: [{ type: "query", key: "mechanic" }],
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
        { type: "header", key: "sec-purpose", value: "prefetch" }
      ]
    },
    {
      source: "/juegos",
      has: [{ type: "query", key: "sort" }],
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
        { type: "header", key: "sec-purpose", value: "prefetch" }
      ]
    },
    {
      source: "/juegos",
      has: [{ type: "query", key: "page" }],
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
        { type: "header", key: "sec-purpose", value: "prefetch" }
      ]
    },
    {
      source: "/juegos",
      has: [{ type: "query", key: "welcome" }],
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
        { type: "header", key: "sec-purpose", value: "prefetch" }
      ]
    },
    "/admin/:path*",
    "/api/admin/:path*",
    "/auth/:path*",
    "/bienvenida/usuario",
    "/comunidad/tabernas/:path*",
    "/comunidad/invitaciones/:path*",
    "/mi-perfil/:path*",
    "/api/account/:path*"
  ]
};
