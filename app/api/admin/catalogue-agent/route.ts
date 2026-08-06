import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { z } from "zod";
import {
  AdminApiSecurityError,
  assertTrustedAdminApiRequest,
  jsonNoStore
} from "@/lib/adminApiSecurity";
import {
  catalogueAgentExternalCallsEnabled
} from "@/lib/catalogueAgent/config";
import { CatalogueAgentRunError } from "@/lib/catalogueAgent/errors";
import {
  catalogueAgentApiResultSchema,
  catalogueAgentRequestSchema,
  type CatalogueAgentRequest,
  type CatalogueAgentApiResult
} from "@/lib/catalogueAgent/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const activeRequests = new Map<string, Promise<CatalogueAgentApiResult>>();

export async function POST(request: NextRequest) {
  try {
    // Middleware authenticates /api/admin/*; this adds the existing same-origin JSON guard.
    assertTrustedAdminApiRequest(request, { requireJson: true });
  } catch (error) {
    if (error instanceof AdminApiSecurityError) {
      return jsonNoStore({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  let input: CatalogueAgentRequest;
  try {
    input = catalogueAgentRequestSchema.parse(await request.json());
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message || "La petición no es válida."
      : "El cuerpo debe ser JSON válido.";
    return jsonNoStore({ error: message }, { status: 400 });
  }

  // This gate deliberately runs before importing any Bedrock, Tavily or agent runtime module.
  if (!catalogueAgentExternalCallsEnabled()) {
    return jsonNoStore({
      status: "external_calls_disabled",
      reason: "Las llamadas externas del agente están deshabilitadas. Activa explícitamente CATALOGUE_AGENT_EXTERNAL_CALLS_ENABLED=true para usarlo.",
      sources: [],
      candidateId: null
    } satisfies CatalogueAgentApiResult);
  }

  const key = `${input.action}:${input.category || "*"}:${input.mechanic || "*"}`;
  const existing = activeRequests.get(key);
  const run = existing || startRequest(input, key);

  try {
    const result = await run;
    if (result.candidateId) {
      try {
        revalidatePath("/admin/candidates");
      } catch (error) {
        console.warn("[catalogue-agent] candidate revalidation failed", {
          runId: result.diagnostics?.runId,
          error: error instanceof Error ? error.name : "UnknownError"
        });
      }
    }
    return jsonNoStore(catalogueAgentApiResultSchema.parse(result));
  } catch (error) {
    if (error instanceof CatalogueAgentRunError) {
      return jsonNoStore({
        error: error.publicMessage,
        detail: error.technicalDetail,
        diagnostics: error.diagnostics
      }, { status: 502 });
    }

    if (error instanceof z.ZodError) {
      return jsonNoStore({ error: "El agente devolvió un resultado que no supera la validación." }, { status: 502 });
    }

    const message = error instanceof Error && error.name === "TimeoutError"
      ? "El agente superó el tiempo máximo permitido."
      : error instanceof Error && error.name === "CatalogueAgentOutputError"
        ? error.message
        : "No se pudo preparar el borrador. Revisa la configuración y vuelve a intentarlo.";
    return jsonNoStore({ error: message }, { status: 502 });
  }
}

function startRequest(input: CatalogueAgentRequest, key: string) {
  const promise = import("@/lib/catalogueAgent/runtime")
    .then(({ runCatalogueAgentRequest }) => runCatalogueAgentRequest(input))
    .then((run) => ({
      ...run.result,
      candidateId: run.candidateId,
      diagnostics: run.diagnostics
    } satisfies CatalogueAgentApiResult))
    .finally(() => {
      if (activeRequests.get(key) === promise) {
        activeRequests.delete(key);
      }
    });
  activeRequests.set(key, promise);
  return promise;
}
