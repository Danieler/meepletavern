export type ExternalCallType =
  | "source_search"
  | "product_fetch"
  | "mirror_fetch"
  | "tavily_search"
  | "bedrock_extract"
  | "video_search";

export type ExternalCallMode = "off" | "missing_only" | "always";

export type ExternalCallDiagnostic = {
  type: ExternalCallType;
  sourceName?: string;
  cacheKey?: string;
  cacheHit?: boolean;
  durationMs?: number;
  allowed: boolean;
  reason?: string;
  error?: string;
  timeout?: boolean;
};

export type CacheDiagnostic = {
  key: string;
  hit: boolean;
};

export type ImportExecutionContext = {
  tavilyMode: ExternalCallMode;
  bedrockMode: ExternalCallMode;
  videoSearchMode: ExternalCallMode;
  minQualityWithoutTavily: number;
  diagnostics: ExternalCallDiagnostic[];
  cacheDiagnostics: CacheDiagnostic[];
  recordCall(input: ExternalCallDiagnostic): void;
  canUseExternalCall(type: ExternalCallType, reason: string): boolean;
  withCache<T>(key: string, factory: () => Promise<T>): Promise<T>;
};

export function createImportExecutionContext(): ImportExecutionContext {
  const cache = new Map<string, unknown>();
  const diagnostics: ExternalCallDiagnostic[] = [];
  const cacheDiagnostics: CacheDiagnostic[] = [];

  return {
    tavilyMode: parseMode(process.env.MASTER_IMPORT_TAVILY_MODE, "missing_only"),
    bedrockMode: parseMode(process.env.MASTER_IMPORT_BEDROCK_MODE, "missing_only"),
    videoSearchMode: parseMode(process.env.MASTER_IMPORT_VIDEO_SEARCH_MODE, "off"),
    minQualityWithoutTavily: parsePositiveInt(process.env.MASTER_IMPORT_MIN_QUALITY_WITHOUT_TAVILY, 85),
    diagnostics,
    cacheDiagnostics,
    recordCall(input) {
      diagnostics.push(input);
    },
    canUseExternalCall(type, reason) {
      const mode = modeForCall(this, type);
      const alreadyUsed = type === "tavily_search" && diagnostics.some((entry) => entry.type === "tavily_search" && entry.allowed);
      const allowed = mode === "always" || (mode === "missing_only" && reason.trim().length > 0 && !alreadyUsed);

      if (!allowed) {
        diagnostics.push({
          type,
          allowed: false,
          reason: alreadyUsed ? "Tavily ya se usó una vez en esta importación." : reason || `Modo ${mode}.`
        });
      }

      return allowed;
    },
    async withCache<T>(key: string, factory: () => Promise<T>) {
      if (cache.has(key)) {
        cacheDiagnostics.push({ key, hit: true });
        return cache.get(key) as T;
      }

      cacheDiagnostics.push({ key, hit: false });
      const value = await factory();
      cache.set(key, value);
      return value;
    }
  };
}

export async function runTrackedExternalCall<T>(
  context: ImportExecutionContext | null | undefined,
  input: {
    type: ExternalCallType;
    sourceName?: string;
    reason: string;
    cacheKey?: string;
    timeoutMs?: number;
    requireExplicitAllowance?: boolean;
  },
  factory: () => Promise<T>
): Promise<T> {
  const allowed = input.requireExplicitAllowance ? Boolean(context?.canUseExternalCall(input.type, input.reason)) : true;
  if (!allowed) {
    throw new Error(`${input.type} bloqueado: ${input.reason}`);
  }

  const startedAt = Date.now();
  const execute = () => withTimeout(factory(), input.timeoutMs);

  try {
    const value = input.cacheKey && context
      ? await context.withCache(input.cacheKey, execute)
      : await execute();
    context?.recordCall({
      type: input.type,
      sourceName: input.sourceName,
      cacheKey: input.cacheKey,
      cacheHit: input.cacheKey ? context.cacheDiagnostics.at(-1)?.hit : undefined,
      durationMs: Date.now() - startedAt,
      allowed: true,
      reason: input.reason
    });
    return value;
  } catch (error) {
    context?.recordCall({
      type: input.type,
      sourceName: input.sourceName,
      cacheKey: input.cacheKey,
      durationMs: Date.now() - startedAt,
      allowed: true,
      reason: input.reason,
      timeout: error instanceof Error && /timed out/i.test(error.message),
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

function modeForCall(context: ImportExecutionContext, type: ExternalCallType) {
  if (type === "tavily_search") {
    return context.tavilyMode;
  }

  if (type === "bedrock_extract") {
    return context.bedrockMode;
  }

  if (type === "video_search") {
    return context.videoSearchMode;
  }

  return "always";
}

function parseMode(value: string | undefined, fallback: ExternalCallMode): ExternalCallMode {
  return value === "off" || value === "missing_only" || value === "always" ? value : fallback;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number | undefined) {
  if (!timeoutMs || timeoutMs <= 0) {
    return promise;
  }

  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`External call timed out after ${timeoutMs}ms.`)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
}
