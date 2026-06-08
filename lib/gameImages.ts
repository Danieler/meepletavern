export const gameImageStatuses = ["verified", "missing", "placeholder", "needs_review"] as const;

export type GameImageStatus = (typeof gameImageStatuses)[number];

export type GameImageFields = {
  coverImageUrl: string | null;
  coverImageAlt: string;
  imageSourceName?: string | null;
  imageSourceUrl?: string | null;
  imageLicenseNote?: string | null;
  imageStatus: GameImageStatus;
};

export function hasVerifiedCoverImage(image: GameImageFields) {
  return image.imageStatus === "verified" && Boolean(image.coverImageUrl);
}

export function getGameCoverAlt(image: GameImageFields, gameTitle: string) {
  const alt = image.coverImageAlt.trim();
  return alt || `Portada de ${gameTitle}`;
}

export function normalizeImageStatus(value: unknown): GameImageStatus {
  return gameImageStatuses.includes(value as GameImageStatus) ? (value as GameImageStatus) : "missing";
}

// Future automation may store cover candidates, but only reviewed records should set imageStatus to "verified".
export function isReviewedCoverCandidate(image: GameImageFields) {
  return image.imageStatus === "verified" && Boolean(image.coverImageUrl) && Boolean(image.coverImageAlt.trim());
}
