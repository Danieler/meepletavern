type AuditPayload = Record<string, unknown>;

const enabledValues = new Set(["1", "true", "yes", "on"]);

export function isEgressAuditEnabled() {
  return enabledValues.has((process.env.EGRESS_AUDIT_ENABLED || "").trim().toLowerCase());
}

export function estimateJsonBytes(value: unknown) {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return null;
  }
}

export function auditDataSource<T>(source: string, value: T, payload: AuditPayload = {}) {
  if (!isEgressAuditEnabled()) {
    return value;
  }

  const jsonBytes = estimateJsonBytes(value);
  const heavyThreshold = getHeavyPayloadThreshold();
  const isHeavy = typeof jsonBytes === "number" && jsonBytes >= heavyThreshold;
  const event = isHeavy ? "heavy-data" : "data";
  const logPayload = {
    source,
    jsonBytes,
    heavyThreshold,
    ...inferShape(value),
    ...payload
  };

  if (isHeavy) {
    logEgressAuditWarning(event, logPayload);
    return value;
  }

  logEgressAudit("data", {
    ...logPayload
  });

  return value;
}

export function logEgressAudit(event: string, payload: AuditPayload = {}) {
  if (!isEgressAuditEnabled()) {
    return;
  }

  console.info(formatAuditLine(event, payload));
}

function logEgressAuditWarning(event: string, payload: AuditPayload = {}) {
  if (!isEgressAuditEnabled()) {
    return;
  }

  console.warn(formatAuditLine(event, payload));
}

function formatAuditLine(event: string, payload: AuditPayload) {
  return `[egress-audit] ${JSON.stringify({
    event,
    at: new Date().toISOString(),
    runtime: process.env.NEXT_RUNTIME || "nodejs",
    ...payload
  })}`;
}

function getHeavyPayloadThreshold() {
  const value = Number(process.env.EGRESS_AUDIT_HEAVY_BYTES);
  return Number.isFinite(value) && value > 0 ? value : 250_000;
}

export function summarizeSearchParams(searchParams: URLSearchParams) {
  const keys = [...new Set([...searchParams.keys()])].sort();
  const summary: AuditPayload = {
    queryKeys: keys,
    queryParamCount: keys.length
  };

  for (const key of ["page", "limit", "sort", "type"]) {
    const value = searchParams.get(key);
    if (value) {
      summary[key] = value.slice(0, 32);
    }
  }

  const q = searchParams.get("q");
  if (q) {
    summary.qLength = q.length;
  }

  for (const key of ["category", "mechanic", "theme", "players", "duration", "weight", "age"]) {
    const values = searchParams.getAll(key);
    if (values.length) {
      summary[`${key}Count`] = values.length;
    }
  }

  summary.hasCursor = searchParams.has("cursor");
  summary.hasRscParam = searchParams.has("_rsc");

  return summary;
}

export function getRequestAuditSummary(request: Request) {
  const url = new URL(request.url);
  const headers = request.headers;
  const purpose = headers.get("purpose") || headers.get("sec-purpose") || "";
  const isPrefetch =
    headers.get("next-router-prefetch") === "1" ||
    /prefetch/i.test(purpose) ||
    url.searchParams.has("_rsc");
  const referer = headers.get("referer");

  return {
    path: url.pathname,
    method: request.method,
    isPrefetch,
    isRsc: Boolean(headers.get("rsc") || url.searchParams.has("_rsc")),
    purpose: purpose || null,
    nextUrl: headers.get("next-url") || null,
    refererPath: safeRefererPath(referer),
    userAgentKind: classifyUserAgent(headers.get("user-agent") || ""),
    country: headers.get("x-vercel-ip-country") || null,
    vercelId: headers.get("x-vercel-id") || null,
    ...summarizeSearchParams(url.searchParams)
  };
}

function inferShape(value: unknown): AuditPayload {
  if (Array.isArray(value)) {
    return { itemCount: value.length };
  }

  if (!value || typeof value !== "object") {
    return {};
  }

  const record = value as Record<string, unknown>;
  const shape: AuditPayload = {};

  for (const key of ["items", "games", "recentGames", "mostWanted", "mostOwned", "mostPlayed"]) {
    const entry = record[key];
    if (Array.isArray(entry)) {
      shape[`${key}Count`] = entry.length;
    }
  }

  if (typeof record.total === "number") {
    shape.total = record.total;
  }

  if (record.pagination && typeof record.pagination === "object") {
    const pagination = record.pagination as Record<string, unknown>;
    for (const key of ["page", "limit", "total", "totalPages"]) {
      if (typeof pagination[key] === "number") {
        shape[`pagination.${key}`] = pagination[key];
      }
    }
  }

  return shape;
}

function safeRefererPath(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.pathname;
  } catch {
    return null;
  }
}

function classifyUserAgent(userAgent: string) {
  const normalized = userAgent.toLowerCase();

  if (!normalized) return "unknown";
  if (/googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot/.test(normalized)) {
    return "bot";
  }
  if (/vercel|uptime|pingdom|datadog|headless|playwright|puppeteer|curl|wget/.test(normalized)) {
    return "monitor";
  }
  if (/mobile|android|iphone|ipad/.test(normalized)) {
    return "mobile";
  }

  return "desktop";
}
