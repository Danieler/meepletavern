export type CatalogueAgentFailureStage = "setup" | "nova" | "tavily" | "import" | "workflow";

export type CatalogueAgentFailureDiagnostics = {
  runId: string;
  stage: CatalogueAgentFailureStage;
  modelCalls: number;
  tavilySearches: number;
};

export class CatalogueAgentRunError extends Error {
  readonly diagnostics: CatalogueAgentFailureDiagnostics;
  readonly publicMessage: string;
  readonly technicalDetail: string;

  constructor(input: {
    cause: unknown;
    diagnostics: CatalogueAgentFailureDiagnostics;
  }) {
    const publicMessage = catalogueAgentPublicFailureMessage(input.diagnostics.stage, input.cause);
    super(publicMessage, { cause: input.cause });
    this.name = "CatalogueAgentRunError";
    this.publicMessage = publicMessage;
    this.technicalDetail = catalogueAgentSafeTechnicalDetail(input.cause);
    this.diagnostics = input.diagnostics;
  }
}

export function catalogueAgentSafeTechnicalDetail(error: unknown) {
  if (!(error instanceof Error)) {
    return "UnknownError";
  }

  const message = error.message
    .replace(/Bearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(/\btvly-[A-Za-z0-9_-]+\b/g, "[redacted]")
    .replace(/([?&](?:api_?key|token|signature)=)[^&\s]+/gi, "$1[redacted]")
    .replace(/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, "[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);

  return message ? `${error.name}: ${message}` : error.name;
}

export function catalogueAgentPublicFailureMessage(
  stage: CatalogueAgentFailureStage,
  error: unknown
) {
  if (error instanceof Error && error.name === "TimeoutError") {
    return "El agente superó el tiempo máximo permitido.";
  }

  if (error instanceof Error && error.name === "CatalogueAgentOutputError") {
    return error.message;
  }

  if (error instanceof Error && /^Falta la configuración [A-Z0-9_]+/.test(error.message)) {
    return error.message;
  }

  switch (stage) {
    case "nova":
      return "Amazon Nova no pudo completar la selección del juego. Puedes volver a intentarlo sin riesgo de crear un duplicado.";
    case "tavily":
      return "Tavily no pudo completar la búsqueda de candidatos. Puedes volver a intentarlo.";
    case "import":
      return "El agente encontró un juego, pero el importador no pudo preparar su ficha revisable.";
    case "setup":
      return "No se pudo iniciar el agente porque falta parte de su configuración.";
    default:
      return "El flujo del agente no pudo completarse.";
  }
}
