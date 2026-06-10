"use server";

import { completeGameEditorialFieldsWithBedrock, EditorialCompletionError } from "@/lib/ai/completeGameEditorialFieldsWithBedrock";
import { importAmazonProductReview, type AmazonImportResult } from "@/lib/amazon/importAmazonProduct";
import { gameCandidateRepository, gameRepository } from "@/lib/editorialRepositories";
import { buildSafeEditorialPatch } from "@/lib/games/buildSafeEditorialPatch";
import { buildExternalRatingUpdate } from "@/lib/ratings/gameRatings";
import { sanitizeEditorialFields } from "@/lib/import/sanitizeEditorialFields";

export type AmazonImportState = {
  error: string | null;
  result: AmazonImportResult | null;
};

export async function importAmazonAction(_state: AmazonImportState, formData: FormData): Promise<AmazonImportState> {
  try {
    const imported = await importAmazonProductReview({
      sourceId: formData.get("sourceId"),
      amazonInput: formData.get("amazonInput")
    });
    const result = await autoCompleteImportedGameWithAi(imported);

    return {
      error: null,
      result
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo importar desde Amazon.",
      result: null
    };
  }
}

async function autoCompleteImportedGameWithAi(result: AmazonImportResult): Promise<AmazonImportResult> {
  const [game, candidate] = await Promise.all([
    gameRepository.getEditorById(result.gameId),
    gameCandidateRepository.getById(result.candidateId)
  ]);

  if (!game || !candidate) {
    return {
      ...result,
      aiStatus: "failed",
      aiAppliedFields: [],
      aiWarnings: ["No se pudo cargar el contexto necesario para completar la ficha con IA."]
    };
  }

  const ratingUpdate = await buildExternalRatingUpdate(game, {
    title: candidate.title,
    extractedDescription: candidate.extractedDescription,
    metadata: candidate.metadata
  });

  try {
    const completion = await completeGameEditorialFieldsWithBedrock(game, {
      title: candidate.title,
      extractedDescription: candidate.extractedDescription,
      metadata: candidate.metadata
    });
    const sanitizedCompletion = sanitizeEditorialFields(completion);
    const { patch, appliedFields, suggestedTitle } = buildSafeEditorialPatch(game, sanitizedCompletion, {
      mode: "prefer_completion"
    });

    if (appliedFields.length || typeof ratingUpdate.external.score === "number") {
      await gameRepository.update(result.gameId, {
        ...patch,
        ratings: ratingUpdate.ratings,
        createdByAi: true
      });
    }

    return {
      ...result,
      aiStatus: appliedFields.length || typeof ratingUpdate.external.score === "number" ? "applied" : "no_changes",
      aiAppliedFields: appliedFields,
      aiWarnings: [...sanitizedCompletion.warnings, ...ratingUpdate.warnings],
      aiSuggestedTitle: suggestedTitle
    };
  } catch (error) {
    if (error instanceof EditorialCompletionError && error.code === "aws_config") {
      if (typeof ratingUpdate.external.score === "number") {
        await gameRepository.update(result.gameId, {
          ratings: ratingUpdate.ratings,
          createdByAi: true
        });
      }

      return {
        ...result,
        aiStatus: typeof ratingUpdate.external.score === "number" ? "applied" : "unavailable",
        aiAppliedFields: [],
        aiWarnings: ratingUpdate.warnings
      };
    }

    if (typeof ratingUpdate.external.score === "number") {
      await gameRepository.update(result.gameId, {
        ratings: ratingUpdate.ratings,
        createdByAi: true
      });
    }

    return {
      ...result,
      aiStatus: "failed",
      aiAppliedFields: [],
      aiWarnings: [
        ...(error instanceof Error ? [error.message] : ["La IA no pudo completar la ficha tras importar."]),
        ...ratingUpdate.warnings
      ]
    };
  }
}
