import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const isAdminPath =
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/api/admin");

  if (!isAdminPath) {
    return NextResponse.next();
  }

  if (!isAuthorized(request)) {
    return new NextResponse("Autenticacion requerida", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Meeple Tavern Admin"',
        "X-Robots-Tag": "noindex, nofollow"
      }
    });
  }

  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  return response;
}

function isAuthorized(request: NextRequest) {
  const header = request.headers.get("authorization");

  if (!header?.startsWith("Basic ")) {
    return false;
  }

  const credentials = decodeBasicAuth(header);
  if (!credentials) {
    return false;
  }

  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "meepletavern";

  return credentials.username === username && credentials.password === password;
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

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
