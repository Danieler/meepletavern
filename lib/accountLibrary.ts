import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { upsertAppUserFromAuthUser } from "@/lib/userAccounts";

export async function requireCurrentAppUser() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("No autenticado.");
  }

  return upsertAppUserFromAuthUser(user);
}

export async function getCurrentUserLibraryGameIds() {
  const appUser = await requireCurrentAppUser();
  const entries = await prisma.userLibraryGame.findMany({
    where: { userId: appUser.id },
    select: { gameId: true }
  });

  return new Set(entries.map((entry) => entry.gameId));
}
