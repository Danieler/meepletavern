import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ProfileVisibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { upsertAppUserFromAuthUser } from "@/lib/userAccounts";
import { revalidateTag } from "next/cache";
import { TAVERN_ACTIVITY_CACHE_TAG, trySyncActivityActorProfile } from "@/lib/activity/events";
import { getUsernameValidationError, normalizeUsername } from "@/lib/usernames";

function parseProfileVisibility(value: unknown) {
  return value === ProfileVisibility.PUBLIC || value === ProfileVisibility.PRIVATE ? value : undefined;
}

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const account = await upsertAppUserFromAuthUser(user);
  return NextResponse.json({ account });
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const appUser = await upsertAppUserFromAuthUser(user);

  const body = (await request.json().catch(() => null)) as {
    displayName?: unknown;
    username?: unknown;
    bio?: unknown;
    avatarUrl?: unknown;
    profileVisibility?: unknown;
    collectionVisibility?: unknown;
  } | null;

  const displayName = typeof body?.displayName === "string" ? body.displayName.trim().replace(/\s+/g, " ") : undefined;
  const username = typeof body?.username === "string" ? normalizeUsername(body.username) : undefined;
  const bio = typeof body?.bio === "string" ? body.bio.trim() : undefined;
  const avatarUrl = typeof body?.avatarUrl === "string" ? body.avatarUrl.trim() : undefined;
  const profileVisibility = parseProfileVisibility(body?.profileVisibility);
  const collectionVisibility = parseProfileVisibility(body?.collectionVisibility);

  if (displayName !== undefined && displayName.length < 2) {
    return NextResponse.json({ error: "El nombre debe tener al menos 2 caracteres." }, { status: 400 });
  }

  if (username !== undefined) {
    const validationError = getUsernameValidationError(username);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const existing = await prisma.userProfile.findFirst({
      where: {
        username,
        userId: { not: appUser.id }
      }
    });

    if (existing) {
      return NextResponse.json({ error: "Este nombre de usuario ya está en uso." }, { status: 400 });
    }
  }

  if (avatarUrl && !/^https?:\/\/\S+$/i.test(avatarUrl)) {
    return NextResponse.json({ error: "El avatar debe ser una URL válida de imagen subida." }, { status: 400 });
  }

  // Update Supabase metadata if name changed
  if (displayName !== undefined && displayName !== appUser.displayName) {
    await supabase.auth.updateUser({
      data: {
        name: displayName,
        display_name: displayName
      }
    });
  }

  const updatedAccount = await prisma.user.update({
    where: { id: appUser.id },
    include: { profile: true },
    data: {
      displayName: displayName ?? undefined,
      profile: {
        update: {
          username: username ?? undefined,
          displayName: displayName ?? undefined,
          bio: bio ?? undefined,
          avatarUrl: avatarUrl !== undefined ? avatarUrl || null : undefined,
          profileVisibility: profileVisibility ?? undefined,
          collectionVisibility: collectionVisibility ?? undefined
        }
      }
    }
  });
  const activityChanged = await trySyncActivityActorProfile(updatedAccount);
  if (activityChanged) revalidateTag(TAVERN_ACTIVITY_CACHE_TAG);

  return NextResponse.json({ account: updatedAccount });
}
