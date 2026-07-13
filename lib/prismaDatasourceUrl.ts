const DEFAULT_CONNECTION_LIMIT = 5;
const DEFAULT_POOL_TIMEOUT_SECONDS = 30;
const DEFAULT_CONNECT_TIMEOUT_SECONDS = 10;

type RuntimeDatasourceOptions = {
  nodeEnv?: string;
  databaseUrl?: string;
  directUrl?: string;
  connectionLimit?: string;
};

export function getRuntimeDatasourceUrl({
  nodeEnv = process.env.NODE_ENV,
  databaseUrl = process.env.DATABASE_URL,
  directUrl = process.env.DIRECT_URL,
  connectionLimit = process.env.PRISMA_CONNECTION_LIMIT
}: RuntimeDatasourceOptions = {}) {
  // A single long-lived Next dev server does not need the transaction pooler.
  // Using DIRECT_URL there avoids intermittent local exhaustion on port 6543.
  const source = nodeEnv === "development" && directUrl ? directUrl : databaseUrl;
  if (!source) return undefined;

  try {
    const url = new URL(source);
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", String(normalizeConnectionLimit(connectionLimit)));
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", String(DEFAULT_POOL_TIMEOUT_SECONDS));
    }
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", String(DEFAULT_CONNECT_TIMEOUT_SECONDS));
    }
    return url.toString();
  } catch {
    return source;
  }
}

function normalizeConnectionLimit(value?: string) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 20
    ? parsed
    : DEFAULT_CONNECTION_LIMIT;
}
