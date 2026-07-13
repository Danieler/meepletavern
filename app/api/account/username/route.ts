import { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { TAVERN_ACTIVITY_CACHE_TAG, trySyncActivityActorProfile } from "@/lib/activity/events";
import { prisma } from "@/lib/prisma";
import {
  getUsernameValidationError,
  isSystemGeneratedUsername,
  normalizeUsername
} from "@/lib/usernames";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow" };

export async function GET() {
  try {
    const account = await requireCurrentAppUser();
    return NextResponse.json(
      { required: isSystemGeneratedUsername(account.profile?.username) },
      { headers: privateHeaders }
    );
  } catch {
    return NextResponse.json({ error: "No autenticado." }, { status: 401, headers: privateHeaders });
  }
}

export async function PATCH(request: Request) {
  let account: Awaited<ReturnType<typeof requireCurrentAppUser>>;
  try {
    account = await requireCurrentAppUser();
  } catch {
    return NextResponse.json({ error: "No autenticado." }, { status: 401, headers: privateHeaders });
  }

  try {
    const body = (await request.json().catch(() => null)) as { username?: unknown } | null;
    const username = normalizeUsername(body?.username);
    const validationError = getUsernameValidationError(username);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400, headers: privateHeaders });
    }

    const updatedAccount = await prisma.user.update({
      where: { id: account.id },
      include: { profile: true },
      data: { profile: { update: { username } } }
    });
    const activityChanged = await trySyncActivityActorProfile(updatedAccount);
    if (activityChanged) revalidateTag(TAVERN_ACTIVITY_CACHE_TAG);

    return NextResponse.json({ username }, { headers: privateHeaders });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Ese nombre de usuario ya está en uso." },
        { status: 409, headers: privateHeaders }
      );
    }
    return NextResponse.json(
      { error: "No se pudo guardar el nombre de usuario." },
      { status: 500, headers: privateHeaders }
    );
  }
}
