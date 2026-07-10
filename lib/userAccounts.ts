import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Prisma } from "@prisma/client";
import { LEGAL_VERSION } from "@/lib/legalConstants";
import { prisma } from "@/lib/prisma";

const DEFAULT_USERNAME_BASE = "meeple";

function normalizeDisplayName(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function getSupabaseDisplayName(user: Pick<SupabaseUser, "email" | "user_metadata">) {
  const displayName =
    normalizeDisplayName(user.user_metadata?.display_name) ||
    normalizeDisplayName(user.user_metadata?.name);

  if (displayName) {
    return displayName;
  }

  return null;
}

function getGeneratedUsernameBase(authUserId: string) {
  const suffix = authUserId.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  return suffix ? `${DEFAULT_USERNAME_BASE}-${suffix}` : DEFAULT_USERNAME_BASE;
}

function getLegalAcceptanceFromMetadata(metadata: SupabaseUser["user_metadata"]) {
  const termsAcceptedAt = typeof metadata?.terms_accepted_at === "string"
    ? new Date(metadata.terms_accepted_at)
    : null;
  const privacyAcceptedAt = typeof metadata?.privacy_accepted_at === "string"
    ? new Date(metadata.privacy_accepted_at)
    : termsAcceptedAt;

  if (!termsAcceptedAt || Number.isNaN(termsAcceptedAt.getTime())) {
    return {};
  }

  return {
    termsAcceptedAt,
    termsVersion: typeof metadata?.terms_version === "string" ? metadata.terms_version : LEGAL_VERSION,
    privacyAcceptedAt: privacyAcceptedAt && !Number.isNaN(privacyAcceptedAt.getTime()) ? privacyAcceptedAt : termsAcceptedAt,
    privacyVersion: typeof metadata?.privacy_version === "string" ? metadata.privacy_version : LEGAL_VERSION
  } satisfies Prisma.UserUpdateInput;
}

export async function upsertAppUserFromAuthUser(user: Pick<SupabaseUser, "id" | "email" | "user_metadata">) {
  if (!user.email) {
    throw new Error("La cuenta autenticada no tiene email.");
  }

  const displayName = getSupabaseDisplayName(user);
  const legalAcceptance = getLegalAcceptanceFromMetadata(user.user_metadata);

  const appUser = await prisma.user.upsert({
    where: { authUserId: user.id },
    include: { profile: true },
    update: {
      email: user.email,
      displayName,
      ...legalAcceptance
    },
    create: {
      authUserId: user.id,
      email: user.email,
      displayName,
      ...legalAcceptance
    }
  });

  if (!appUser.profile) {
    const username = await ensureUniqueUsername(getGeneratedUsernameBase(user.id));

    await prisma.userProfile.create({
      data: {
        userId: appUser.id,
        username,
        displayName: appUser.displayName
      }
    });

    return (await prisma.user.findUnique({
      where: { id: appUser.id },
      include: { profile: true }
    }))!;
  }

  return appUser;
}

async function ensureUniqueUsername(base: string) {
  const safeBase = base || DEFAULT_USERNAME_BASE;
  let username = safeBase;
  let counter = 1;
  while (true) {
    const existing = await prisma.userProfile.findUnique({ where: { username } });
    if (!existing) return username;
    username = `${safeBase}-${counter++}`;
  }
}

export async function getAppUserByAuthUserId(authUserId: string) {
  return prisma.user.findUnique({
    where: { authUserId }
  });
}
