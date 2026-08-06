import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PUBLIC_REVIEWS_TAG } from "@/lib/publicGameCache";
import { getSafePublicDisplayName } from "@/lib/publicIdentity";
import { getEffectiveReviewRating, normalizeReviewRatingValue } from "@/lib/reviewRating";
import { validateReviewContent } from "@/lib/reviewContent";
import { slugify } from "@/lib/slug";

export type ReviewPayload = {
  gameId: string;
  userId?: string | null;
  authorName: string;
  title: string;
  summary: string;
  body: string;
  rating?: number | null;
  isApproved?: boolean;
  instagramHashtags?: string | null;
  createdByAdmin?: boolean;
};

const publicReviewListSelect = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  rating: true,
  authorName: true,
  publishedAt: true,
  game: {
    select: {
      slug: true,
      title: true,
      name: true,
      coverImageUrl: true,
      imageUrl: true,
      coverImageAlt: true,
      imageStatus: true,
      ratings: true
    }
  },
  user: {
    select: {
      profile: {
        select: {
          username: true
        }
      }
    }
  }
} as const;

const publicReviewSelect = {
  ...publicReviewListSelect,
  body: true
} as const;

const adminReviewSelect = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  body: true,
  rating: true,
  authorName: true,
  createdByAdmin: true,
  isApproved: true,
  instagramPostId: true,
  instagramHashtags: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
  gameId: true,
  userId: true,
  game: {
    select: {
      id: true,
      title: true,
      name: true,
      slug: true,
      coverImageUrl: true,
      imageUrl: true,
      ratings: true
    }
  },
  user: {
    select: {
      profile: {
        select: {
          username: true
        }
      }
    }
  }
} as const;

export type PublicReviewRecord = Awaited<ReturnType<typeof getPublishedReviewBySlug>>;
export type AdminReviewRecord = NonNullable<
  Awaited<ReturnType<typeof getAdminReviewById>>
>;

export async function getPublishedReviews() {
  return getCachedPublishedReviews();
}

export async function getPublishedReviewBySlug(slug: string) {
  return getCachedPublishedReviewBySlug(slug);
}

const getCachedPublishedReviews = unstable_cache(
  async function getCachedPublishedReviews() {
    const reviews = await prisma.review.findMany({
      where: { isApproved: true },
      select: publicReviewListSelect,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }]
    });

    return reviews.map(withSafePublicAuthorName);
  },
  ["published-reviews"],
  { revalidate: 3600, tags: [PUBLIC_REVIEWS_TAG] }
);

const getCachedPublishedReviewBySlug = (slug: string) => unstable_cache(
  async () => {
    const review = await prisma.review.findFirst({
      where: { slug, isApproved: true },
      select: publicReviewSelect
    });

    return review ? withSafePublicAuthorName(review) : null;
  },
  ["published-review-by-slug", slug],
  { revalidate: 3600, tags: [PUBLIC_REVIEWS_TAG] }
)();

const { body: omittedBody, summary: omittedSummary, ...adminReviewListSelect } = adminReviewSelect;
void omittedBody;
void omittedSummary;

export async function getAdminReviews() {
  return prisma.review.findMany({
    select: adminReviewListSelect as Omit<typeof adminReviewSelect, "body" | "summary">,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 500
  });
}

export async function getAdminReviewById(id: string) {
  return prisma.review.findUnique({
    where: { id },
    select: adminReviewSelect
  });
}

export async function createReview(input: ReviewPayload) {
  const title = input.title.trim();
  const summary = input.summary.trim();
  const body = input.body.trim();
  const rating = await resolveStoredReviewRating(input.gameId, input.rating);
  validateReviewContent({ title, summary, body });
  const slug = await ensureUniqueReviewSlug(slugify(title) || slugify(`resena-${input.gameId}`));

  return prisma.review.create({
    data: {
      gameId: input.gameId,
      userId: input.userId || null,
      authorName: input.authorName.trim(),
      title,
      slug,
      summary,
      body,
      rating,
      isApproved: input.isApproved ?? false,
      instagramHashtags: normalizeOptionalText(input.instagramHashtags),
      createdByAdmin: input.createdByAdmin ?? false,
      publishedAt: new Date()
    },
    select: {
      id: true,
      slug: true,
      game: {
        select: {
          slug: true
        }
      }
    }
  });
}

export async function updateReview(
  id: string,
  input: {
    gameId?: string;
    authorName: string;
    title: string;
    summary: string;
    body: string;
    rating?: number | null;
    isApproved?: boolean;
    instagramPostId?: string | null;
    instagramHashtags?: string | null;
    publishedAt?: Date | null;
  }
) {
  const current = await prisma.review.findUnique({
    where: { id },
    select: { id: true, slug: true, title: true, gameId: true, rating: true }
  });

  if (!current) {
    throw new Error("No existe esa reseña.");
  }

  const nextTitle = input.title.trim();
  const summary = input.summary.trim();
  const body = input.body.trim();
  const nextGameId = input.gameId ?? current.gameId;
  const rating = await resolveStoredReviewRating(nextGameId, input.rating, current.rating);
  validateReviewContent({ title: nextTitle, summary, body });
  const nextSlug =
    current.title.trim() === nextTitle
      ? current.slug
      : await ensureUniqueReviewSlug(slugify(nextTitle) || current.slug, current.id);

  return prisma.review.update({
    where: { id },
    data: {
      gameId: input.gameId,
      authorName: input.authorName.trim(),
      title: nextTitle,
      slug: nextSlug,
      summary,
      body,
      rating,
      isApproved: input.isApproved,
      instagramPostId: input.instagramPostId,
      instagramHashtags: normalizeOptionalText(input.instagramHashtags),
      publishedAt: input.publishedAt ?? currentDate()
    },
    select: {
      id: true,
      slug: true,
      game: {
        select: {
          slug: true
        }
      }
    }
  });
}

export async function updateReviewInstagramPostId(id: string, postId: string) {
  return prisma.review.update({
    where: { id },
    data: { instagramPostId: postId }
  });
}

export async function deleteReview(id: string) {
  return prisma.review.delete({
    where: { id },
    select: {
      id: true,
      slug: true,
      game: {
        select: {
          slug: true
        }
      }
    }
  });
}

function currentDate() {
  return new Date();
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function withSafePublicAuthorName<T extends { authorName: string }>(review: T): T {
  return {
    ...review,
    authorName: getSafePublicDisplayName(review.authorName)
  };
}

async function ensureUniqueReviewSlug(baseSlug: string, ignoreId?: string) {
  const cleanBase = baseSlug || "resena";
  let slug = cleanBase;
  let counter = 2;

  while (true) {
    const existing = await prisma.review.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (!existing || existing.id === ignoreId) {
      return slug;
    }

    slug = `${cleanBase}-${counter}`;
    counter += 1;
  }
}

async function resolveStoredReviewRating(
  gameId: string,
  preferredRating?: number | null,
  fallbackRating?: number | null
) {
  if (preferredRating !== undefined && preferredRating !== null) {
    return normalizeReviewRatingValue(preferredRating);
  }

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { ratings: true }
  });

  if (!game) {
    throw new Error("Ese juego no existe.");
  }

  return getEffectiveReviewRating(game.ratings, fallbackRating);
}
