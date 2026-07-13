const PRIVATE_PATH_PREFIXES = ["/admin", "/auth", "/mi-perfil", "/api", "/comunidad/tabernas", "/comunidad/invitaciones"];
const SAFE_CAMPAIGN_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const SAFE_CAMPAIGN_VALUE = /^[a-zA-Z0-9._~-]{1,96}$/;

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

    const safeSearch = new URLSearchParams();
    for (const key of SAFE_CAMPAIGN_PARAMS) {
      const value = url.searchParams.get(key);
      if (value && SAFE_CAMPAIGN_VALUE.test(value)) {
        safeSearch.set(key, value);
      }
    }

    url.search = safeSearch.toString();
    url.hash = "";

    return url.origin === "https://meepletavern.invalid"
      ? `${url.pathname}${url.search}`
      : `${url.origin}${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}
