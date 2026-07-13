import { GameStatus, ProfileVisibility } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { TAVERN_ACTIVITY_CACHE_TAG } from "@/lib/activity/events";
import { auditDataSource } from "@/lib/egressAudit";
import { prisma } from "@/lib/prisma";
import { PUBLIC_GAMES_LIST_TAG, PUBLIC_REVIEWS_TAG } from "@/lib/publicGameCache";

export type PublicSiteStats = {
  publishedGames: number;
  approvedReviews: number;
  publicProfiles: number;
};

const PUBLIC_SITE_STATS_REVALIDATE_SECONDS = 3600;

const getCachedPublicSiteStats = unstable_cache(
  async function getCachedPublicSiteStats(): Promise<PublicSiteStats> {
    const [publishedGames, approvedReviews, publicProfiles] = await Promise.all([
      prisma.game.count({ where: { status: GameStatus.published } }),
      prisma.review.count({ where: { isApproved: true } }),
      prisma.userProfile.count({
        where: { profileVisibility: ProfileVisibility.PUBLIC }
      })
    ]);

    return auditDataSource("publicSiteStats.counts.db", {
      publishedGames,
      approvedReviews,
      publicProfiles
    });
  },
  ["public-site-stats-v3"],
  {
    revalidate: PUBLIC_SITE_STATS_REVALIDATE_SECONDS,
    tags: [PUBLIC_GAMES_LIST_TAG, PUBLIC_REVIEWS_TAG, TAVERN_ACTIVITY_CACHE_TAG]
  }
);

export function getPublicSiteStats() {
  return getCachedPublicSiteStats();
}
