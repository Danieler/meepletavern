import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export type ReviewPayload = {
  gameId: string;
  userId?: string | null;
  authorName: string;
  title: string;
  summary: string;
  body: string;
  createdByAdmin?: boolean;
};

const publicReviewSelect = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  body: true,
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
      imageStatus: true
    }
  }
} as const;

const adminReviewSelect = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  body: true,
  authorName: true,
  createdByAdmin: true,
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
      slug: true
    }
  }
} as const;

export type PublicReviewRecord = Awaited<ReturnType<typeof getPublishedReviewBySlug>>;
export type AdminReviewRecord = NonNullable<
  Awaited<ReturnType<typeof getAdminReviewById>>
>;

export async function getPublishedReviews() {
  return prisma.review.findMany({
    select: publicReviewSelect,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }]
  });
}

export async function getPublishedReviewBySlug(slug: string) {
  return prisma.review.findUnique({
    where: { slug },
    select: publicReviewSelect
  });
}

export async function getAdminReviews() {
  return prisma.review.findMany({
    select: adminReviewSelect,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }]
  });
}

export async function getAdminReviewById(id: string) {
  return prisma.review.findUnique({
    where: { id },
    select: adminReviewSelect
  });
}

export async function createReview(input: ReviewPayload) {
  const slug = await ensureUniqueReviewSlug(slugify(input.title) || slugify(`resena-${input.gameId}`));

  return prisma.review.create({
    data: {
      gameId: input.gameId,
      userId: input.userId || null,
      authorName: input.authorName.trim(),
      title: input.title.trim(),
      slug,
      summary: input.summary.trim(),
      body: input.body.trim(),
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
    publishedAt?: Date | null;
  }
) {
  const current = await prisma.review.findUnique({
    where: { id },
    select: { id: true, slug: true, title: true }
  });

  if (!current) {
    throw new Error("No existe esa reseña.");
  }

  const nextTitle = input.title.trim();
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
      summary: input.summary.trim(),
      body: input.body.trim(),
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
