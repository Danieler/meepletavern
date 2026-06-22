const PRIVATE_PATH_PREFIXES = ["/admin", "/auth", "/mi-perfil", "/api"];

export function shouldTrackAnalyticsPath(pathname: string) {
  if (PRIVATE_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return false;
  }

  return !/^\/juegos\/[^/]+\/resena(?:\/|$)/.test(pathname);
}

export function sanitizeAnalyticsUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl, "https://meepletavern.invalid");

    if (!shouldTrackAnalyticsPath(url.pathname)) {
      return null;
    }

    const profileMatch = url.pathname.match(/^\/u\/[^/]+(\/listas(?:\/[^/]+)?)?\/?$/);
    if (profileMatch) {
      const profileSuffix = profileMatch[1];
      url.pathname = profileSuffix?.split("/").filter(Boolean).length === 2
        ? "/u/[username]/listas/[listSlug]"
        : profileSuffix
          ? "/u/[username]/listas"
          : "/u/[username]";
    }

    url.search = "";
    url.hash = "";

    return url.origin === "https://meepletavern.invalid"
      ? url.pathname
      : `${url.origin}${url.pathname}`;
  } catch {
    return null;
  }
}
