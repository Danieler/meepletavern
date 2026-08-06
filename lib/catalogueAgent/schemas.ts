import { z } from "zod";
import { CANONICAL_CATEGORIES, CANONICAL_MECHANICS } from "@/lib/taxonomy";

export const catalogueAgentRequestSchema = z
  .object({
    action: z.literal("add_new_game"),
    category: z.enum(CANONICAL_CATEGORIES).nullable(),
    mechanic: z.enum(CANONICAL_MECHANICS).nullable()
  })
  .superRefine((value, context) => {
    if (!value.category && !value.mechanic) {
      context.addIssue({
        code: "custom",
        path: ["category"],
        message: "Selecciona al menos una categoría o una mecánica."
      });
    }
  });

export const catalogueSelectedCandidateSchema = z.object({
  title: z.string().trim().min(1).max(180),
  sourceUrl: z.string().url().optional(),
  providerId: z.string().trim().min(1).max(180).optional()
});

export const catalogueAgentResultSchema = z
  .object({
    status: z.enum([
      "candidate_selected",
      "possible_duplicate",
      "insufficient_evidence",
      "limit_reached"
    ]),
    selectedCandidate: catalogueSelectedCandidateSchema.optional(),
    reason: z.string().trim().min(1).max(800),
    sources: z.array(z.string().url()).max(12)
  })
  .superRefine((value, context) => {
    if (value.status === "candidate_selected" && !value.selectedCandidate) {
      context.addIssue({
        code: "custom",
        path: ["selectedCandidate"],
        message: "candidate_selected requiere un candidato."
      });
    }
  });

export const catalogueAgentDisabledResultSchema = z.object({
  status: z.literal("external_calls_disabled"),
  reason: z.string(),
  sources: z.array(z.string().url()),
  candidateId: z.null()
});

export const catalogueAgentDiagnosticsSchema = z.object({
  runId: z.string().uuid(),
  modelCalls: z.number().int().min(0).max(4),
  tavilySearches: z.number().int().min(0).max(2),
  durationMs: z.number().int().min(0)
});

export const catalogueAgentApiResultSchema = z.union([
  catalogueAgentResultSchema.extend({
    candidateId: z.string().min(1).nullable(),
    diagnostics: catalogueAgentDiagnosticsSchema.optional()
  }),
  catalogueAgentDisabledResultSchema
]);

export type CatalogueAgentRequest = z.infer<typeof catalogueAgentRequestSchema>;
export type CatalogueSelectedCandidate = z.infer<typeof catalogueSelectedCandidateSchema>;
export type CatalogueAgentResult = z.infer<typeof catalogueAgentResultSchema>;
export type CatalogueAgentApiResult = z.infer<typeof catalogueAgentApiResultSchema>;
