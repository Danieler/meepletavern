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

  return prisma.user.upsert({
    where: { authUserId: user.id },
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
}
