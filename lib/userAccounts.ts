import type { User as SupabaseUser } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

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

  return user.email?.split("@")[0]?.trim() || null;
}

export async function upsertAppUserFromAuthUser(user: Pick<SupabaseUser, "id" | "email" | "user_metadata">) {
  if (!user.email) {
    throw new Error("La cuenta autenticada no tiene email.");
  }

  const displayName = getSupabaseDisplayName(user);

  const appUser = await prisma.user.upsert({
    where: { authUserId: user.id },
    include: { profile: true },
    update: {
      email: user.email,
      displayName
    },
    create: {
      authUserId: user.id,
      email: user.email,
      displayName
    }
  });

  if (!appUser.profile) {
    const baseUsername = user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    const username = await ensureUniqueUsername(baseUsername);

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
  let username = base || "usuario";
  let counter = 1;
  while (true) {
    const existing = await prisma.userProfile.findUnique({ where: { username } });
    if (!existing) return username;
    username = `${base}${counter++}`;
  }
}

export async function getAppUserByAuthUserId(authUserId: string) {
  return prisma.user.findUnique({
    where: { authUserId }
  });
}
