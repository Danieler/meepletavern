import {
  catalogueAgentRequestSchema,
  type CatalogueAgentRequest,
  type CatalogueAgentResult,
  type CatalogueSelectedCandidate
} from "@/lib/catalogueAgent/schemas";
import type { CatalogueAgentRun } from "@/lib/catalogueAgent/catalogueAgent";

export type CatalogueDuplicate = {
  title: string;
  kind: "candidate" | "game";
  reason: string;
};

export type CatalogueDraftPreparation = {
  candidateId: string | null;
  title: string;
  duplicate?: CatalogueDuplicate | null;
  warnings?: string[];
};

export type CatalogueAgentWorkflowDependencies = {
  runAgent(input: CatalogueAgentRequest, options: { signal: AbortSignal }): Promise<CatalogueAgentRun>;
  findDuplicate(candidate: CatalogueSelectedCandidate): Promise<CatalogueDuplicate | null>;
  prepareDraft(input: {
    request: CatalogueAgentRequest;
    candidate: CatalogueSelectedCandidate;
    agentResult: CatalogueAgentResult;
    runId: string;
    signal: AbortSignal;
  }): Promise<CatalogueDraftPreparation>;
};

export type CatalogueAgentWorkflowRun = CatalogueAgentRun & {
  runId: string;
  durationMs: number;
  candidateId: string | null;
};

export async function runCatalogueAgentWorkflow(
  rawInput: unknown,
  deps: CatalogueAgentWorkflowDependencies,
  options: { signal: AbortSignal; runId?: string }
): Promise<CatalogueAgentWorkflowRun> {
  const startedAt = Date.now();
  const input = catalogueAgentRequestSchema.parse(rawInput);
  const runId = options.runId || crypto.randomUUID();
  const agentRun = await deps.runAgent(input, { signal: options.signal });
  let result = agentRun.result;
  let candidateId: string | null = null;

  if (result.status === "candidate_selected" && result.selectedCandidate) {
    const duplicate = await deps.findDuplicate(result.selectedCandidate);

    if (duplicate) {
      result = toDuplicateResult(result, duplicate);
    } else {
      const prepared = await deps.prepareDraft({
        request: input,
        candidate: result.selectedCandidate,
        agentResult: result,
        runId,
        signal: options.signal
      });

      if (prepared.duplicate) {
        result = toDuplicateResult(result, prepared.duplicate);
      } else if (!prepared.candidateId) {
        result = {
          status: "insufficient_evidence",
          reason: prepared.warnings?.[0] || "El pipeline no pudo preparar un borrador revisable.",
          sources: result.sources
        };
      } else {
        candidateId = prepared.candidateId;
        result = {
          ...result,
          selectedCandidate: {
            ...result.selectedCandidate,
            title: prepared.title
          },
          reason: prepared.warnings?.[0]
            ? `No se encontró ningún duplicado. ${prepared.warnings[0]}`
            : "No se encontró ningún duplicado. El importador maestro creó un Candidate con aiDraft para revisión."
        };
      }
    }
  }

  return {
    ...agentRun,
    runId,
    result,
    candidateId,
    durationMs: Date.now() - startedAt
  };
}

function toDuplicateResult(result: CatalogueAgentResult, duplicate: CatalogueDuplicate): CatalogueAgentResult {
  return {
    status: "possible_duplicate",
    selectedCandidate: result.selectedCandidate,
    reason: `${duplicate.reason} Coincidencia: ${duplicate.title}.`,
    sources: result.sources
  };
}
