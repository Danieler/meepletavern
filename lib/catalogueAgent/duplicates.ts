import { GameCandidateStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assessBaseGameTitleMatch, canonicalGameTitleKey } from "@/lib/import/titleMatching";
import type { CatalogueSelectedCandidate } from "@/lib/catalogueAgent/schemas";
import type { CatalogueDuplicate } from "@/lib/catalogueAgent/workflow";

export async function findCatalogueDuplicate(candidate: CatalogueSelectedCandidate): Promise<CatalogueDuplicate | null> {
  const [games, candidates] = await Promise.all([
    prisma.game.findMany({
      select: { id: true, title: true, name: true }
    }),
    prisma.gameCandidate.findMany({
      where: { status: { not: GameCandidateStatus.rejected } },
      select: { id: true, title: true, sourceUrl: true, metadata: true }
    })
  ]);
  for (const game of games) {
    const title = game.title || game.name;
    if (catalogueTitlesAreDuplicates(title, candidate.title)) {
      return {
        title,
        kind: "game",
        reason: "La comprobación determinista encontró el juego en el catálogo."
      };
    }
  }

  for (const existing of candidates) {
    const sameSource = Boolean(candidate.sourceUrl && existing.sourceUrl === candidate.sourceUrl);
    const sameProvider = Boolean(
      candidate.providerId && readCatalogueProviderId(existing.metadata) === candidate.providerId
    );
    if (sameSource || sameProvider || catalogueTitlesAreDuplicates(existing.title, candidate.title)) {
      return {
        title: existing.title,
        kind: "candidate",
        reason: "La comprobación determinista encontró un Candidate equivalente."
      };
    }
  }

  return null;
}

export function catalogueTitlesAreDuplicates(existingTitle: string, selectedTitle: string) {
  const existingKey = canonicalGameTitleKey(existingTitle);
  const selectedKey = canonicalGameTitleKey(selectedTitle);

  if (!existingKey || !selectedKey) {
    return false;
  }

  return existingKey === selectedKey || assessBaseGameTitleMatch(existingTitle, selectedTitle).matched;
}

function readCatalogueProviderId(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const catalogueAgent = (metadata as Record<string, unknown>).catalogueAgent;
  if (!catalogueAgent || typeof catalogueAgent !== "object" || Array.isArray(catalogueAgent)) {
    return null;
  }

  const providerId = (catalogueAgent as Record<string, unknown>).providerId;
  return typeof providerId === "string" ? providerId : null;
}
