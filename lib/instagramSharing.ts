import { siteConfig } from "@/lib/site";

const INSTAGRAM_CAPTION_MAX_LENGTH = 2200;

export const DEFAULT_REVIEW_INSTAGRAM_HASHTAGS = [
  "#MeepleTavern",
  "#JuegosDeMesa",
  "#ResenasJuegosDeMesa",
  "#BoardGames",
  "#JuegosDeMesaEspana"
] as const;

type ReviewInstagramCaptionInput = {
  authorName: string;
  gameTitle: string;
  rating: number;
  reviewTitle: string;
  summary: string;
  hashtags?: string | null;
};

export function buildInstagramHubUrl(siteUrl = siteConfig.url) {
  return buildTrackedUrl(`${cleanSiteUrl(siteUrl)}/instagram`, {
    utm_source: "instagram",
    utm_medium: "social",
    utm_campaign: "link_in_bio"
  });
}

export function buildInstagramReviewUrl(reviewSlug: string, siteUrl = siteConfig.url, content = "caption") {
  return buildTrackedUrl(`${cleanSiteUrl(siteUrl)}/resenas/${reviewSlug}`, {
    utm_source: "instagram",
    utm_medium: "social",
    utm_campaign: "review",
    utm_content: content
  });
}

export function buildInstagramReviewHref(reviewSlug: string, content = "review_card") {
  const params = new URLSearchParams({
    utm_source: "instagram",
    utm_medium: "social",
    utm_campaign: "link_in_bio",
    utm_content: content
  });

  return `/resenas/${reviewSlug}?${params.toString()}`;
}

export function buildReviewInstagramCaption(input: ReviewInstagramCaptionInput) {
  const hashtags = normalizeInstagramHashtags(input.hashtags, [input.gameTitle]);
  const hashtagBlock = hashtags.join(" ");
  const summary = clampText(input.summary, 560);

  const caption = [
    `Nueva reseña en MeepleTavern: ${input.gameTitle}`,
    input.reviewTitle,
    `Por ${input.authorName}`,
    "",
    "Veredicto rápido:",
    summary,
    "",
    `Nota MeepleTavern: ${formatRating(input.rating)}/10`,
    "",
    "Lee la reseña completa, la ficha del juego y más recomendaciones en MeepleTavern.",
    "",
    hashtagBlock,
    "",
    "Link in bio."
  ].join("\n");

  if (caption.length <= INSTAGRAM_CAPTION_MAX_LENGTH) {
    return caption;
  }

  const availableSummaryLength =
    INSTAGRAM_CAPTION_MAX_LENGTH - caption.length + summary.length - 24;

  return [
    `Nueva reseña en MeepleTavern: ${input.gameTitle}`,
    input.reviewTitle,
    `Por ${input.authorName}`,
    "",
    "Veredicto rápido:",
    clampText(input.summary, Math.max(180, availableSummaryLength)),
    "",
    `Nota MeepleTavern: ${formatRating(input.rating)}/10`,
    "",
    "Lee la reseña completa, la ficha del juego y más recomendaciones en MeepleTavern.",
    "",
    hashtagBlock,
    "",
    "Link in bio."
  ].join("\n").slice(0, INSTAGRAM_CAPTION_MAX_LENGTH);
}

export function normalizeInstagramHashtags(value?: string | null, contextualTerms: string[] = []) {
  const customTags = splitHashtagInput(value)
    .map(toInstagramHashtag)
    .filter((tag): tag is string => Boolean(tag));

  const contextualTags = contextualTerms
    .map(toContextualHashtag)
    .filter((tag): tag is string => Boolean(tag));

  return uniqueTags([
    ...customTags,
    ...DEFAULT_REVIEW_INSTAGRAM_HASHTAGS,
    ...contextualTags
  ]).slice(0, 20);
}

function buildTrackedUrl(rawUrl: string, params: Record<string, string>) {
  const url = new URL(rawUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function cleanSiteUrl(siteUrl: string) {
  return (siteUrl || "https://meepletavern.com").replace(/\/+$/, "");
}

function splitHashtagInput(value?: string | null) {
  return (value || "")
    .split(/[\s,;]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function toInstagramHashtag(value: string) {
  const withoutHash = value.replace(/^#+/, "");
  const token = withoutHash.replace(/[^\p{L}\p{N}_]/gu, "");
  return token ? `#${token.slice(0, 60)}` : null;
}

function toContextualHashtag(value: string) {
  const token = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  return token ? `#${token.slice(0, 60)}` : null;
}

function uniqueTags(tags: string[]) {
  const seen = new Set<string>();
  return tags.filter((tag) => {
    const key = tag.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function clampText(value: string, maxLength: number) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function formatRating(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
