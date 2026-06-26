import { prisma } from "./prisma";
import { ProfileVisibility } from "@prisma/client";

export const compatibilityCache = new Map<string, { data: unknown; expiresAt: number }>();

export interface UserGameInput {
  gameId: string;
  owned: boolean;
  wantToPlay: boolean;
  played: boolean;
  game: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    categories: string[];
    mechanics: string[];
    complexity: string | null;
    difficulty: string | null;
  };
}

export interface CompatibilityMatch {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  score: number; // 0 to 100
  confidence: "low" | "medium" | "high";
  sharedMechanics: string[];
  sharedCategories: string[];
  suggestedGames: Array<{
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    reason: string;
  }>;
}

// Map complexity label to a numeric rank
function getComplexityRank(value: string | null): number {
  const normalized = value?.toLowerCase() || "";
  if (normalized.includes("alta") || normalized.includes("duro") || normalized.includes("pesad")) {
    return 3;
  }
  if (normalized.includes("media ligera") || normalized.includes("ligera") || normalized.includes("baja") || normalized.includes("facil") || normalized.includes("fácil")) {
    return 1;
  }
  if (normalized.includes("media")) {
    return 2;
  }
  return 0;
}

// Compute cosine similarity between two frequency vectors
function computeVectorCosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): number {
  if (vecA.size === 0 || vecB.size === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const [key, val] of vecA.entries()) {
    normA += val * val;
    const valB = vecB.get(key) || 0;
    dotProduct += val * valB;
  }

  for (const val of vecB.values()) {
    normB += val * val;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculates user compatibility scores against a filtered set of candidates.
 * Cap candidates to preserve performance.
 */
export async function getCompatibilityMatches(
  currentUserId: string | null,
  userAGames: UserGameInput[]
): Promise<CompatibilityMatch[]> {
  if (userAGames.length === 0) {
    return [];
  }

  const gameIds = userAGames.map((g) => g.gameId);

  // 1. Pre-filter candidates: find users who have at least one of these games, or public profiles
  // We prioritize users who share games, then fill up to 50 candidates using other public active users.
  const sharedGameUsers = await prisma.userLibraryGame.findMany({
    where: {
      gameId: { in: gameIds },
      ...(currentUserId ? { userId: { not: currentUserId } } : {}),
      user: {
        profile: {
          profileVisibility: ProfileVisibility.PUBLIC
        }
      }
    },
    select: { userId: true },
    distinct: ["userId"],
    take: 50
  });

  const candidateIds = new Set<string>(sharedGameUsers.map((u) => u.userId));

  // If we don't have enough candidates, find more public users who have library entries
  if (candidateIds.size < 50) {
    const extraUsers = await prisma.userLibraryGame.findMany({
      where: {
        userId: {
          notIn: [currentUserId, ...Array.from(candidateIds)].filter(Boolean) as string[]
        },
        user: {
          profile: {
            profileVisibility: ProfileVisibility.PUBLIC
          }
        }
      },
      select: { userId: true },
      distinct: ["userId"],
      take: 50 - candidateIds.size
    });
    extraUsers.forEach((u) => candidateIds.add(u.userId));
  }

  if (candidateIds.size === 0) {
    return [];
  }

  // 2. Fetch the entire library details for these candidate users
  const candidatesLibrary = await prisma.userLibraryGame.findMany({
    where: {
      userId: { in: Array.from(candidateIds) }
    },
    include: {
      user: {
        include: {
          profile: true
        }
      },
      game: {
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          categories: true,
          mechanics: true,
          complexity: true,
          difficulty: true
        }
      }
    }
  });

  // Group library items by candidate userId
  const candidateLibrariesMap = new Map<string, typeof candidatesLibrary>();
  for (const item of candidatesLibrary) {
    if (!candidateLibrariesMap.has(item.userId)) {
      candidateLibrariesMap.set(item.userId, []);
    }
    candidateLibrariesMap.get(item.userId)!.push(item);
  }

  // Pre-calculate user A vectors
  const userAGameIds = new Set(userAGames.map((g) => g.gameId));
  const userAMechanics = new Map<string, number>();
  const userACategories = new Map<string, number>();
  let userAComplexitySum = 0;
  let userAComplexityCount = 0;

  for (const item of userAGames) {
    const weight = item.owned ? 2 : 1; // slightly higher weight for owned games
    item.game.mechanics.forEach((m) => {
      userAMechanics.set(m, (userAMechanics.get(m) || 0) + weight);
    });
    item.game.categories.forEach((c) => {
      userACategories.set(c, (userACategories.get(c) || 0) + weight);
    });
    const rank = getComplexityRank(item.game.complexity || item.game.difficulty);
    if (rank > 0) {
      userAComplexitySum += rank;
      userAComplexityCount++;
    }
  }

  const userAAvgComplexity = userAComplexityCount > 0 ? userAComplexitySum / userAComplexityCount : null;

  // 3. Compute scores for each candidate
  const matches: CompatibilityMatch[] = [];

  for (const [candidateId, candidateLib] of candidateLibrariesMap.entries()) {
    if (candidateLib.length === 0) continue;

    // Retrieve user and profile info (they will be identical across all lib items of this user)
    const firstItem = candidateLib[0];
    const userProfile = firstItem.user.profile;
    if (!userProfile) continue; // Skip if no profile exists

    const userBGamesMap = new Map<string, typeof candidateLib[0]>();
    const userBMechanics = new Map<string, number>();
    const userBCategories = new Map<string, number>();
    let userBComplexitySum = 0;
    let userBComplexityCount = 0;

    for (const item of candidateLib) {
      userBGamesMap.set(item.gameId, item);
      const weight = item.owned ? 2 : 1;
      item.game.mechanics.forEach((m) => {
        userBMechanics.set(m, (userBMechanics.get(m) || 0) + weight);
      });
      item.game.categories.forEach((c) => {
        userBCategories.set(c, (userBCategories.get(c) || 0) + weight);
      });
      const rank = getComplexityRank(item.game.complexity || item.game.difficulty);
      if (rank > 0) {
        userBComplexitySum += rank;
        userBComplexityCount++;
      }
    }

    const userBAvgComplexity = userBComplexityCount > 0 ? userBComplexitySum / userBComplexityCount : null;

    // --- Component A: Games overlap (45%) ---
    // Count common games
    let sharedCount = 0;
    for (const gId of userAGameIds) {
      if (userBGamesMap.has(gId)) {
        sharedCount++;
      }
    }
    // Calculate overlap score
    // Weight overlap heavily based on user A's library, but penalize empty/unmatched libraries
    const overlapA = userAGames.length > 0 ? sharedCount / userAGames.length : 0;
    const overlapB = candidateLib.length > 0 ? sharedCount / candidateLib.length : 0;
    const gamesScore = (overlapA * 0.8) + (overlapB * 0.2);

    // --- Component B: Mechanics similarity (30%) ---
    const mechanicsScore = computeVectorCosineSimilarity(userAMechanics, userBMechanics);

    // --- Component C: Categories similarity (20%) ---
    const categoriesScore = computeVectorCosineSimilarity(userACategories, userBCategories);

    // --- Component D: Complexity similarity (5%) ---
    let complexityScore = 1.0;
    if (userAAvgComplexity !== null && userBAvgComplexity !== null) {
      const diff = Math.abs(userAAvgComplexity - userBAvgComplexity);
      complexityScore = Math.max(0, 1 - diff / 3);
    }

    // --- Overall Score Calculation ---
    const rawScore =
      (gamesScore * 0.45) +
      (mechanicsScore * 0.30) +
      (categoriesScore * 0.20) +
      (complexityScore * 0.05);

    const finalScore = Math.round(rawScore * 100);

    // --- Confidence Level ---
    // Low if either user has < 3 games, medium if either < 8, high otherwise
    const minLibrarySize = Math.min(userAGames.length, candidateLib.length);
    let confidence: "low" | "medium" | "high" = "high";
    if (minLibrarySize < 3) {
      confidence = "low";
    } else if (minLibrarySize < 8) {
      confidence = "medium";
    }

    // --- Identify shared mechanics and categories (for UI highlights) ---
    const sharedMechanics = Array.from(userAMechanics.keys())
      .filter((m) => userBMechanics.has(m))
      .slice(0, 3); // limit to top 3

    const sharedCategories = Array.from(userACategories.keys())
      .filter((c) => userBCategories.has(c))
      .slice(0, 3); // limit to top 3

    // --- Actionable suggestions ("A qué podéis jugar juntos") ---
    const suggestedGamesCandidates: Array<{
      id: string;
      name: string;
      slug: string;
      imageUrl: string | null;
      reason: string;
      priority: number;
    }> = [];

    // Scan all games in the union of both libraries to suggest playing options
    const allGameIds = new Set([...Array.from(userAGameIds), ...Array.from(userBGamesMap.keys())]);

    for (const gId of allGameIds) {
      const gameA = userAGames.find((g) => g.gameId === gId);
      const gameB = userBGamesMap.get(gId);

      if (!gameA || !gameB) {
        // One-sided: check if User A wants to play and User B owns, or vice versa
        if (gameA && gameA.wantToPlay && gameB?.owned) {
          suggestedGamesCandidates.push({
            id: gameA.game.id,
            name: gameA.game.name,
            slug: gameA.game.slug,
            imageUrl: gameA.game.imageUrl,
            reason: `Lo tiene ${userProfile.displayName || userProfile.username}, tú quieres jugarlo`,
            priority: 2
          });
        } else if (gameB && gameB.wantToPlay && gameA?.owned) {
          suggestedGamesCandidates.push({
            id: gameB.game.id,
            name: gameB.game.name,
            slug: gameB.game.slug,
            imageUrl: gameB.game.imageUrl,
            reason: `Lo tienes tú, quiere jugarlo`,
            priority: 2
          });
        }
        continue;
      }

      // Both have the game in library
      if (gameA.owned && gameB.owned) {
        suggestedGamesCandidates.push({
          id: gameA.game.id,
          name: gameA.game.name,
          slug: gameA.game.slug,
          imageUrl: gameA.game.imageUrl,
          reason: "Lo tenéis los dos",
          priority: 1
        });
      } else if (gameA.wantToPlay && gameB.wantToPlay) {
        suggestedGamesCandidates.push({
          id: gameA.game.id,
          name: gameA.game.name,
          slug: gameA.game.slug,
          imageUrl: gameA.game.imageUrl,
          reason: "Pendiente común (ambos queréis jugarlo)",
          priority: 3
        });
      } else if (gameA.owned && gameB.played) {
        suggestedGamesCandidates.push({
          id: gameA.game.id,
          name: gameA.game.name,
          slug: gameA.game.slug,
          imageUrl: gameA.game.imageUrl,
          reason: `Lo tienes tú, ya lo ha jugado`,
          priority: 4
        });
      } else if (gameB.owned && gameA.played) {
        suggestedGamesCandidates.push({
          id: gameA.game.id,
          name: gameA.game.name,
          slug: gameA.game.slug,
          imageUrl: gameA.game.imageUrl,
          reason: `Lo tiene, ya lo has jugado`,
          priority: 4
        });
      } else if (gameA.played && gameB.played) {
        suggestedGamesCandidates.push({
          id: gameA.game.id,
          name: gameA.game.name,
          slug: gameA.game.slug,
          imageUrl: gameA.game.imageUrl,
          reason: "Lo habéis jugado ambos",
          priority: 5
        });
      }
    }

    // Sort suggestions by priority (ascending order) and slice to top 3
    const suggestedGames = suggestedGamesCandidates
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3)
      .map(({ id, name, slug, imageUrl, reason }) => ({ id, name, slug, imageUrl, reason }));

    // Fallback: if no suggested games found, recommend one of user A's input games that fits B's tastes
    if (suggestedGames.length === 0 && userAGames.length > 0) {
      for (const gameA of userAGames) {
        const hasMatchingCategory = gameA.game.categories.some(cat => userBCategories.has(cat));
        const hasMatchingMechanic = gameA.game.mechanics.some(mec => userBMechanics.has(mec));
        
        if (hasMatchingCategory || hasMatchingMechanic) {
          suggestedGames.push({
            id: gameA.game.id,
            name: gameA.game.name,
            slug: gameA.game.slug,
            imageUrl: gameA.game.imageUrl,
            reason: hasMatchingCategory 
              ? "Te gusta este juego y encaja en sus categorías" 
              : "Te gusta este juego y comparte mecánicas con su ludoteca"
          });
        }
        if (suggestedGames.length >= 2) break;
      }
      
      // If still empty, suggest the first user A game
      if (suggestedGames.length === 0) {
        const gameA = userAGames[0];
        suggestedGames.push({
          id: gameA.game.id,
          name: gameA.game.name,
          slug: gameA.game.slug,
          imageUrl: gameA.game.imageUrl,
          reason: "Compatible por afinidad general de mesa"
        });
      }
    }

    matches.push({
      userId: candidateId,
      username: userProfile.username,
      displayName: userProfile.displayName,
      avatarUrl: userProfile.avatarUrl,
      score: finalScore,
      confidence,
      sharedMechanics,
      sharedCategories,
      suggestedGames
    });
  }

  // Sort matches by compatibility score descending
  return matches.sort((a, b) => b.score - a.score);
}
