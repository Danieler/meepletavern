export const CATALOGUE_AGENT_EXTERNAL_CALLS_ENV = "CATALOGUE_AGENT_EXTERNAL_CALLS_ENABLED";

export function catalogueAgentExternalCallsEnabled() {
  return process.env[CATALOGUE_AGENT_EXTERNAL_CALLS_ENV] === "true";
}

export function assertCatalogueAgentExternalCallsEnabled() {
  if (!catalogueAgentExternalCallsEnabled()) {
    throw new CatalogueAgentExternalCallsDisabledError();
  }
}

export class CatalogueAgentExternalCallsDisabledError extends Error {
  constructor() {
    super("Las llamadas externas del agente de catálogo están deshabilitadas.");
    this.name = "CatalogueAgentExternalCallsDisabledError";
  }
}

