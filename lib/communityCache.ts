import { revalidateTag } from "next/cache";

export const TAVERN_ACTIVITY_CACHE_TAG = "tavern-activity";
export const COMMUNITY_FEED_CACHE_TAG = "community-feed";
export const COMMUNITY_OVERVIEW_CACHE_TAG = "community-overview";
export const COMMUNITY_NOW_CACHE_TAG = "community-now";
export const COMMUNITY_PROFILES_CACHE_TAG = "community-profiles";
export const COMMUNITY_GAME_SUMMARY_CACHE_TAG = "community-game-summary";

export function revalidateCommunityActivityCaches() {
  revalidateTag(COMMUNITY_FEED_CACHE_TAG);
  revalidateTag(COMMUNITY_OVERVIEW_CACHE_TAG);
  revalidateTag(COMMUNITY_NOW_CACHE_TAG);
  revalidateTag(COMMUNITY_PROFILES_CACHE_TAG);
  revalidateTag(COMMUNITY_GAME_SUMMARY_CACHE_TAG);
}

export function revalidateCommunityFeedCaches() {
  revalidateTag(COMMUNITY_FEED_CACHE_TAG);
}

export function revalidateCommunityProfileCaches() {
  revalidateTag(COMMUNITY_FEED_CACHE_TAG);
  revalidateTag(COMMUNITY_OVERVIEW_CACHE_TAG);
  revalidateTag(COMMUNITY_NOW_CACHE_TAG);
  revalidateTag(COMMUNITY_PROFILES_CACHE_TAG);
  revalidateTag(COMMUNITY_GAME_SUMMARY_CACHE_TAG);
}

export function revalidateCommunityRatingCaches() {
  revalidateTag(COMMUNITY_FEED_CACHE_TAG);
  revalidateTag(COMMUNITY_NOW_CACHE_TAG);
  revalidateTag(COMMUNITY_GAME_SUMMARY_CACHE_TAG);
}
